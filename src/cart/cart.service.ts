import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { decimalToNumber } from '../common/serialization/decimal-to-number.js';
import { toBigIntId } from '../common/serialization/to-bigint-id.js';

const CART_INCLUDE = {
  items: {
    include: {
      product: {
        include: { images: { orderBy: { isPrimary: 'desc' as const }, take: 1 } },
      },
    },
  },
} satisfies Prisma.CartInclude;

type CartRow = Prisma.CartGetPayload<{ include: typeof CART_INCLUDE }>;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: bigint) {
    const cart = await this.getOrCreateCart(userId);
    return this.toResponse(cart);
  }

  async addItem(userId: bigint, productIdRaw: string, quantity: number) {
    const productId = toBigIntId(productIdRaw, 'productId');

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { inventory: true },
    });

    if (!product || product.status !== 'ACTIVE') {
      throw new NotFoundException('Product not found');
    }

    const cart = await this.getOrCreateCart(userId);
    const existing = cart.items.find((item) => item.productId === productId);
    const requestedTotal = (existing?.quantity ?? 0) + quantity;
    const available = product.inventory
      ? product.inventory.quantity - product.inventory.reserved
      : 0;

    if (requestedTotal > available) {
      throw new BadRequestException(
        `Only ${Math.max(available, 0)} unit(s) of "${product.name}" available`,
      );
    }

    await this.prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      create: {
        cartId: cart.id,
        productId,
        quantity,
        unitPrice: product.price,
      },
      update: {
        quantity: requestedTotal,
      },
    });

    return this.getCart(userId);
  }

  async updateItem(userId: bigint, productIdRaw: string, quantity: number) {
    const productId = toBigIntId(productIdRaw, 'productId');
    const cart = await this.getOrCreateCart(userId);
    const existing = cart.items.find((item) => item.productId === productId);

    if (!existing) {
      throw new NotFoundException('This product is not in your cart');
    }

    await this.prisma.cartItem.update({
      where: { cartId_productId: { cartId: cart.id, productId } },
      data: { quantity },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: bigint, productIdRaw: string) {
    const productId = toBigIntId(productIdRaw, 'productId');
    const cart = await this.getOrCreateCart(userId);

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id, productId },
    });

    return this.getCart(userId);
  }

  async clear(userId: bigint) {
    const cart = await this.getOrCreateCart(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.getCart(userId);
  }

  /** Used internally by the orders flow within a transaction. */
  async getOrCreateCart(userId: bigint): Promise<CartRow> {
    const existing = await this.prisma.cart.findUnique({
      where: { userId },
      include: CART_INCLUDE,
    });

    if (existing) return existing;

    return this.prisma.cart.create({
      data: { userId },
      include: CART_INCLUDE,
    });
  }

  private toResponse(cart: CartRow) {
    const items = cart.items.map((item) => {
      const unitPrice = decimalToNumber(item.unitPrice);
      return {
        productId: item.productId.toString(),
        name: item.product.name,
        slug: item.product.slug,
        image: item.product.images[0]
          ? { url: item.product.images[0].imageUrl, alt: item.product.name }
          : null,
        unitPrice,
        quantity: item.quantity,
        lineTotal: unitPrice * item.quantity,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      id: cart.id.toString(),
      items,
      subtotal,
      itemCount,
    };
  }
}
