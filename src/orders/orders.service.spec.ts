import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CartService } from '../cart/cart.service.js';

function decimal(value: number) {
  return { toNumber: () => value };
}

function buildCartItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    productId: 1n,
    quantity: 1,
    unitPrice: decimal(1699),
    product: {
      id: 1n,
      name: 'Billionare Apex-15 Pro',
      inventory: { quantity: 10, reserved: 0 },
    },
    ...overrides,
  };
}

function buildOrderRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 5n,
    userId: 1n,
    orderNumber: 'NB-TEST-0001',
    status: 'CONFIRMED',
    subtotal: decimal(1699),
    shippingFee: decimal(0),
    total: decimal(1834.92),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    address: {
      fullName: 'Sarah Mitchell',
      phone: '+1 555 902 8412',
      street: '1044 Tech Park Pkwy',
      city: 'Austin',
      region: 'TX',
      country: 'USA',
      postalCode: '78701',
    },
    payments: [{ method: 'CARD', status: 'PENDING' }],
    items: [
      {
        productId: 1n,
        product: { name: 'Billionare Apex-15 Pro' },
        quantity: 1,
        unitPrice: decimal(1699),
        subtotal: decimal(1699),
      },
    ],
    ...overrides,
  };
}

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: {
    $transaction: ReturnType<typeof vi.fn>;
    order: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    };
  };
  let cartService: { getOrCreateCart: ReturnType<typeof vi.fn> };
  let tx: {
    address: { create: ReturnType<typeof vi.fn> };
    order: { create: ReturnType<typeof vi.fn> };
    inventory: { update: ReturnType<typeof vi.fn> };
    cartItem: { deleteMany: ReturnType<typeof vi.fn> };
  };

  const checkoutDto = {
    fullName: 'Sarah Mitchell',
    phone: '+1 555 902 8412',
    street: '1044 Tech Park Pkwy',
    city: 'Austin',
    region: 'TX',
    country: 'USA',
    postalCode: '78701',
    paymentMethod: 'CARD' as const,
  };

  beforeEach(() => {
    tx = {
      address: { create: vi.fn().mockResolvedValue({ id: 99n }) },
      order: { create: vi.fn().mockResolvedValue(buildOrderRow()) },
      inventory: { update: vi.fn().mockResolvedValue({}) },
      cartItem: { deleteMany: vi.fn().mockResolvedValue({}) },
    };

    prisma = {
      $transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback(tx)),
      order: { findMany: vi.fn(), findUnique: vi.fn() },
    };

    cartService = {
      getOrCreateCart: vi.fn().mockResolvedValue({
        id: 10n,
        items: [buildCartItem()],
      }),
    };

    service = new OrdersService(
      prisma as unknown as PrismaService,
      cartService as unknown as CartService,
    );
  });

  describe('checkout', () => {
    it('rejects checkout with an empty cart', async () => {
      cartService.getOrCreateCart.mockResolvedValue({ id: 10n, items: [] });

      await expect(service.checkout(1n, checkoutDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects checkout when stock is no longer sufficient', async () => {
      cartService.getOrCreateCart.mockResolvedValue({
        id: 10n,
        items: [
          buildCartItem({
            quantity: 5,
            product: {
              id: 1n,
              name: 'Billionare Apex-15 Pro',
              inventory: { quantity: 2, reserved: 0 },
            },
          }),
        ],
      });

      await expect(service.checkout(1n, checkoutDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('creates the address, order, and payment, decrements inventory, and clears the cart', async () => {
      const result = await service.checkout(1n, checkoutDto);

      expect(tx.address.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 1n, fullName: 'Sarah Mitchell' }),
        }),
      );
      expect(tx.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 1n,
            addressId: 99n,
            status: 'CONFIRMED',
            subtotal: 1699,
          }),
        }),
      );
      expect(tx.inventory.update).toHaveBeenCalledWith({
        where: { productId: 1n },
        data: { quantity: { decrement: 1 } },
      });
      expect(tx.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 10n } });

      expect(result.tax).toBeCloseTo(135.92, 2);
      expect(result.orderNumber).toBe('NB-TEST-0001');
    });
  });

  describe('findMany', () => {
    it('maps orders to summaries', async () => {
      prisma.order.findMany.mockResolvedValue([buildOrderRow()]);

      const result = await service.findMany(1n);

      expect(result).toEqual([
        {
          id: '5',
          orderNumber: 'NB-TEST-0001',
          status: 'CONFIRMED',
          total: 1834.92,
          itemCount: 1,
          createdAt: buildOrderRow().createdAt,
        },
      ]);
    });
  });

  describe('findOne', () => {
    it('returns detail for an order belonging to the user', async () => {
      prisma.order.findUnique.mockResolvedValue(buildOrderRow());

      const result = await service.findOne(1n, '5');

      expect(result.id).toBe('5');
      expect(result.items).toEqual([
        {
          productId: '1',
          name: 'Billionare Apex-15 Pro',
          quantity: 1,
          unitPrice: 1699,
          subtotal: 1699,
        },
      ]);
    });

    it('throws NotFoundException for an unknown order', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.findOne(1n, '999')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("throws ForbiddenException for another user's order", async () => {
      prisma.order.findUnique.mockResolvedValue(buildOrderRow({ userId: 2n }));

      await expect(service.findOne(1n, '5')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
