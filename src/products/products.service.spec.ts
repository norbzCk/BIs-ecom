import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

function decimal(value: number) {
  return { toNumber: () => value };
}

function buildProductRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1n,
    slug: 'billionare-apex-15-pro',
    name: 'Billionare Apex-15 Pro',
    brand: 'Billionare',
    model: 'Apex-15 Pro',
    description: 'A workstation laptop.',
    price: decimal(1699),
    sku: 'NB-APEX15-PRO',
    category: { id: 1n, name: 'Computers & Laptops' },
    images: [{ imageUrl: 'https://example.com/1.jpg', isPrimary: true }],
    specifications: [{ name: 'CPU', value: 'Intel Core i9' }],
    inventory: { quantity: 10, reserved: 2 },
    ...overrides,
  };
}

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: {
    $transaction: ReturnType<typeof vi.fn>;
    product: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    };
    category: { findMany: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    prisma = {
      $transaction: vi.fn(),
      product: {
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
      },
      category: { findMany: vi.fn() },
    };

    service = new ProductsService(prisma as unknown as PrismaService);
  });

  describe('findMany', () => {
    it('maps rows to list items and computes pagination', async () => {
      prisma.$transaction.mockResolvedValue([[buildProductRow()], 1]);

      const result = await service.findMany({ page: 1, pageSize: 12 });

      expect(result).toEqual({
        items: [
          {
            id: '1',
            slug: 'billionare-apex-15-pro',
            name: 'Billionare Apex-15 Pro',
            brand: 'Billionare',
            category: 'Computers & Laptops',
            price: 1699,
            image: { url: 'https://example.com/1.jpg', alt: 'Billionare Apex-15 Pro' },
            stockLabel: 'In Stock',
            inStock: true,
          },
        ],
        page: 1,
        pageSize: 12,
        total: 1,
        totalPages: 1,
      });
    });

    it('reports "Out of Stock" when there is no inventory row', async () => {
      prisma.$transaction.mockResolvedValue([
        [buildProductRow({ inventory: null })],
        1,
      ]);

      const result = await service.findMany({});

      expect(result.items[0]?.inStock).toBe(false);
      expect(result.items[0]?.stockLabel).toBe('Out of Stock');
    });

    it('reports "In Stock" once available comfortably exceeds the low-stock threshold', async () => {
      prisma.$transaction.mockResolvedValue([
        [buildProductRow({ inventory: { quantity: 100, reserved: 0 } })],
        1,
      ]);

      const result = await service.findMany({});

      expect(result.items[0]?.stockLabel).toBe('In Stock');
    });

    it('reports the remaining count once stock is low (5 or fewer available)', async () => {
      prisma.$transaction.mockResolvedValue([
        [buildProductRow({ inventory: { quantity: 6, reserved: 1 } })],
        1,
      ]);

      const result = await service.findMany({});

      expect(result.items[0]?.stockLabel).toBe('Only 5 left');
    });
  });

  describe('findBySlug', () => {
    it('returns full detail including specs and images', async () => {
      prisma.product.findUnique.mockResolvedValue(buildProductRow());

      const result = await service.findBySlug('billionare-apex-15-pro');

      expect(result.specs).toEqual([{ label: 'CPU', value: 'Intel Core i9' }]);
      expect(result.images).toEqual([
        { url: 'https://example.com/1.jpg', alt: 'Billionare Apex-15 Pro', isPrimary: true },
      ]);
      expect(result.price).toBe(1699);
    });

    it('throws NotFoundException for an unknown slug', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('listCategories', () => {
    it('maps category rows including product count', async () => {
      prisma.category.findMany.mockResolvedValue([
        {
          id: 1n,
          name: 'Computers & Laptops',
          description: null,
          _count: { products: 8 },
        },
      ]);

      const result = await service.listCategories();

      expect(result).toEqual([
        { id: '1', name: 'Computers & Laptops', description: null, productCount: 8 },
      ]);
    });
  });
});
