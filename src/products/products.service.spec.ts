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
    compareAtPrice: null,
    sku: 'NB-APEX15-PRO',
    rating: null,
    reviewCount: 0,
    badge: null,
    featured: false,
    releasedAt: null,
    highlights: [],
    category: { id: 1n, name: 'Computers & Laptops' },
    images: [{ imageUrl: 'https://example.com/1.jpg', isPrimary: true }],
    specifications: [{ name: 'CPU', value: 'Intel Core i9' }],
    reviews: [],
    inventory: { quantity: 10, reserved: 2 },
    ...overrides,
  };
}

const EMPTY_FACETS = {
  brands: [],
  categories: [],
  priceRange: { min: 1699, max: 1699 },
};

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: {
    $transaction: ReturnType<typeof vi.fn>;
    product: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      aggregate: ReturnType<typeof vi.fn>;
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
        aggregate: vi.fn(),
      },
      category: { findMany: vi.fn() },
    };

    // findMany reads the rows and the facets in two separate transactions.
    prisma.$transaction
      .mockResolvedValueOnce([[buildProductRow()], 1])
      .mockResolvedValueOnce([[], [], { _min: { price: decimal(1699) }, _max: { price: decimal(1699) } }]);

    service = new ProductsService(prisma as unknown as PrismaService);
  });

  describe('findMany', () => {
    it('maps rows to list items and computes pagination', async () => {
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
            compareAtPrice: null,
            rating: null,
            reviewCount: 0,
            badge: null,
            featured: false,
            releasedAt: null,
            image: { url: 'https://example.com/1.jpg', alt: 'Billionare Apex-15 Pro' },
            inStock: true,
            stock: 8,
            stockLabel: 'In Stock',
          },
        ],
        page: 1,
        pageSize: 12,
        total: 1,
        totalPages: 1,
        facets: EMPTY_FACETS,
      });
    });

    it('reports "Out of Stock" when there is no inventory row', async () => {
      prisma.$transaction.mockReset();
      prisma.$transaction
        .mockResolvedValueOnce([[buildProductRow({ inventory: null })], 1])
        .mockResolvedValueOnce([[], [], { _min: { price: null }, _max: { price: null } }]);

      const result = await service.findMany({});

      expect(result.items[0]?.inStock).toBe(false);
      expect(result.items[0]?.stockLabel).toBe('Out of Stock');
    });

    it('reports "In Stock" once available comfortably exceeds the low-stock threshold', async () => {
      prisma.$transaction.mockReset();
      prisma.$transaction
        .mockResolvedValueOnce([
          [buildProductRow({ inventory: { quantity: 100, reserved: 0 } })],
          1,
        ])
        .mockResolvedValueOnce([[], [], { _min: { price: null }, _max: { price: null } }]);

      const result = await service.findMany({});

      expect(result.items[0]?.stockLabel).toBe('In Stock');
    });

    it('reports the remaining count once stock is low (5 or fewer available)', async () => {
      prisma.$transaction.mockReset();
      prisma.$transaction
        .mockResolvedValueOnce([
          [buildProductRow({ inventory: { quantity: 6, reserved: 1 } })],
          1,
        ])
        .mockResolvedValueOnce([[], [], { _min: { price: null }, _max: { price: null } }]);

      const result = await service.findMany({});

      expect(result.items[0]?.stockLabel).toBe('Only 5 left');
    });

    it('exposes merchandising fields the storefront renders', async () => {
      prisma.$transaction.mockReset();
      prisma.$transaction.mockResolvedValueOnce([
        [
          buildProductRow({
            compareAtPrice: decimal(2099),
            rating: decimal(4.8),
            reviewCount: 124,
            badge: 'Top-tier selection',
            featured: true,
            highlights: ['Sustained 4.2GHz'],
          }),
        ],
        1,
      ]);
      prisma.$transaction.mockResolvedValueOnce([
        ['Billionare', 'ASUS'].map((brand) => ({ brand })),
        [],
        { _min: { price: decimal(100) }, _max: { price: decimal(2099) } },
      ]);

      const result = await service.findMany({ featured: true });

      expect(result.items[0]).toMatchObject({
        compareAtPrice: 2099,
        rating: 4.8,
        reviewCount: 124,
        badge: 'Top-tier selection',
        featured: true,
      });
      expect(result.facets.brands).toEqual(['Billionare', 'ASUS']);
      expect(result.facets.priceRange).toEqual({ min: 100, max: 2099 });
    });
  });

  describe('findBySlug', () => {
    it('returns full detail including specs, images and reviews', async () => {
      prisma.product.findUnique.mockResolvedValue(
        buildProductRow({
          highlights: ['140Hz QHD+ panel'],
          reviews: [
            {
              id: 9n,
              author: 'Marcus Vance',
              role: 'CTO',
              rating: 5,
              quote: 'Arrived fully configured.',
            },
          ],
        }),
      );

      const result = await service.findBySlug('billionare-apex-15-pro');

      expect(result.specs).toEqual([{ label: 'CPU', value: 'Intel Core i9' }]);
      expect(result.images).toEqual([
        {
          url: 'https://example.com/1.jpg',
          alt: 'Billionare Apex-15 Pro',
          isPrimary: true,
        },
      ]);
      expect(result.highlights).toEqual(['140Hz QHD+ panel']);
      expect(result.reviews).toEqual([
        {
          id: '9',
          author: 'Marcus Vance',
          role: 'CTO',
          rating: 5,
          quote: 'Arrived fully configured.',
          product: 'Billionare Apex-15 Pro',
        },
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
