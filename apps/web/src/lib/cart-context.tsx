import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { productById } from '../data/products'
import type { CartLine, Product } from '../types'

/* -------------------------------------------------------------------------- */
/*  Promotional codes — a small, self-contained rule set.                      */
/* -------------------------------------------------------------------------- */

export interface Promo {
  code: string
  label: string
  /** Fraction of subtotal discounted, e.g. 0.1 for 10% off. */
  rate?: number
  /** Flat amount taken off the subtotal. */
  amount?: number
  waivesShipping: boolean
}

interface PromoRule {
  promo: Promo
  /** Minimum subtotal required, in shillings. 0 means always allowed. */
  minSubtotal: number
}

const PROMO_RULES: Record<string, PromoRule> = {
  BILLIONARE10: {
    promo: { code: 'BILLIONARE10', label: '10% off your order', rate: 0.1, waivesShipping: false },
    minSubtotal: 0,
  },
  WORKSTATION25: {
    promo: { code: 'WORKSTATION25', label: '25% off your order', rate: 0.25, waivesShipping: true },
    minSubtotal: 0,
  },
  BUILDER50: {
    promo: { code: 'BUILDER50', label: 'TSh 50,000 off your order', amount: 50_000, waivesShipping: false },
    minSubtotal: 500_000,
  },
  FREESHIP: {
    promo: { code: 'FREESHIP', label: 'Free insured shipping', waivesShipping: true },
    minSubtotal: 0,
  },
}

export const PROMO_HINT = 'Try BILLIONARE10, BUILDER50 or FREESHIP'

const STORAGE_KEY = 'billionare_cart_v1'

interface Persisted {
  lines: CartLine[]
  saved: CartLine[]
  wishlist: string[]
  promo: Promo | null
}

const EMPTY: Persisted = { lines: [], saved: [], wishlist: [], promo: null }

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<Persisted>
    return {
      lines: Array.isArray(parsed.lines) ? parsed.lines : [],
      saved: Array.isArray(parsed.saved) ? parsed.saved : [],
      wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist : [],
      promo: parsed.promo ?? null,
    }
  } catch {
    return EMPTY
  }
}

export const SHIPPING_THRESHOLD = 400_000
export const FLAT_SHIPPING = 35_000
export const TAX_RATE = 0.08

export interface HydratedLine {
  product: Product
  quantity: number
}

interface CartContextValue {
  lines: CartLine[]
  saved: CartLine[]
  wishlist: string[]
  cartProducts: HydratedLine[]
  savedProducts: HydratedLine[]
  itemCount: number
  savedCount: number
  subtotal: number
  promo: Promo | null
  discount: number
  shipping: number
  tax: number
  total: number
  /** Product most recently added, used to drive the fly-to-cart animation. */
  lastAddedId: string | null
  addItem: (productId: string, quantity?: number) => void
  removeItem: (productId: string) => void
  setQuantity: (productId: string, quantity: number) => void
  moveToSaved: (productId: string) => void
  moveToCart: (productId: string) => void
  removeSaved: (productId: string) => void
  applyPromo: (code: string, currentSubtotal?: number) => { ok: boolean; message: string }
  clearPromo: () => void
  toggleWishlist: (productId: string) => boolean
  isWishlisted: (productId: string) => boolean
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function resolveLines(lines: CartLine[]): HydratedLine[] {
  return lines.flatMap((line) => {
    const product = productById(line.productId)
    return product ? [{ product, quantity: line.quantity }] : []
  })
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(EMPTY)
  const [hydrated, setHydrated] = useState(false)
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)

  // Read from storage after mount so server/SSR and first paint never disagree.
  useEffect(() => {
    setState(load())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state, hydrated])

  const addItem = useCallback((productId: string, quantity = 1) => {
    setState((prev) => {
      const existing = prev.lines.find((l) => l.productId === productId)
      if (existing) {
        return {
          ...prev,
          lines: prev.lines.map((l) =>
            l.productId === productId ? { ...l, quantity: l.quantity + quantity } : l,
          ),
        }
      }
      return {
        ...prev,
        lines: [...prev.lines, { productId, quantity }],
        saved: prev.saved.filter((l) => l.productId !== productId),
      }
    })
    setLastAddedId(productId)
  }, [])

