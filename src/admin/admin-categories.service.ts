import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { isUniqueConstraintError } from '../common/prisma-errors.js';
import { toBigIntId } from '../common/serialization/to-bigint-id.js';
import type { CreateCategoryDto } from './dto/create-category.dto.js';
import type { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class AdminCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    await this.assertNameAvailable(dto.name);

    try {
      const category = await this.prisma.category.create({
        data: {
          name: dto.name,
          description: dto.description,
          position: await this.nextPosition(),
        },
      });
      return this.toResponse(category, 0);
    } catch (error) {
      throw this.mapConflict(error, dto.name);
    }
  }

  /**
   * New categories go to the end of the Browse grid rather than inheriting the
   * schema default of 0, which would sort them above the seeded ones. The +10
   * step matches the spacing the seed migration uses, leaving room to insert
   * categories between existing ones later without renumbering.
   */
  private async nextPosition(): Promise<number> {
    const highest = await this.prisma.category.findFirst({
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    return (highest?.position ?? 0) + 10;
  }

  async update(idRaw: string, dto: UpdateCategoryDto) {
    const id = toBigIntId(idRaw, 'categoryId');
    const existing = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    if (dto.name && dto.name !== existing.name) {
      await this.assertNameAvailable(dto.name, id);
    }

    try {
      const category = await this.prisma.category.update({
        where: { id },
        data: { name: dto.name, description: dto.description },
      });
      return this.toResponse(category, existing._count.products);
    } catch (error) {
      throw this.mapConflict(error, dto.name);
    }
  }

  /**
   * Products reference their category with no cascade, so deleting a category
   * that still has products would fail at the database. Refuse up front with a
   * message the admin can act on instead of surfacing a foreign-key error.
   */
  async remove(idRaw: string) {
    const id = toBigIntId(idRaw, 'categoryId');
    const existing = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    const productCount = existing._count.products;
    if (productCount > 0) {
      throw new ConflictException(
        `Cannot delete "${existing.name}": ${productCount} product(s) still use it. Move or remove them first.`,
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return this.toResponse(existing, 0);
  }

  /** Category names are unique; also treat "mice" and "Mice" as the same name. */
  private async assertNameAvailable(
    name: string,
    excludeId?: bigint,
  ): Promise<void> {
    const clash = await this.prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (clash && clash.id !== excludeId) {
      throw new ConflictException(
        `A category named "${clash.name}" already exists`,
      );
    }
  }

  private mapConflict(error: unknown, name?: string): unknown {
    return isUniqueConstraintError(error)
      ? new ConflictException(`A category named "${name}" already exists`)
      : error;
  }

  private toResponse(
    category: { id: bigint; name: string; description: string | null },
    productCount: number,
  ) {
    return {
      id: category.id.toString(),
      name: category.name,
      description: category.description,
      productCount,
    };
  }
}
