import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CartService } from '../cart/cart.service.js';
import { decimalToNumber } from '../common/serialization/decimal-to-number.js';
import { toBigIntId } from '../common/serialization/to-bigint-id.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';

/**
 * Shipping policy, in Tanzanian shillings because that is the currency the
 * storefront quotes. These must stay in step with SHIPPING_THRESHOLD and
 * FLAT_SHIPPING in apps/web/src/lib/cart-context.tsx, which shows the same
 * figures before checkout — if they drift, the customer is quoted one total
 * and charged another.
 */
const FREE_SHIPPING_THRESHOLD = 400_000;
const STANDARD_SHIPPING_FEE = 35_000;
/** Not persisted as its own column (schema has no tax field on Order) — see README. */
const TAX_RATE = 0.08;

const ORDER_INCLUDE = {
  items: { include: { product: true } },
  address: true,
  payments: true,
} satisfies Prisma.OrderInclude;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
  ) {}

  async checkout(userId: bigint, dto: CreateOrderDto) {
    const cart = await this.cartService.getOrCreateCart(userId);

    if (cart.items.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }

    // Re-check stock at checkout time — it may have changed since items were added.
// Out of transaction
    for (const item of cart.items) {
      const inventory = item.product.inventory;
      const available = inventory ? inventory.quantity - inventory.reserved : 0;
      if (item.quantity > available) {
        throw new BadRequestException(
          `Only ${Math.max(available, 0)} unit(s) of "${item.product.name}" available`,
        );
      }
    }

    const subtotal = cart.items.reduce(
      (sum, item) => sum + decimalToNumber(item.unitPrice) * item.quantity,
      0,
    );
    const shippingFee = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    // `total` folds tax in since Order has no dedicated tax column yet.
    const total = subtotal + shippingFee + tax;
    const orderNumber = this.generateOrderNumber();

  

    const order = await this.prisma.$transaction(async (tx) => {
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

      const createdOrder = await tx.order.create({
        data: {
          userId,
          addressId: address.id,
          orderNumber,
          status: 'CONFIRMED',
          subtotal,
          shippingFee,
          total,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: decimalToNumber(item.unitPrice) * item.quantity,
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
        include: ORDER_INCLUDE,
      });

      // N + 1: problem
      for (const item of cart.items) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return createdOrder;
    });

    return this.toDetail(order, tax);
  }

  async findMany(userId: bigint) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.toSummary(order));
  }

  async findOne(userId: bigint, idRaw: string) {
    const id = toBigIntId(idRaw, 'orderId');
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('This order does not belong to you');
    }

    // Tax isn't persisted, so recompute it for display from the stored subtotal.
    const tax = Math.round(decimalToNumber(order.subtotal) * TAX_RATE * 100) / 100;
    return this.toDetail(order, tax);
  }

  private generateOrderNumber(): string {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `NB-${Date.now().toString(36).toUpperCase()}-${random}`;
  }

  private toSummary(order: OrderRow) {
    return {
      id: order.id.toString(),
      orderNumber: order.orderNumber,
      status: order.status,
      total: decimalToNumber(order.total),
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      createdAt: order.createdAt,
    };
  }

  private toDetail(order: OrderRow, tax: number) {
    return {
      id: order.id.toString(),
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal: decimalToNumber(order.subtotal),
      shippingFee: decimalToNumber(order.shippingFee),
      tax,
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
      payment: order.payments[0] // are you sure always will be the first item?
        ? {
            method: order.payments[0].method,
            status: order.payments[0].status,
          }
        : null,
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
