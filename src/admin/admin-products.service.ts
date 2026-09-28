import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { decimalToNumber } from '../common/serialization/decimal-to-number.js';
import { toBigIntId } from '../common/serialization/to-bigint-id.js';
import {
  isUniqueConstraintError,
  uniqueConstraintTargets,
} from '../common/prisma-errors.js';
import type { CreateProductDto } from './dto/create-product.dto.js';
import type { UpdateProductDto } from './dto/update-product.dto.js';
import type { AdminQueryProductsDto } from './dto/admin-query-products.dto.js';

const ADMIN_PRODUCT_INCLUDE = {
  category: true,
  images: { orderBy: { isPrimary: 'desc' as const } },
  specifications: true,
  inventory: true,
} satisfies Prisma.ProductInclude;

type AdminProductRow = Prisma.ProductGetPayload<{
  include: typeof ADMIN_PRODUCT_INCLUDE;
}>;

@Injectable()
export class AdminProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: AdminQueryProductsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;

    const where: Prisma.ProductWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.category && {
        category: { name: { equals: query.category, mode: 'insensitive' } },
      }),
      ...(query.brand && {
        brand: { equals: query.brand, mode: 'insensitive' },
      }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { sku: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: ADMIN_PRODUCT_INCLUDE,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toSummary(row)),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async findOne(idRaw: string) {
    const product = await this.getProductOrThrow(idRaw);
    return this.toDetail(product);
  }

  async create(dto: CreateProductDto) {
    const categoryId = toBigIntId(dto.categoryId, 'categoryId');
    await this.assertCategoryExists(categoryId);

    const slug = dto.slug
      ? await this.assertSlugAvailable(dto.slug)
      : await this.generateUniqueSlug(dto.name);

    try {
      const product = await this.prisma.product.create({
        data: {
          name: dto.name,
          slug,
          sku: dto.sku,
          categoryId,
          price: dto.price,
          brand: dto.brand,
          model: dto.model,
          description: dto.description,
          status: dto.status ?? 'ACTIVE',
          images: { create: this.normalizeImages(dto.images) },
          specifications: {
            create: (dto.specifications ?? []).map((spec) => ({
              name: spec.name,
              value: spec.value,
            })),
          },
          inventory: {
            create: { quantity: dto.inventory.quantity },
          },
        },
        include: ADMIN_PRODUCT_INCLUDE,
      });

      return this.toDetail(product);
    } catch (error) {
      throw this.mapUniqueConstraintError(error, dto.sku, slug);
    }
  }

  async update(idRaw: string, dto: UpdateProductDto) {
    const existing = await this.getProductOrThrow(idRaw);

    const categoryId = dto.categoryId
      ? toBigIntId(dto.categoryId, 'categoryId')
      : undefined;
    if (categoryId) {
      await this.assertCategoryExists(categoryId);
    }

    const slug =
      dto.slug && dto.slug !== existing.slug
        ? await this.assertSlugAvailable(dto.slug, existing.id)
        : undefined;

    try {
      const product = await this.prisma.$transaction(async (tx) => {
        if (dto.images) {
          await tx.productImage.deleteMany({
            where: { productId: existing.id },
          });
        }
        if (dto.specifications) {
          await tx.productSpecification.deleteMany({
            where: { productId: existing.id },
          });
        }

        return tx.product.update({
          where: { id: existing.id },
          data: {
            name: dto.name,
            slug,
            sku: dto.sku,
            categoryId,
            price: dto.price,
            brand: dto.brand,
            model: dto.model,
            description: dto.description,
            status: dto.status,
            ...(dto.images && {
              images: { create: this.normalizeImages(dto.images) },
            }),
            ...(dto.specifications && {
              specifications: {
                create: dto.specifications.map((spec) => ({
                  name: spec.name,
                  value: spec.value,
                })),
              },
            }),
            ...(dto.inventory && {
              inventory: {
                upsert: {
                  create: { quantity: dto.inventory.quantity },
                  update: { quantity: dto.inventory.quantity },
                },
              },
            }),
          },
          include: ADMIN_PRODUCT_INCLUDE,
        });
      });

      return this.toDetail(product);
    } catch (error) {
      throw this.mapUniqueConstraintError(error, dto.sku, slug);
    }
  }

  /**
   * Soft delete: past orders reference products with no cascade (an OrderItem
   * must keep pointing at a real Product for order-history integrity), so a
   * hard delete would fail once a product has ever been ordered. Discontinuing
   * hides it from the public catalog (findMany filters to status: 'ACTIVE')
   * without breaking that history.
   */
  async archive(idRaw: string) {
    const existing = await this.getProductOrThrow(idRaw);
    const product = await this.prisma.product.update({
      where: { id: existing.id },
      data: { status: 'DISCONTINUED' },
      include: ADMIN_PRODUCT_INCLUDE,
    });
    return this.toDetail(product);
  }

  /**
   * Guarantees exactly one primary image. Clients send an explicit `isPrimary`
   * per image, so if the primary one was removed they can end up with none
   * marked (a blank catalog thumbnail), or with several. The first image marked
   * primary wins; if none is, the first image becomes primary.
   */
  private normalizeImages(images: { url: string; isPrimary?: boolean }[]) {
    const marked = images.findIndex((image) => image.isPrimary === true);
    const primaryIndex = marked === -1 ? 0 : marked;

    return images.map((image, index) => ({
      imageUrl: image.url,
      isPrimary: index === primaryIndex,
    }));
  }

  private async getProductOrThrow(idRaw: string): Promise<AdminProductRow> {
    const id = toBigIntId(idRaw, 'productId');
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: ADMIN_PRODUCT_INCLUDE,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private async assertCategoryExists(categoryId: bigint): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new BadRequestException(`Category ${categoryId} does not exist`);
    }
  }

  private async assertSlugAvailable(
    slug: string,
    excludeId?: bigint,
  ): Promise<string> {
    const existing = await this.prisma.product.findUnique({ where: { slug } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Slug "${slug}" is already in use`);
    }
    return slug;
  }

  /** Slugifies `name` and appends -2, -3, ... until it finds a free slug. */
  private async generateUniqueSlug(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'product';

    let candidate = base;
    let suffix = 2;

    while (
      await this.prisma.product.findUnique({ where: { slug: candidate } })
    ) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private mapUniqueConstraintError(
    error: unknown,
    sku?: string,
    slug?: string,
  ): unknown {
    if (!isUniqueConstraintError(error)) return error;

    const target = uniqueConstraintTargets(error);

    if (target.includes('sku')) {
      return new ConflictException(`SKU "${sku}" is already in use`);
    }
    if (target.includes('slug')) {
      return new ConflictException(`Slug "${slug}" is already in use`);
    }
    return new ConflictException('This product conflicts with an existing one');
  }

  private toSummary(row: AdminProductRow) {
    return {
      id: row.id.toString(),
      sku: row.sku,
      name: row.name,
      category: row.category.name,
      price: decimalToNumber(row.price),
      status: row.status,
      stockQuantity: row.inventory?.quantity ?? 0,
      updatedAt: row.updatedAt,
    };
  }

  private toDetail(row: AdminProductRow) {
    return {
      id: row.id.toString(),
      sku: row.sku,
      name: row.name,
      slug: row.slug,
      brand: row.brand,
      model: row.model,
      description: row.description,
      price: decimalToNumber(row.price),
      status: row.status,
      category: { id: row.category.id.toString(), name: row.category.name },
      images: row.images.map((image) => ({
        url: image.imageUrl,
        isPrimary: image.isPrimary,
      })),
      specifications: row.specifications.map((spec) => ({
        name: spec.name,
        value: spec.value,
      })),
      inventory: {
        quantity: row.inventory?.quantity ?? 0,
        reserved: row.inventory?.reserved ?? 0,
      },
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
