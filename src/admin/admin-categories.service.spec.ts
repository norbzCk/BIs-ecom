import { ConflictException, NotFoundException } from '@nestjs/common';
import { AdminCategoriesService } from './admin-categories.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('AdminCategoriesService', () => {
  let service: AdminCategoriesService;
  let prisma: {
    category: {
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };

  const row = (overrides: Record<string, unknown> = {}) => ({
    id: 3n,
    name: 'Mechanical Keyboards',
    description: null,
    _count: { products: 0 },
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      category: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
    service = new AdminCategoriesService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates a category and reports zero products', async () => {
      prisma.category.create.mockResolvedValue(row());

      const result = await service.create({ name: 'Mechanical Keyboards' });

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: { name: 'Mechanical Keyboards', description: undefined },
      });
      expect(result).toEqual({
        id: '3',
        name: 'Mechanical Keyboards',
        description: null,
        productCount: 0,
      });
    });

    it('rejects a name that differs only by case', async () => {
      prisma.category.findFirst.mockResolvedValue(
        row({ name: 'Mechanical Keyboards' }),
      );

      await expect(
        service.create({ name: 'mechanical keyboards' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.category.create).not.toHaveBeenCalled();
    });

    it('maps a unique-constraint race (P2002) to a ConflictException', async () => {
      prisma.category.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['name'] },
      });

      await expect(service.create({ name: 'Audio' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('lets unexpected errors through untouched', async () => {
      const boom = new Error('db down');
      prisma.category.create.mockRejectedValue(boom);

      await expect(service.create({ name: 'Audio' })).rejects.toBe(boom);
    });
  });

  describe('update', () => {
    it('throws NotFoundException for an unknown category', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.update('99', { name: 'X' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('renames a category and keeps its product count', async () => {
      prisma.category.findUnique.mockResolvedValue(
        row({ _count: { products: 4 } }),
      );
      prisma.category.update.mockResolvedValue(row({ name: 'Keyboards' }));

      const result = await service.update('3', { name: 'Keyboards' });

      expect(result).toMatchObject({
        id: '3',
        name: 'Keyboards',
        productCount: 4,
      });
    });

    it('rejects renaming onto another category’s name', async () => {
      prisma.category.findUnique.mockResolvedValue(row());
      prisma.category.findFirst.mockResolvedValue(
        row({ id: 9n, name: 'Audio' }),
      );

      await expect(
        service.update('3', { name: 'audio' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it('allows saving a category under its own name (case change only)', async () => {
      prisma.category.findUnique.mockResolvedValue(row());
      // The only "clash" is the category itself, which must not count.
      prisma.category.findFirst.mockResolvedValue(row());
      prisma.category.update.mockResolvedValue(
        row({ name: 'MECHANICAL KEYBOARDS' }),
      );

      await expect(
        service.update('3', { name: 'MECHANICAL KEYBOARDS' }),
      ).resolves.toMatchObject({ name: 'MECHANICAL KEYBOARDS' });
    });
  });

  describe('remove', () => {
    it('throws NotFoundException for an unknown category', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.remove('99')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('refuses to delete a category that still has products', async () => {
      prisma.category.findUnique.mockResolvedValue(
        row({ _count: { products: 2 } }),
      );

      const attempt = service.remove('3');

      await expect(attempt).rejects.toBeInstanceOf(ConflictException);
      await expect(attempt).rejects.toThrow(/2 product\(s\) still use it/);
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it('deletes an empty category', async () => {
      prisma.category.findUnique.mockResolvedValue(row());
      prisma.category.delete.mockResolvedValue(row());

      const result = await service.remove('3');

      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: { id: 3n },
      });
      expect(result.id).toBe('3');
    });
  });
});
