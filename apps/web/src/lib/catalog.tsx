import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ApiError, apiRequest } from './api-client'
import type { CatalogFacets, Category, Product, ProductDetail, Review } from '../types'

/* -------------------------------------------------------------------------- */
/*  API shapes                                                                 */
/* -------------------------------------------------------------------------- */

interface ProductPage {
  items: Product[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  facets: CatalogFacets
}

export type ProductQuery = {
  category?: string
  brand?: string
  search?: string
  minPrice?: number
  maxPrice?: number
  featured?: boolean
  onSale?: boolean
  sort?: 'recommended' | 'price_asc' | 'price_desc' | 'newest' | 'rating'
  page?: number
  pageSize?: number
}

const EMPTY_FACETS: CatalogFacets = { brands: [], categories: [], priceRange: { min: 0, max: 0 } }

/**
 * The storefront fetches a generous page rather than a handful per view: the
 * home, deals, compare and 404 pages all filter this same list client-side the
 * way the old mock catalog did, and a shop of this size comfortably fits in one
 * request. Anything past the first page is fetched in parallel.
 */
const CATALOG_PAGE_SIZE = 100

function toQueryString(query: ProductQuery): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  return params.toString()
}

export async function fetchCatalog(query: ProductQuery = {}): Promise<ProductPage> {
  const first = await apiRequest<ProductPage>(
    `/products?${toQueryString({ ...query, page: 1, pageSize: CATALOG_PAGE_SIZE })}`,
  )

  if (first.totalPages <= 1) return first

  const rest = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, index) =>
      apiRequest<ProductPage>(
        `/products?${toQueryString({ ...query, page: index + 2, pageSize: CATALOG_PAGE_SIZE })}`,
      ),
    ),
  )

  return { ...first, items: [first, ...rest].flatMap((page) => page.items) }
}

export async function fetchProduct(slug: string) {
  return apiRequest<ProductDetail>(`/products/${encodeURIComponent(slug)}`)
}

export async function fetchCategories() {
  return apiRequest<Category[]>('/categories')
}

/* -------------------------------------------------------------------------- */
/*  Derived views                                                              */
/* -------------------------------------------------------------------------- */

/** Percentage off, or null when the product is not marked down. */
export function discountPercent(product: Product): number | null {
  if (!product.compareAtPrice || product.compareAtPrice <= product.price) return null
  return Math.round((1 - product.price / product.compareAtPrice) * 100)
}

export function isNew(product: Product): boolean {
  if (!product.releasedAt) return false
  const released = new Date(product.releasedAt).getTime()
  const thirtyDays = 30 * 24 * 60 * 60 * 1000
  return Date.now() - released < thirtyDays
}

/* -------------------------------------------------------------------------- */
/*  Context                                                                    */
/* -------------------------------------------------------------------------- */

interface CatalogValue {
  products: Product[]
  categories: Category[]
  brands: string[]
  priceRange: { min: number; max: number }
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  productById: (id: string) => Product | undefined
  productBySlug: (slug: string) => Product | undefined
  productsInCategory: (category: string) => Product[]
  featuredProducts: () => Product[]
  dealProducts: () => { product: Product; off: number }[]
  relatedProducts: (product: Product, limit?: number) => Product[]
}

const CatalogContext = createContext<CatalogValue | null>(null)

