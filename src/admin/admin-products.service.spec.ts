import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AdminProductsService } from './admin-products.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

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
    status: 'ACTIVE',
    category: { id: 2n, name: 'Computers & Laptops' },
    images: [{ imageUrl: 'https://example.com/1.jpg', isPrimary: true }],
    specifications: [{ name: 'CPU', value: 'Intel Core i9' }],
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

    service = new AdminProductsService(prisma as unknown as PrismaService);
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
        stockQuantity: 10,
        updatedAt: buildProductRow().updatedAt,
      });
    });
  });
});
