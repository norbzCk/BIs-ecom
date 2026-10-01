/**
 * Wire types for the NestJS API. There is no mock catalog any more: every value
 * here came out of Postgres, so these mirror the mappers in
 * `src/products/products.service.ts` field for field.
 *
 * The API sends no response DTOs, so the mappers are the contract. Two rules
 * shape the nullability below and are worth keeping in mind when adding fields:
 * optional columns are mapped to an explicit `null` (never `undefined`), and
 * BigInt ids are stringified before serialisation.
 *
 * Admin responses are a different contract and are typed alongside the admin
 * pages, not here — see `pages/admin/AdminProductsPage.tsx`.
 */

/** The primary image as the list endpoint sends it. */
export interface ProductImage {
  url: string
  /** Always the product name: `product_images` has no alt column. */
  alt: string
}

/** Detail images carry the sort flag as well. */
export interface ProductDetailImage extends ProductImage {
  isPrimary: boolean
}

/** A `product_specifications` row, renamed `name` → `label` on the wire. */
export interface ProductSpec {
  label: string
  value: string
}

/** A curated review. `rating` here is the review's own score, not the product's. */
export interface Review {
  id: string
  author: string
  role: string | null
  rating: number
  quote: string
  /** Denormalised by the API so the review carries the product it belongs to. */
  product: string
}

export interface Category {
  id: string
  name: string
  description: string | null
  /** Counts every product in the category, not only the active ones. */
  productCount: number
}

/** The shape every product card, cart line and compare row is built from. */
export interface Product {
  id: string
  slug: string
  name: string
  brand: string | null
  /** The category *name*, not an id or an object — the payload flattens it. */
  category: string
  price: number
  /** Struck-through price, set only when the product is on sale. */
  compareAtPrice: number | null
  rating: number | null
  reviewCount: number
  badge: string | null
  featured: boolean
  /** ISO-8601, or null when the product has no release date. */
  releasedAt: string | null
  /** Primary image, or null when an admin has not uploaded one yet. */
  image: ProductImage | null
  inStock: boolean
  /** Sellable units: `quantity - reserved`, clamped to 0. Never negative. */
  stock: number
  /** Server-computed: 'In Stock', `Only n left` or 'Out of Stock'. */
  stockLabel: string
}

/** Adds the fields that only the product detail endpoint returns. */
export interface ProductDetail extends Product {
  model: string | null
  sku: string
  description: string | null
  highlights: string[]
  /** May be empty — nothing guarantees an image was ever uploaded. */
  images: ProductDetailImage[]
  specs: ProductSpec[]
  reviews: Review[]
}

/** Filter options the storefront builds its category and brand menus from. */
export interface CatalogFacets {
  brands: string[]
  categories: Category[]
  priceRange: { min: number; max: number }
}

/** The `GET /products` envelope. `totalPages` is at least 1 for an empty catalog. */
export interface ProductPage {
  items: Product[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  facets: CatalogFacets
}

export interface CartLine {
  productId: string
  quantity: number
}