/**
 * Loads the whole active catalog once and shares it. Every storefront page reads
 * products from here rather than fetching its own, so switching pages never
 * re-requests and a product added in the admin appears after one refresh.
 */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [facets, setFacets] = useState<CatalogFacets>(EMPTY_FACETS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const page = await fetchCatalog({ sort: 'recommended' })
      setProducts(page.items)
      setFacets(page.facets)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the catalog')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo<CatalogValue>(() => {
    const byId = new Map(products.map((product) => [product.id, product]))
    const bySlug = new Map(products.map((product) => [product.slug, product]))

    return {
      products,
      categories: facets.categories,
      brands: facets.brands,
      priceRange: facets.priceRange,
      loading,
      error,
      refresh,
      productById: (id) => byId.get(id),
      productBySlug: (slug) => bySlug.get(slug),
      productsInCategory: (category) =>
        products.filter((product) => product.category === category),
      featuredProducts: () => products.filter((product) => product.featured),
      dealProducts: () =>
        products
          .map((product) => ({ product, off: discountPercent(product) ?? 0 }))
          .filter((deal) => deal.off > 0)
          .sort((a, b) => b.off - a.off),
      /** Same category first, then anything else, never the product itself. */
      relatedProducts: (product, limit = 4) => {
        const others = products.filter((candidate) => candidate.id !== product.id)
        const sameCategory = others.filter((candidate) => candidate.category === product.category)
        const rest = others.filter((candidate) => candidate.category !== product.category)
        return [...sameCategory, ...rest].slice(0, limit)
      },
    }
  }, [products, facets, loading, error, refresh])

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog(): CatalogValue {
  const value = useContext(CatalogContext)
  if (!value) throw new Error('useCatalog must be used inside <CatalogProvider>')
  return value
}

/**
 * Product detail is deliberately not served from the shared catalog list: the
 * list endpoint omits specs, highlights and reviews, which would otherwise have
 * to be fattened for every card on every page.
 */
export function useProduct(slug: string | undefined) {
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) {
      setProduct(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchProduct(slug)
      .then((detail) => {
        if (cancelled) return
        setProduct(detail)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setProduct(null)
        setError(err instanceof ApiError && err.status === 404 ? 'not-found' : 'failed')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  return { product, loading, error }
}

export function useProductDetails(slug: string | null | undefined) {
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<'not-found' | 'failed' | null>(null)

  useEffect(() => {
    if (!slug) {
      setProduct(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchProduct(slug)
      .then((detail) => {
        if (cancelled) return
        setProduct(detail)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setProduct(null)
        setError(err instanceof ApiError && err.status === 404 ? 'not-found' : 'failed')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  return { product, loading, error }
}

/**
 * Review feed for the storefront. Reviews live on the product detail endpoint,
 * so this pulls a handful of the most-reviewed products and flattens what they
 * carry. Products without reviews are skipped, and an empty catalog simply
 * yields an empty feed rather than a loading state that never resolves.
 */
export function useRecentReviews(limit = 6) {
  const { products } = useCatalog()
  const [reviews, setReviews] = useState<Review[]>([])

  const wanted = useMemo(
    () =>
      products
        .filter((p) => p.reviewCount > 0)
        .sort((a, b) => b.reviewCount - a.reviewCount)
        .slice(0, 4)
        .map((p) => p.slug)
        .join(','),
    [products],
  )

  useEffect(() => {
    if (!wanted) {
      setReviews([])
      return
    }

    let cancelled = false
    Promise.all(wanted.split(',').map((slug) => fetchProduct(slug).catch(() => null)))
      .then((details) => {
        if (cancelled) return
        setReviews(
          details
            .flatMap((detail) => detail?.reviews ?? [])
            .sort((a, b) => b.rating - a.rating || a.author.localeCompare(b.author))
            .slice(0, limit),
        )
      })
      .catch(() => {
        if (!cancelled) setReviews([])
      })

    return () => {
      cancelled = true
    }
  }, [wanted, limit])

  return reviews
}

/**
 * Compare needs the spec sheets, which only the detail endpoint returns, so this
 * resolves the summary products to their full versions. A product that 404s
 * mid-request (deleted while comparing) simply drops out of the result.
 */
export function useProductDetailsList(slugs: string[]): ProductDetail[] {
  const key = slugs.join(',')
  const [details, setDetails] = useState<ProductDetail[]>([])

  useEffect(() => {
    if (!key) {
      setDetails([])
      return
    }

    let cancelled = false
    setDetails([])
    Promise.all(key.split(',').map((slug) => fetchProduct(slug).catch(() => null)))
      .then((resolved) => {
        if (cancelled) return
        setDetails(resolved.filter((d): d is ProductDetail => d !== null))
      })
      .catch(() => {
        if (!cancelled) setDetails([])
      })

    return () => {
      cancelled = true
    }
  }, [key])

  return details
}
