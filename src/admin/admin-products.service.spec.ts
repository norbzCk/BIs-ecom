import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AdminProductsService } from './admin-products.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SupabaseStorageService } from '../storage/supabase-storage.service.js';

function decimal(value: number) {
  return { toNumber: () => value };
}

function buildProductRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1n,
    sku: 'NB-APEX15-PRO',
    name: 'Billionare Apex-15 Pro',
    slug: 'billionare-apex-15-pro',
    brand: 'Billionare',
    model: 'Apex-15 Pro',
    description: 'A workstation laptop.',
    price: decimal(1699),
    compareAtPrice: null,
    rating: null,
    reviewCount: 0,
    badge: null,
    featured: false,
    releasedAt: null,
    highlights: [],
    status: 'ACTIVE',
    category: { id: 2n, name: 'Computers & Laptops' },
    images: [{ imageUrl: 'https://example.com/1.jpg', isPrimary: true }],
    specifications: [{ name: 'CPU', value: 'Intel Core i9' }],
    reviews: [],
    inventory: { quantity: 10, reserved: 0 },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

const validCreateDto = {
  name: 'Billionare Apex-15 Pro',
  sku: 'NB-APEX15-PRO',
  categoryId: '2',
  price: 1699,
  images: [{ url: 'https://example.com/1.jpg', isPrimary: true }],
  inventory: { quantity: 10 },
};