  const removeItem = useCallback((productId: string) => {
    setState((prev) => ({
      ...prev,
      lines: prev.lines.filter((l) => l.productId !== productId),
    }))
  }, [])

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setState((prev) => {
      if (quantity < 1) {
        return { ...prev, lines: prev.lines.filter((l) => l.productId !== productId) }
      }
      return {
        ...prev,
        lines: prev.lines.map((l) => (l.productId === productId ? { ...l, quantity } : l)),
      }
    })
  }, [])

  const moveToSaved = useCallback((productId: string) => {
    setState((prev) => {
      const line = prev.lines.find((l) => l.productId === productId)
      if (!line) return prev
      return {
        ...prev,
        lines: prev.lines.filter((l) => l.productId !== productId),
        saved: [...prev.saved.filter((l) => l.productId !== productId), line],
      }
    })
  }, [])

  const moveToCart = useCallback((productId: string) => {
    setState((prev) => {
      const line = prev.saved.find((l) => l.productId === productId)
      if (!line) return prev
      return {
        ...prev,
        saved: prev.saved.filter((l) => l.productId !== productId),
        lines: [...prev.lines, line],
      }
    })
    setLastAddedId(productId)
  }, [])

  const removeSaved = useCallback((productId: string) => {
    setState((prev) => ({
      ...prev,
      saved: prev.saved.filter((l) => l.productId !== productId),
    }))
  }, [])

  const applyPromo = useCallback((code: string, currentSubtotal = 0) => {
    const key = code.trim().toUpperCase()
    const rule = PROMO_RULES[key]

    if (!rule) {
      return { ok: false, message: `"${key}" is not a valid code. ${PROMO_HINT}.` }
    }
    if (currentSubtotal < rule.minSubtotal) {
      return {
        ok: false,
        message: `${key} needs a subtotal of $${rule.minSubtotal} or more.`,
      }
    }

    setState((prev) => ({ ...prev, promo: rule.promo }))
    return { ok: true, message: `${rule.promo.code} applied — ${rule.promo.label}.` }
  }, [])

  const clearPromo = useCallback(() => {
    setState((prev) => ({ ...prev, promo: null }))
  }, [])

  const toggleWishlist = useCallback((productId: string) => {
    let added = false
    setState((prev) => {
      const has = prev.wishlist.includes(productId)
      added = !has
      return {
        ...prev,
        wishlist: has
          ? prev.wishlist.filter((id) => id !== productId)
          : [...prev.wishlist, productId],
      }
    })
    return added
  }, [])

  const isWishlisted = useCallback(
    (productId: string) => state.wishlist.includes(productId),
    [state.wishlist],
  )

  const clearCart = useCallback(() => {
    setState((prev) => ({ ...prev, lines: [], promo: null }))
  }, [])

  const cartProducts = useMemo(() => resolveLines(state.lines), [state.lines])
  const savedProducts = useMemo(() => resolveLines(state.saved), [state.saved])
  const subtotal = useMemo(
    () => cartProducts.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0),
    [cartProducts],
  )

  const discount = useMemo(() => {
    if (!state.promo) return 0
    if (state.promo.amount) return Math.min(state.promo.amount, subtotal)
    return subtotal * (state.promo.rate ?? 0)
  }, [state.promo, subtotal])

  const shipping = useMemo(() => {
    if (subtotal === 0) return 0
    if (state.promo?.waivesShipping) return 0
    return subtotal >= SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING
  }, [subtotal, state.promo])

  const tax = useMemo(() => Math.max(0, subtotal - discount) * TAX_RATE, [subtotal, discount])
  const total = Math.max(0, subtotal - discount) + shipping + tax

  const value: CartContextValue = {
    lines: state.lines,
    saved: state.saved,
    wishlist: state.wishlist,
    cartProducts,
    savedProducts,
    itemCount: cartProducts.reduce((n, l) => n + l.quantity, 0),
    savedCount: savedProducts.reduce((n, l) => n + l.quantity, 0),
    subtotal,
    promo: state.promo,
    discount,
    shipping,
    tax,
    total,
    lastAddedId,
    addItem,
    removeItem,
    setQuantity,
    moveToSaved,
    moveToCart,
    removeSaved,
    applyPromo,
    clearPromo,
    toggleWishlist,
    isWishlisted,
    clearCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
