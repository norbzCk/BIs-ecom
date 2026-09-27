import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CartService } from './cart.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

function decimal(value: number) {
  return { toNumber: () => value };
}

function buildCartItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    productId: 1n,
    quantity: 1,
    unitPrice: decimal(1699),
    product: {
      name: 'Billionare Apex-15 Pro',
      slug: 'billionare-apex-15-pro',
      images: [{ imageUrl: 'https://example.com/1.jpg' }],
    },
    ...overrides,
  };
}

function buildCart(items: ReturnType<typeof buildCartItem>[] = []) {
  return { id: 10n, userId: 1n, items };
}

describe('CartService', () => {
  let service: CartService;
  let prisma: {
    cart: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    cartItem: {
      upsert: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
    product: { findUnique: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    prisma = {
      cart: { findUnique: vi.fn(), create: vi.fn() },
      cartItem: { upsert: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
      product: { findUnique: vi.fn() },
    };

    service = new CartService(prisma as unknown as PrismaService);
  });

  describe('getCart', () => {
    it('creates an empty cart the first time and returns a zeroed summary', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);
      prisma.cart.create.mockResolvedValue(buildCart());

      const result = await service.getCart(1n);

      expect(prisma.cart.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { userId: 1n } }),
      );
      expect(result).toEqual({ id: '10', items: [], subtotal: 0, itemCount: 0 });
    });

    it('computes subtotal and line totals from existing items', async () => {
      prisma.cart.findUnique.mockResolvedValue(
        buildCart([buildCartItem({ quantity: 2 })]),
      );

      const result = await service.getCart(1n);

      expect(result.subtotal).toBe(3398);
      expect(result.itemCount).toBe(2);
      expect(result.items[0]).toEqual({
        productId: '1',
        name: 'Billionare Apex-15 Pro',
        slug: 'billionare-apex-15-pro',
        image: { url: 'https://example.com/1.jpg', alt: 'Billionare Apex-15 Pro' },
        unitPrice: 1699,
        quantity: 2,
        lineTotal: 3398,
      });
    });
  });

  describe('addItem', () => {
    it('rejects a product that is not found or inactive', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.addItem(1n, '1', 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.cartItem.upsert).not.toHaveBeenCalled();
    });

    it('rejects adding more than the available stock', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 1n,
        name: 'Billionare Apex-15 Pro',
        status: 'ACTIVE',
        price: decimal(1699),
        inventory: { quantity: 3, reserved: 1 }, // 2 available
      });
      prisma.cart.findUnique.mockResolvedValue(buildCart());

      await expect(service.addItem(1n, '1', 5)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.cartItem.upsert).not.toHaveBeenCalled();
    });

    it('upserts the cart item with the current product price', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 1n,
        name: 'Billionare Apex-15 Pro',
        status: 'ACTIVE',
        price: decimal(1699),
        inventory: { quantity: 10, reserved: 0 },
      });
      prisma.cart.findUnique.mockResolvedValue(buildCart());
      prisma.cartItem.upsert.mockResolvedValue(buildCartItem());

      await service.addItem(1n, '1', 1);

      expect(prisma.cartItem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cartId_productId: { cartId: 10n, productId: 1n } },
          create: expect.objectContaining({
            cartId: 10n,
            productId: 1n,
            quantity: 1,
            unitPrice: expect.anything(),
          }),
        }),
      );
    });
  });

  describe('updateItem', () => {
    it('throws NotFoundException when the product is not already in the cart', async () => {
      prisma.cart.findUnique.mockResolvedValue(buildCart());

      await expect(service.updateItem(1n, '1', 3)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.cartItem.update).not.toHaveBeenCalled();
    });

    it('updates the quantity for an existing item', async () => {
      prisma.cart.findUnique.mockResolvedValue(buildCart([buildCartItem()]));

      await service.updateItem(1n, '1', 3);

      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { cartId_productId: { cartId: 10n, productId: 1n } },
        data: { quantity: 3 },
      });
    });
  });

  describe('removeItem', () => {
    it('deletes the matching cart item', async () => {
      prisma.cart.findUnique.mockResolvedValue(buildCart([buildCartItem()]));

      await service.removeItem(1n, '1');

      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 10n, productId: 1n },
      });
    });
  });

  describe('clear', () => {
    it('deletes every item in the cart', async () => {
      prisma.cart.findUnique.mockResolvedValue(buildCart([buildCartItem()]));

      await service.clear(1n);

      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 10n },
      });
    });
  });
});
