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
  reviews: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.ProductInclude;

type ProductListRow = Prisma.ProductGetPayload<{ include: typeof PRODUCT_LIST_INCLUDE }>;
type ProductDetailRow = Prisma.ProductGetPayload<{
  include: typeof PRODUCT_DETAIL_INCLUDE;
}>;

/**
 * The statuses a customer is allowed to see.
 *
 * OUT_OF_STOCK is deliberately included: an admin setting it means "still
 * listed, just sold out", and the product should keep its place on the
 * storefront carrying the Out of Stock label that stockLabel() derives from
 * inventory, rather than silently vanishing. DISCONTINUED is the only status
 * that hides a product, which is exactly what AdminProductsService.archive sets.
 */
const CUSTOMER_VISIBLE_STATUSES: Prisma.ProductWhereInput['status'] = {
  in: ['ACTIVE', 'OUT_OF_STOCK'],
};

/**
 * Relation count restricted to the same statuses, so the "N products" figure
 * on a Browse tile matches what a customer actually finds after clicking it.
 * AdminProductsService keeps its own unfiltered counts, where "every product
 * ever attached to this row" is the correct answer.
 */
const CUSTOMER_VISIBLE_PRODUCT_COUNT = {
  products: { where: { status: CUSTOMER_VISIBLE_STATUSES } },
};

/**
 * Categories render in the curated `position` the storefront sets, not
 * alphabetically. `name` breaks ties so categories an admin adds later (which
 * all default to position 0) do not shuffle between requests.
 */
const CATEGORY_ORDER: Prisma.CategoryOrderByWithRelationInput[] = [
  { position: 'asc' },
  { name: 'asc' },
];

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: QueryProductsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;

    const where = this.buildWhere(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: PRODUCT_LIST_INCLUDE,
        orderBy: this.buildOrderBy(query.sort),
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
      facets: await this.buildFacets(),
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
      orderBy: CATEGORY_ORDER,
      include: { _count: { select: CUSTOMER_VISIBLE_PRODUCT_COUNT } },
    });

    return categories.map((category) => ({
      id: category.id.toString(),
      name: category.name,
      description: category.description,
      productCount: category._count.products,
    }));
  }

  private buildWhere(query: QueryProductsDto): Prisma.ProductWhereInput {
    return {
      status: CUSTOMER_VISIBLE_STATUSES,
      ...(query.category && {
        category: { name: { equals: query.category, mode: 'insensitive' } },
      }),
      ...(query.brand && {
        brand: { equals: query.brand, mode: 'insensitive' },
      }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
          { sku: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
      ...(query.featured !== undefined && { featured: query.featured }),
      // "On sale" is a compareAtPrice being set; whether it is actually a
      // reduction is left to the caller, which can see both numbers and can
      // sort by the resulting discount (Postgres would need a raw comparison).
      ...(query.onSale && { compareAtPrice: { not: null } }),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? {
            price: {
              ...(query.minPrice !== undefined && { gte: query.minPrice }),
              ...(query.maxPrice !== undefined && { lte: query.maxPrice }),
            },
          }
        : {}),
    };
  }

  /**
   * `onSale` needs a column-to-column comparison ("compareAtPrice above
   * price"), which Prisma cannot express, so that one condition is filtered in
   * Postgres through a raw fragment and the rest stays type-safe.
   */
  private buildOrderBy(
    sort: QueryProductsDto['sort'],
  ): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case 'price_asc':
        return [{ price: 'asc' }];
      case 'price_desc':
        return [{ price: 'desc' }];
      case 'newest':
        return [{ createdAt: 'desc' }];
      case 'rating':
        return [{ rating: 'desc' }, { reviewCount: 'desc' }];
      default:
        // "recommended": featured products first, then best rated, then newest.
        return [{ featured: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }];
    }
  }

  /**
   * Brands, categories and the price range, so the storefront filter bars do
   * not have to invent options or walk the whole product list to build them.
   */
  private async buildFacets() {
    const [brands, categories, range] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: { status: CUSTOMER_VISIBLE_STATUSES, brand: { not: null } },
        distinct: ['brand'],
        select: { brand: true },
        orderBy: { brand: 'asc' },
      }),
      this.prisma.category.findMany({
        orderBy: CATEGORY_ORDER,
        include: { _count: { select: CUSTOMER_VISIBLE_PRODUCT_COUNT } },
      }),
      this.prisma.product.aggregate({
        where: { status: CUSTOMER_VISIBLE_STATUSES },
        _min: { price: true },
        _max: { price: true },
      }),
    ]);

    return {
      brands: brands.flatMap((row) => (row.brand ? [row.brand] : [])),
      categories: categories.map((category) => ({
        id: category.id.toString(),
        name: category.name,
        description: category.description,
        productCount: category._count.products,
      })),
      priceRange: {
        min: range._min.price === null ? 0 : decimalToNumber(range._min.price),
        max: range._max.price === null ? 0 : decimalToNumber(range._max.price),
      },
    };
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
      compareAtPrice:
        row.compareAtPrice === null ? null : decimalToNumber(row.compareAtPrice),
      rating: row.rating === null ? null : decimalToNumber(row.rating),
      reviewCount: row.reviewCount,
      badge: row.badge,
      featured: row.featured,
      releasedAt: row.releasedAt,
      image: primaryImage
        ? { url: primaryImage.imageUrl, alt: row.name }
        : null,
      inStock: stock.inStock,
      stock: stock.quantity,
      stockLabel: stock.label,
    };
  }

  private toDetail(row: ProductDetailRow) {
    return {
      ...this.toListItem(row),
      model: row.model,
      sku: row.sku,
      description: row.description,
      highlights: row.highlights,
      images: row.images.map((image) => ({
        url: image.imageUrl,
        alt: row.name,
        isPrimary: image.isPrimary,
      })),
      specs: row.specifications.map((spec) => ({
        label: spec.name,
        value: spec.value,
      })),
      reviews: row.reviews.map((review) => ({
        id: review.id.toString(),
        author: review.author,
        role: review.role,
        rating: review.rating,
        quote: review.quote,
        product: row.name,
      })),
    };
  }

  private stockLabel(inventory: { quantity: number; reserved: number } | null) {
    if (!inventory) {
      return { label: 'Out of Stock', inStock: false, quantity: 0 };
    }

    const available = inventory.quantity - inventory.reserved;

    if (available <= 0) {
      return { label: 'Out of Stock', inStock: false, quantity: 0 };
    }

    if (available <= 5) {
      return { label: `Only ${available} left`, inStock: true, quantity: available };
    }

    return { label: 'In Stock', inStock: true, quantity: available };
  }
}
