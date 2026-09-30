/**
 * Mirrors the payloads the NestJS API returns (see src/products/products.service.ts
 * and src/admin/admin-products.service.ts). There is no mock catalog any more:
 * every Product here came out of Postgres.
 */

export interface ProductImage {
  url: string
  alt: string
  isPrimary?: boolean
}

export interface ProductSpec {
  label: string
  value: string
}

export interface Review {
  id: string
  author: string
  role?: string | null
  rating: number
  quote: string
  /** Denormalised by the API so the review carries the product it belongs to. */
  product: string
}

export interface Category {
  id: string
  name: string
  description: string | null
  productCount: number
}

/** The shape every product card, cart line and compare row is built from. */
export interface Product {
  id: string
  slug: string
  name: string
  brand: string | null
  category: string
  price: number
  /** Struck-through price, set only when the product is on sale. */
  compareAtPrice: number | null
  rating: number | null
  reviewCount: number
  badge: string | null
  featured: boolean
  releasedAt: string | null
  /** Primary image, or null when an admin has not uploaded one yet. */
  image: ProductImage | null
  inStock: boolean
  stock: number
  stockLabel: string
}

/** Adds the fields that only the product detail endpoint returns. */
export interface ProductDetail extends Product {
  model: string | null
  sku: string
  description: string | null
  highlights: string[]
  images: ProductImage[]
  specs: ProductSpec[]
  reviews: Review[]
}

/** Filter options the storefront builds its category and brand menus from. */
export interface CatalogFacets {
  brands: string[]
  categories: Category[]
  priceRange: { min: number; max: number }
}

export interface CartLine {
  productId: string
  quantity: number
}
