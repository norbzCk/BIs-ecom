import { randomInt } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { decimalToNumber } from '../common/serialization/decimal-to-number.js';
import { toBigIntId } from '../common/serialization/to-bigint-id.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';

// Money constants are Decimals so we never do float arithmetic on currency.
const FREE_SHIPPING_THRESHOLD = new Prisma.Decimal(400_000);
const STANDARD_SHIPPING_FEE = new Prisma.Decimal(35_000);
/** Not persisted as its own column (schema has no tax field on Order) — see README. */
const TAX_RATE = new Prisma.Decimal('0.08');

const CART_INCLUDE = {
  items: { include: { product: true } },
} satisfies Prisma.CartInclude;

// Detail view: only the latest payment is loaded, in a deterministic order.
const ORDER_DETAIL_INCLUDE = {
  items: { include: { product: true } },
  address: true,
  payments: { orderBy: { id: 'desc' }, take: 1 },
} satisfies Prisma.OrderInclude;

// List view: only what toSummary() actually uses.
const ORDER_SUMMARY_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  total: true,
  createdAt: true,
  items: { select: { quantity: true } },
} satisfies Prisma.OrderSelect;

type OrderDetailRow = Prisma.OrderGetPayload<{ include: typeof ORDER_DETAIL_INCLUDE }>;
type OrderSummaryRow = Prisma.OrderGetPayload<{ select: typeof ORDER_SUMMARY_SELECT }>;
type CartItemRow = Prisma.CartGetPayload<{ include: typeof CART_INCLUDE }>['items'][number];

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async checkout(userId: bigint, dto: CreateOrderDto) {
    // Everything (cart read, stock check, order creation) happens in ONE transaction,
    // so nothing can change between "check" and "write".
    const order = await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findFirst({ where: { userId }, include: CART_INCLUDE });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Your cart is empty');
      }

      // Claim the cart first. If a concurrent checkout (double click, two tabs)
      // already emptied it, the count won't match and we abort instead of
      // creating a duplicate order.
      const claimed = await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      if (claimed.count !== cart.items.length) {
        throw new ConflictException('Your cart changed during checkout. Please try again.');
      }

      // Atomic stock check + decrement. Throws (and rolls everything back) if short.
      await this.decrementStock(tx, cart.items);

      const subtotal = cart.items.reduce(
        (sum, item) => sum.plus(item.unitPrice.mul(item.quantity)),
        new Prisma.Decimal(0),
      );
      const shippingFee = subtotal.gt(FREE_SHIPPING_THRESHOLD)
        ? new Prisma.Decimal(0)
        : STANDARD_SHIPPING_FEE;
      const tax = subtotal.mul(TAX_RATE).toDecimalPlaces(2);
      // `total` folds tax in since Order has no dedicated tax column yet.
      const total = subtotal.plus(shippingFee).plus(tax);

      const address = await tx.address.create({
        data: {
          userId,
          fullName: dto.fullName,
          phone: dto.phone,
          street: dto.street,
          city: dto.city,
          region: dto.region,
          country: dto.country,
          postalCode: dto.postalCode,
        },
      });

      return tx.order.create({
        data: {
          userId,
          addressId: address.id,
          orderNumber: this.generateOrderNumber(),
          // NOTE: consider a PENDING / AWAITING_PAYMENT status here; the order is
          // only really "confirmed" once the payment succeeds.
          status: 'CONFIRMED',
          subtotal,
          shippingFee,
          total,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.unitPrice.mul(item.quantity),
            })),
          },
          payments: {
            create: {
              amount: total,
              method: dto.paymentMethod,
              status: 'PENDING',
            },
          },
        },
        include: ORDER_DETAIL_INCLUDE,
      });
    });

    return this.toDetail(order);
  }

  async findMany(userId: bigint) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      select: ORDER_SUMMARY_SELECT,
      orderBy: { createdAt: 'desc' },
      // TODO: add pagination (take/skip or cursor) — this is unbounded today.
    });

    return orders.map((order) => this.toSummary(order));
  }

  async findOne(userId: bigint, idRaw: string) {
    const id = toBigIntId(idRaw, 'orderId');

    // Filter by owner in the query: someone else's order and a missing order
    // look identical, so order IDs can't be probed (403 would confirm they exist).
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: ORDER_DETAIL_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.toDetail(order);
  }

  /**
   * Decrements stock for every cart line in ONE statement.
   * The WHERE clause re-checks availability at write time, so two concurrent
   * checkouts can never both take the last unit (no overselling), and there's
   * no per-item round trip (no N+1).
   *
   * The identifiers below are the mapped names from prisma/schema.prisma, not
   * the Prisma model fields: the table is `inventory` (@@map) and the foreign
   * key is `product_id` (@@map), so `"Inventory"` / `"productId"` would not
   * resolve. `quantity` and `reserved` are unmapped and keep their names.
   */
  private async decrementStock(tx: Prisma.TransactionClient, items: CartItemRow[]) {
    // Merge duplicate product lines so each product is updated exactly once.
    const wanted = new Map<string, number>();
    for (const item of items) {
      const key = item.productId.toString();
      wanted.set(key, (wanted.get(key) ?? 0) + item.quantity);
    }
    const productIds = [...wanted.keys()];
    const quantities = productIds.map((id) => wanted.get(id)!);

    // A literal VALUES list rather than two unnest() calls in one target list:
    // the latter pairs the arrays in lockstep and silently pads the shorter one
    // with NULLs, which would read as "unknown quantity" instead of erroring.
    const lines = productIds.map(
      (id, i) => Prisma.sql`(${id}::bigint, ${quantities[i]}::int)`,
    );

    const updated = await tx.$queryRaw<{ productId: bigint }[]>(Prisma.sql`
      UPDATE "inventory" AS i
      SET "quantity" = i."quantity" - v."qty"
      FROM (VALUES ${Prisma.join(lines)}) AS v("product_id", "qty")
      WHERE i."product_id" = v."product_id"
        AND i."quantity" - i."reserved" >= v."qty"
      RETURNING i."product_id" AS "productId"
    `);

    if (updated.length === productIds.length) return;

    // At least one line was short: work out which, for a useful error message.
    const ok = new Set(updated.map((row) => row.productId.toString()));
    const failed = items.find((item) => !ok.has(item.productId.toString()))!;
    const inventory = await tx.inventory.findUnique({
      where: { productId: failed.productId },
    });
    const available = inventory ? Math.max(inventory.quantity - inventory.reserved, 0) : 0;

    // Throwing inside $transaction rolls back the cart deletion and stock updates.
    throw new BadRequestException(
      `Only ${available} unit(s) of "${failed.product.name}" available`,
    );
  }

  private generateOrderNumber(): string {
    // CSPRNG instead of Math.random. Keep a unique constraint on orderNumber;
    // for extra safety, retry on Prisma error P2002.
    return `NB-${Date.now().toString(36).toUpperCase()}-${randomInt(1000, 10000)}`;
  }

  private toSummary(order: OrderSummaryRow) {
    return {
      id: order.id.toString(),
      orderNumber: order.orderNumber,
      status: order.status,
      total: decimalToNumber(order.total),
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      createdAt: order.createdAt,
    };
  }

  private toDetail(order: OrderDetailRow) {
    // Derive tax from what was actually stored, instead of recomputing it with
    // today's TAX_RATE. Old orders stay correct even if the rate changes.
    const tax = order.total.minus(order.subtotal).minus(order.shippingFee);

    // Query is ordered (newest first) and limited to 1, so this IS the latest payment.
    const payment = order.payments[0] ?? null;

    return {
      id: order.id.toString(),
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal: decimalToNumber(order.subtotal),
      shippingFee: decimalToNumber(order.shippingFee),
      tax: decimalToNumber(tax),
      total: decimalToNumber(order.total),
      createdAt: order.createdAt,
      shippingAddress: {
        fullName: order.address.fullName,
        phone: order.address.phone,
        street: order.address.street,
        city: order.address.city,
        region: order.address.region,
        country: order.address.country,
        postalCode: order.address.postalCode,
      },
      payment: payment ? { method: payment.method, status: payment.status } : null,
          items: order.items.map((item) => ({
            productId: item.productId.toString(),
            name: item.product.name,
            quantity: item.quantity,
            unitPrice: decimalToNumber(item.unitPrice),
            subtotal: decimalToNumber(item.subtotal),
          })),
        };
      }
    }
