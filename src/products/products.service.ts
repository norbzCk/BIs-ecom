import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { decimalToNumber } from '../common/serialization/decimal-to-number.js';
import type { QueryProductsDto } from './dto/query-products.dto.js';

const PRODUCT_LIST_INCLUDE = {
  category: true,
  images: { orderBy: { isPrimary: 'desc' as const } },
  inventory: true,
} satisfies Prisma.ProductInclude;

const PRODUCT_DETAIL_INCLUDE = {
  ...PRODUCT_LIST_INCLUDE,
  specifications: true,
} satisfies Prisma.ProductInclude;

type ProductListRow = Prisma.ProductGetPayload<{ include: typeof PRODUCT_LIST_INCLUDE }>;
type ProductDetailRow = Prisma.ProductGetPayload<{ include: typeof PRODUCT_DETAIL_INCLUDE }>;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: QueryProductsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;

    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
      ...(query.category && {
        category: { name: { equals: query.category, mode: 'insensitive' } },
      }),
      ...(query.brand && {
        brand: { equals: query.brand, mode: 'insensitive' },
      }),
      ...(query.search && {
        name: { contains: query.search, mode: 'insensitive' },
      }),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? {
            price: {
              ...(query.minPrice !== undefined && { gte: query.minPrice }),
              ...(query.maxPrice !== undefined && { lte: query.maxPrice }),
            },
          }
        : {}),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sort === 'price_asc'
        ? { price: 'asc' }
        : query.sort === 'price_desc'
          ? { price: 'desc' }
          : query.sort === 'newest'
            ? { createdAt: 'desc' }
            : { createdAt: 'desc' }; // "recommended" — no ranking signal yet, fall back to newest

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: PRODUCT_LIST_INCLUDE,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toListItem(row)),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: PRODUCT_DETAIL_INCLUDE,
    });

    if (!product) {
      throw new NotFoundException(`Product "${slug}" not found`);
    }

    return this.toDetail(product);
  }

  async listCategories() {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });

    return categories.map((category) => ({
      id: category.id.toString(),
      name: category.name,
      description: category.description,
      productCount: category._count.products,
    }));
  }

  private toListItem(row: ProductListRow) {
    const stock = this.stockLabel(row.inventory);
    const primaryImage = row.images[0];

    return {
      id: row.id.toString(),
      slug: row.slug,
      name: row.name,
      brand: row.brand,
      category: row.category.name,
      price: decimalToNumber(row.price),
      image: primaryImage
        ? { url: primaryImage.imageUrl, alt: row.name }
        : null,
      stockLabel: stock.label,
      inStock: stock.inStock,
    };
  }

  private toDetail(row: ProductDetailRow) {
    const stock = this.stockLabel(row.inventory);

    return {
      id: row.id.toString(),
      slug: row.slug,
      name: row.name,
      brand: row.brand,
      model: row.model,
      category: row.category.name,
      description: row.description,
      price: decimalToNumber(row.price),
      sku: row.sku,
      images: row.images.map((image) => ({
        url: image.imageUrl,
        alt: row.name,
        isPrimary: image.isPrimary,
      })),
      specs: row.specifications.map((spec) => ({
        label: spec.name,
        value: spec.value,
      })),
      stockLabel: stock.label,
      inStock: stock.inStock,
    };
  }

  private stockLabel(inventory: { quantity: number; reserved: number } | null) {
    if (!inventory) {
      return { label: 'Out of Stock', inStock: false };
    }

    const available = inventory.quantity - inventory.reserved;

    if (available <= 0) {
      return { label: 'Out of Stock', inStock: false };
    }

    if (available <= 5) {
      return { label: `Only ${available} left`, inStock: true };
    }

    return { label: 'In Stock', inStock: true };
  }
}
