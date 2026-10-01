import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { OrdersService } from './orders.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

// The service does its money arithmetic with real Prisma.Decimals (no floats on
// currency), so the fixtures have to be real ones too — a `{ toNumber }` stub
// cannot answer `plus`/`mul`/`minus`.
const decimal = (value: number | string) => new Prisma.Decimal(value);

function buildCartItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    productId: 1n,
    quantity: 1,
    unitPrice: decimal(1699),
    product: { id: 1n, name: 'Billionare Apex-15 Pro' },
    ...overrides,
  };
}

function buildCart(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: 10n, items: [buildCartItem()], ...overrides };
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
      findFirst: ReturnType<typeof vi.fn>;
    };
  };
  let tx: {
    $queryRaw: ReturnType<typeof vi.fn>;
    cart: { findFirst: ReturnType<typeof vi.fn> };
    cartItem: { deleteMany: ReturnType<typeof vi.fn> };
    address: { create: ReturnType<typeof vi.fn> };
    order: { create: ReturnType<typeof vi.fn> };
    inventory: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
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
      // One row back per product the statement managed to update, which is how
      // the service knows every line had enough stock.
      $queryRaw: vi.fn().mockResolvedValue([{ productId: 1n }]),
      cart: { findFirst: vi.fn().mockResolvedValue(buildCart()) },
      cartItem: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      address: { create: vi.fn().mockResolvedValue({ id: 99n }) },
      order: { create: vi.fn().mockResolvedValue(buildOrderRow()) },
      inventory: {
        findUnique: vi.fn().mockResolvedValue({ quantity: 2, reserved: 0 }),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    prisma = {
      $transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback(tx)),
      order: { findMany: vi.fn(), findFirst: vi.fn() },
    };

    service = new OrdersService(prisma as unknown as PrismaService);
  });

  describe('checkout', () => {
    it('rejects checkout with an empty cart', async () => {
      tx.cart.findFirst.mockResolvedValue(buildCart({ items: [] }));

      await expect(service.checkout(1n, checkoutDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(tx.order.create).not.toHaveBeenCalled();
    });

    it('rejects checkout when there is no cart at all', async () => {
      // getOrCreateCart is gone, so a user who never added anything now has no
      // row rather than a freshly created empty one.
      tx.cart.findFirst.mockResolvedValue(null);

      await expect(service.checkout(1n, checkoutDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(tx.order.create).not.toHaveBeenCalled();
    });

    it('rejects a cart that a concurrent checkout already claimed', async () => {
      // The claim is a deleteMany whose row count has to match what we read.
      // A mismatch means someone else emptied the cart in between, so creating
      // a second order for the same items would double-sell them.
      tx.cartItem.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.checkout(1n, checkoutDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      // Nothing was reserved: the abort happens before the stock statement.
      expect(tx.$queryRaw).not.toHaveBeenCalled();
      expect(tx.order.create).not.toHaveBeenCalled();
    });

    it('claims the cart before reserving stock', async () => {
      await service.checkout(1n, checkoutDto);

      expect(tx.cart.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 1n } }),
      );
      expect(tx.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 10n } });
    });

    it('rejects checkout when a line is short of stock', async () => {
      // No row came back, so the WHERE clause rejected every line.
      tx.$queryRaw.mockResolvedValue([]);
      tx.inventory.findUnique.mockResolvedValue({ quantity: 2, reserved: 0 });

      await expect(service.checkout(1n, checkoutDto)).rejects.toThrow(
        /Only 2 unit\(s\) of "Billionare Apex-15 Pro" available/,
      );
      expect(tx.order.create).not.toHaveBeenCalled();
    });

    it('decrements every line in a single statement against the mapped columns', async () => {
      tx.cart.findFirst.mockResolvedValue(
        buildCart({
          items: [buildCartItem(), buildCartItem({ productId: 2n, quantity: 3 })],
        }),
      );
      tx.cartItem.deleteMany.mockResolvedValue({ count: 2 });
      tx.$queryRaw.mockResolvedValue([{ productId: 1n }, { productId: 2n }]);

      await service.checkout(1n, checkoutDto);

      expect(tx.$queryRaw).toHaveBeenCalledTimes(1);

      // Table and FK are `inventory` / `product_id` per the schema's @@map/@map,
      // not the Prisma model names, so this is the assertion that catches a
      // mismatch between the raw SQL and the schema.
      const [sql] = tx.$queryRaw.mock.calls[0] as [{ text: string }];
      expect(sql.text).toContain('UPDATE "inventory"');
      expect(sql.text).toContain('i."product_id"');
      expect(sql.text).not.toContain('"Inventory"');
      // The only camelCase left is the RETURNING alias, which is the JS key.
      expect(sql.text).not.toContain('i."productId"');

      // No per-item round trip: the N+1 that used to oversell is gone.
      expect(tx.inventory.update).not.toHaveBeenCalled();
    });

    it('merges duplicate product lines so each product is updated once', async () => {
      tx.cart.findFirst.mockResolvedValue(
        buildCart({
          items: [buildCartItem({ quantity: 1 }), buildCartItem({ quantity: 2 })],
        }),
      );
      tx.cartItem.deleteMany.mockResolvedValue({ count: 2 });

      await service.checkout(1n, checkoutDto);

      // Two lines for one product collapse into a single pair, so one row back
      // is the success condition rather than a shortfall.
      expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
      const [sql] = tx.$queryRaw.mock.calls[0] as [{ text: string; values: unknown[] }];
      expect(sql.text.match(/\(\$1::bigint, \$2::int\)/g)).toHaveLength(1);
      expect(sql.values).toEqual(['1', 3]);
    });

    it('creates the address, order and payment, and clears the cart', async () => {
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
            payments: { create: expect.objectContaining({ method: 'CARD' }) },
          }),
        }),
      );
      expect(tx.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 10n } });

      // Tax is derived from the stored figures, so it survives a rate change.
      expect(result.tax).toBeCloseTo(135.92, 2);
      expect(result.orderNumber).toBe('NB-TEST-0001');
    });

    it('quotes the order number from a CSPRNG, not Math.random', async () => {
      const spy = vi.spyOn(Math, 'random');

      const result = await service.checkout(1n, checkoutDto);

      expect(result.orderNumber).toMatch(/^NB-[0-9A-Z]+-\d{4}$/);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('findMany', () => {
    it('maps orders to summaries', async () => {
      prisma.order.findMany.mockResolvedValue([
        {
          id: 5n,
          orderNumber: 'NB-TEST-0001',
          status: 'CONFIRMED',
          total: decimal(1834.92),
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          items: [{ quantity: 1 }, { quantity: 2 }],
        },
      ]);

      const result = await service.findMany(1n);

      expect(result).toEqual([
        {
          id: '5',
          orderNumber: 'NB-TEST-0001',
          status: 'CONFIRMED',
          total: 1834.92,
          itemCount: 3,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);
    });

    it('reads only the columns the summary needs', async () => {
      prisma.order.findMany.mockResolvedValue([]);

      await service.findMany(1n);

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 1n },
          select: expect.objectContaining({ orderNumber: true, total: true }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns detail for an order belonging to the user', async () => {
      prisma.order.findFirst.mockResolvedValue(buildOrderRow());

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
      expect(result.payment).toEqual({ method: 'CARD', status: 'PENDING' });
    });

    it('filters by owner in the query so ids cannot be probed', async () => {
      prisma.order.findFirst.mockResolvedValue(buildOrderRow());

      await service.findOne(1n, '5');

      expect(prisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 5n, userId: 1n } }),
      );
    });

    it('loads only the latest payment', async () => {
      prisma.order.findFirst.mockResolvedValue(buildOrderRow());

      await service.findOne(1n, '5');

      expect(prisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            payments: expect.objectContaining({ orderBy: { id: 'desc' }, take: 1 }),
          }),
        }),
      );
    });

    it('throws NotFoundException for an unknown order', async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(service.findOne(1n, '999')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("throws NotFoundException, not 403, for another user's order", async () => {
      // The query is scoped to the owner, so "not yours" and "does not exist"
      // are the same answer — a 403 would confirm the id exists.
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(service.findOne(1n, '5')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects a malformed id before touching the database', async () => {
      await expect(service.findOne(1n, 'not-a-number')).rejects.toThrow();
      expect(prisma.order.findFirst).not.toHaveBeenCalled();
    });
  });
});
