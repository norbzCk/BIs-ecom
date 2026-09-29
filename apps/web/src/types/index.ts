export interface ProductImage {
  url: string
  alt: string
}

export interface ProductSpec {
  label: string
  value: string
}

export type ArtKind = 'laptop' | 'monitor' | 'keyboard' | 'mouse' | 'headset' | 'dock' | 'gpu'

export interface Product {
  id: string
  slug: string
  name: string
  brand: string
  category: string
  price: number
  compareAtPrice?: number
  rating: number
  reviewCount: number
  badge?: string
  stockLabel?: string
  images: ProductImage[]
  specs: ProductSpec[]
  description?: string
  /** Drives the generated product artwork (see ProductVisual). */
  art: ArtKind
  /** Base hue (0-360) used to tint the generated artwork and card glow. */
  hue: number
  /** Units on hand — drives low-stock urgency and filtering. */
  stock: number
  highlights: string[]
  featured?: boolean
  isNew?: boolean
  /** Short marketing line shown in listings and cart lines. */
  tagline?: string
  /** Condition label, e.g. "Open box" or "Refurbished". */
  condition?: string
  /** Editorial score used to rank the "bestsellers" band on the deals page. */
  popularity?: number
  releasedOn: string
  shipsIn: string
}

export interface CartLine {
  productId: string
  quantity: number
}

export interface Review {
  id: string
  author: string
  role?: string
  rating: number
  quote: string
  product: string
}

export interface Testimonial extends Review {}