describe('AdminProductsService', () => {
  let service: AdminProductsService;
  let prisma: {
    $transaction: ReturnType<typeof vi.fn>;
    product: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    category: { findUnique: ReturnType<typeof vi.fn> };
  };
  let storage: {
    toBucketPath: ReturnType<typeof vi.fn>;
    removeImages: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    prisma = {
      $transaction: vi.fn(),
      product: {
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      category: { findUnique: vi.fn() },
    };

    storage = {
      toBucketPath: vi.fn().mockReturnValue(null),
      removeImages: vi.fn().mockResolvedValue(undefined),
    };

    service = new AdminProductsService(
      prisma as unknown as PrismaService,
      storage as unknown as SupabaseStorageService,
    );
  });

  describe('create', () => {
    it('rejects a non-existent category', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.create(validCreateDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it('creates the product with images, specs, and inventory when given a slug', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 2n,
        name: 'Computers & Laptops',
      });
      prisma.product.findUnique.mockResolvedValue(null); // slug availability check
      prisma.product.create.mockResolvedValue(buildProductRow());

      const result = await service.create({
        ...validCreateDto,
        slug: 'billionare-apex-15-pro',
        specifications: [{ name: 'CPU', value: 'Intel Core i9' }],
      });

      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'billionare-apex-15-pro',
            categoryId: 2n,
            images: {
              create: [
                { imageUrl: 'https://example.com/1.jpg', isPrimary: true },
              ],
            },
            inventory: { create: { quantity: 10 } },
          }),
        }),
      );
      expect(result.id).toBe('1');
      expect(result.category).toEqual({ id: '2', name: 'Computers & Laptops' });
    });

    it('generates a unique slug from the name when none is given', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 2n,
        name: 'Computers & Laptops',
      });
      // First candidate slug is taken, second is free.
      prisma.product.findUnique
        .mockResolvedValueOnce(
          buildProductRow({ slug: 'billionare-apex-15-pro' }),
        )
        .mockResolvedValueOnce(null);
      prisma.product.create.mockResolvedValue(buildProductRow());

      await service.create({
        ...validCreateDto,
        name: 'Billionare Apex-15 Pro',
      });

      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: 'billionare-apex-15-pro-2' }),
        }),
      );
    });

    it('persists the merchandising fields and reviews', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 2n,
        name: 'Computers & Laptops',
      });
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue(
        buildProductRow({ rating: decimal(4.8) }),
      );

      await service.create({
        ...validCreateDto,
        compareAtPrice: 2099,
        rating: 4.8,
        reviewCount: 12,
        badge: 'Top-tier selection',
        featured: true,
        releasedAt: '2026-08-14T00:00:00.000Z',
        highlights: ['Sustained 4.2GHz'],
        reviews: [
          { author: 'Marcus Vance', role: 'CTO', rating: 5, quote: 'Immaculate.' },
        ],
      });

      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            compareAtPrice: 2099,
            rating: 4.8,
            reviewCount: 12,
            badge: 'Top-tier selection',
            featured: true,
            releasedAt: new Date('2026-08-14T00:00:00.000Z'),
            highlights: ['Sustained 4.2GHz'],
            reviews: {
              create: [
                {
                  author: 'Marcus Vance',
                  role: 'CTO',
                  rating: 5,
                  quote: 'Immaculate.',
                },
              ],
            },
          }),
        }),
      );
    });

    it('refuses a compare-at price that is not above the price', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 2n,
        name: 'Computers & Laptops',
      });

      await expect(
        service.create({ ...validCreateDto, price: 1699, compareAtPrice: 1500 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.product.create).not.toHaveBeenCalled();
    });

    describe('primary image normalization', () => {
      const createdImages = () => {
        const args = prisma.product.create.mock.calls[0]?.[0] as
          | {
              data: {
                images: { create: { imageUrl: string; isPrimary: boolean }[] };
              };
            }
          | undefined;
        if (!args) {
          throw new Error('expected prisma.product.create to have been called');
        }
        return args.data.images.create;
      };

      beforeEach(() => {
        prisma.category.findUnique.mockResolvedValue({
          id: 2n,
          name: 'Computers & Laptops',
        });
        prisma.product.findUnique.mockResolvedValue(null);
        prisma.product.create.mockResolvedValue(buildProductRow());
      });

      it('makes the first image primary when none is marked (e.g. the primary was removed)', async () => {
        await service.create({
          ...validCreateDto,
          slug: 's',
          images: [
            { url: 'https://example.com/a.jpg', isPrimary: false },
            { url: 'https://example.com/b.jpg', isPrimary: false },
          ],
        });

        expect(createdImages().map((i) => i.isPrimary)).toEqual([true, false]);
      });

      it('honors an explicitly marked non-first primary image', async () => {
        await service.create({
          ...validCreateDto,
          slug: 's',
          images: [
            { url: 'https://example.com/a.jpg' },
            { url: 'https://example.com/b.jpg', isPrimary: true },
          ],
        });

        expect(createdImages().map((i) => i.isPrimary)).toEqual([false, true]);
      });

      it('keeps only the first when several images are marked primary', async () => {
        await service.create({
          ...validCreateDto,
          slug: 's',
          images: [
            { url: 'https://example.com/a.jpg', isPrimary: true },
            { url: 'https://example.com/b.jpg', isPrimary: true },
            { url: 'https://example.com/c.jpg', isPrimary: true },
          ],
        });

        expect(createdImages().map((i) => i.isPrimary)).toEqual([
          true,
          false,
          false,
        ]);
      });
    });

    it('rejects a duplicate SKU with a friendly ConflictException', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 2n,
        name: 'Computers & Laptops',
      });
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.product.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['sku'] },
      });

      await expect(
        service.create({ ...validCreateDto, slug: 'some-slug' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('update', () => {
    it('throws NotFoundException for an unknown product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.update('999', { name: 'New name' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('replaces images/specs and updates inventory inside a transaction', async () => {
      prisma.product.findUnique.mockResolvedValue(buildProductRow());
      const tx = {
        productImage: { deleteMany: vi.fn() },
        productSpecification: { deleteMany: vi.fn() },
        review: { deleteMany: vi.fn() },
        product: {
          update: vi
            .fn()
            .mockResolvedValue(buildProductRow({ name: 'Updated' })),
        },
      };
      prisma.$transaction.mockImplementation(
        async (cb: (tx: unknown) => unknown) => cb(tx),
      );

      const result = await service.update('1', {
        name: 'Updated',
        images: [{ url: 'https://example.com/2.jpg' }],
        specifications: [{ name: 'RAM', value: '32GB' }],
        inventory: { quantity: 5 },
      });

      expect(tx.productImage.deleteMany).toHaveBeenCalledWith({
        where: { productId: 1n },
      });
      expect(tx.productSpecification.deleteMany).toHaveBeenCalledWith({
        where: { productId: 1n },
      });
      expect(tx.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Updated',
            images: {
              create: [
                { imageUrl: 'https://example.com/2.jpg', isPrimary: true },
              ],
            },
            inventory: {
              upsert: { create: { quantity: 5 }, update: { quantity: 5 } },
            },
          }),
        }),
      );
      expect(result.name).toBe('Updated');
    });

    it('replaces reviews only when they are sent', async () => {
      prisma.product.findUnique.mockResolvedValue(buildProductRow());
      const tx = {
        productImage: { deleteMany: vi.fn() },
        productSpecification: { deleteMany: vi.fn() },
        review: { deleteMany: vi.fn() },
        product: {
          update: vi.fn().mockResolvedValue(buildProductRow()),
        },
      };
      prisma.$transaction.mockImplementation(
        async (cb: (tx: unknown) => unknown) => cb(tx),
      );

      await service.update('1', {
        reviews: [{ author: 'Priya Raman', rating: 4, quote: 'Reads true.' }],
      });

      expect(tx.review.deleteMany).toHaveBeenCalledWith({
        where: { productId: 1n },
      });
      expect(tx.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reviews: {
              create: [
                { author: 'Priya Raman', role: undefined, rating: 4, quote: 'Reads true.' },
              ],
            },
          }),
        }),
      );
    });

    it('deletes the files behind images the update dropped', async () => {
      prisma.product.findUnique.mockResolvedValue(
        buildProductRow({
          images: [
            { imageUrl: 'https://cdn.test/aa/old-1.jpg', isPrimary: true },
            { imageUrl: 'https://cdn.test/aa/old-2.jpg', isPrimary: false },
          ],
        }),
      );
      const tx = {
        productImage: { deleteMany: vi.fn() },
        productSpecification: { deleteMany: vi.fn() },
        review: { deleteMany: vi.fn() },
        product: { update: vi.fn().mockResolvedValue(buildProductRow()) },
      };
      prisma.$transaction.mockImplementation(
        async (cb: (tx: unknown) => unknown) => cb(tx),
      );
      storage.toBucketPath.mockImplementation((url: string) =>
        url.replace('https://cdn.test/aa/', ''),
      );

      await service.update('1', {
        images: [{ url: 'https://cdn.test/aa/old-1.jpg' }],
      });

      expect(storage.removeImages).toHaveBeenCalledWith(['old-2.jpg']);
    });

    it('never asks Storage to delete a URL that is not in our bucket', async () => {
      prisma.product.findUnique.mockResolvedValue(
        buildProductRow({
          images: [{ imageUrl: 'https://elsewhere.test/x.jpg', isPrimary: true }],
        }),
      );
      const tx = {
        productImage: { deleteMany: vi.fn() },
        productSpecification: { deleteMany: vi.fn() },
        review: { deleteMany: vi.fn() },
        product: { update: vi.fn().mockResolvedValue(buildProductRow()) },
      };
      prisma.$transaction.mockImplementation(
        async (cb: (tx: unknown) => unknown) => cb(tx),
      );
      storage.toBucketPath.mockReturnValue(null);

      await service.update('1', {
        images: [{ url: 'https://cdn.test/aa/new.jpg' }],
      });

      expect(storage.removeImages).toHaveBeenCalledWith([]);
    });
  });

  describe('archive', () => {
    it('sets status to DISCONTINUED rather than deleting the row', async () => {
      prisma.product.findUnique.mockResolvedValue(buildProductRow());
      prisma.product.update.mockResolvedValue(
        buildProductRow({ status: 'DISCONTINUED' }),
      );

      const result = await service.archive('1');

      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1n },
          data: { status: 'DISCONTINUED' },
        }),
      );
      expect(result.status).toBe('DISCONTINUED');
    });
  });

  describe('findMany', () => {
    it('maps rows to admin summaries including stock quantity', async () => {
      prisma.$transaction.mockResolvedValue([[buildProductRow()], 1]);

      const result = await service.findMany({});

      expect(result.items[0]).toEqual({
        id: '1',
        sku: 'NB-APEX15-PRO',
        name: 'Billionare Apex-15 Pro',
        category: 'Computers & Laptops',
        price: 1699,
        status: 'ACTIVE',
        imageUrl: 'https://example.com/1.jpg',
        stockQuantity: 10,
        updatedAt: buildProductRow().updatedAt,
      });
    });
  });
});
