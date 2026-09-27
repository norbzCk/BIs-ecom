export interface ProductImage {
  url: string
  alt: string
}

export interface ProductSpec {
  label: string
  value: string
}

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
