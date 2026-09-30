import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useCatalog } from './catalog'
import { useAccount } from './account-context'
import { apiRequest, ApiError } from './api-client'
import { useToast } from './motion/toast'
import type { CartLine, Product } from '../types'

/* -------------------------------------------------------------------------- */
/*  Totals                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Display-only estimates that mirror FREE_SHIPPING_THRESHOLD,
 * STANDARD_SHIPPING_FEE and TAX_RATE in src/orders/orders.service.ts. The
 * server recomputes all three at checkout, so these are for the cart summary
 * only — the order confirmation always shows the server's numbers.
 */
export const SHIPPING_THRESHOLD = 400_000
export const FLAT_SHIPPING = 35_000
export const TAX_RATE = 0.08

const STORAGE_KEY = 'billionare_cart_v1'

/**
 * Wishlist and saved-for-later are per-browser conveniences; only the cart
 * itself lives on the server, so those stay in localStorage.
 */
interface Persisted {
  saved: CartLine[]
  wishlist: string[]
}

const EMPTY: Persisted = { saved: [], wishlist: [] }

function load(): Persisted {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') as Partial<Persisted>
    return {
      saved: Array.isArray(parsed.saved) ? parsed.saved : [],
      wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist : [],
    }
  } catch {
    return EMPTY
  }
}

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
  shipping: number
  tax: number
  total: number
  /** False while a signed-in cart is being read from the API. */
  syncing: boolean
  /** Product most recently added, used to drive the fly-to-cart animation. */
  lastAddedId: string | null
  /** Every mutation resolves to whether the change landed; none ever reject. */
  addItem: (productId: string, quantity?: number) => Promise<boolean>
  removeItem: (productId: string) => Promise<boolean>
  setQuantity: (productId: string, quantity: number) => Promise<boolean>
  moveToSaved: (productId: string) => Promise<boolean>
  moveToCart: (productId: string) => Promise<boolean>
  removeSaved: (productId: string) => void
  toggleWishlist: (productId: string) => boolean
  isWishlisted: (productId: string) => boolean
  clearCart: () => Promise<boolean>
}

const CartContext = createContext<CartContextValue | null>(null)

/**
 * A line whose product has since been discontinued (or removed by an admin)
 * drops out of the cart rather than rendering a broken row.
 */
function resolveLines(
  lines: CartLine[],
  productById: (id: string) => Product | undefined,
): HydratedLine[] {
  return lines.flatMap((line) => {
    const product = productById(line.productId)
    return product ? [{ product, quantity: line.quantity }] : []
  })
}

/** A guest cart lives in localStorage, because the API only serves signed-in users. */
const GUEST_KEY = 'billionare_cart_guest_v1'

function loadGuest(): CartLine[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(GUEST_KEY) ?? '') as Partial<{ lines: CartLine[] }>
    return Array.isArray(parsed.lines) ? parsed.lines : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { productById } = useCatalog()
  const { token } = useAccount()
  const { push } = useToast()

  const [state, setState] = useState<Persisted>(EMPTY)
  const [guestLines, setGuestLines] = useState<CartLine[]>([])
  const [serverLines, setServerLines] = useState<CartLine[] | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)

  // Read from storage after mount so server/SSR and first paint never disagree.
  useEffect(() => {
    setState(load())
    setGuestLines(loadGuest())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(GUEST_KEY, JSON.stringify({ lines: guestLines }))
  }, [guestLines, hydrated])

  // serverLines is null until the first fetch resolves, so memoise the empty
  // fallback too — otherwise every render would mint a new array and force the
  // memoised totals and callbacks below to recompute.
  const EMPTY_LINES: CartLine[] = useMemo(() => [], [])
  const lines = token ? (serverLines ?? EMPTY_LINES) : guestLines

  /** Push whatever a guest had picked up into the freshly authenticated cart. */
  const mergeGuestIntoServer = useCallback(
    async (authToken: string) => {
      const pending = loadGuest()
      if (pending.length === 0) return

      for (const line of pending) {
        await apiRequest('/cart/items', {
          method: 'POST',
          token: authToken,
          body: { productId: line.productId, quantity: line.quantity },
        }).catch(() => {
          // A discontinued product or an out-of-stock line must not block the
          // rest of the merge, and the server cart is re-read afterwards
          // anyway, so the failure is safe to swallow here.
        })
      }
      localStorage.removeItem(GUEST_KEY)
      setGuestLines([])
    },
    [],
  )

  /**
   * Runs one server-side cart write. Every mutation goes through here so that:
   *   - a failure always produces a toast instead of a silent no-op,
   *   - the promise never rejects, because most call sites are click handlers
   *     that fire and forget and would otherwise leak an unhandled rejection
   *     while still showing a success toast.
   * Returns whether the write landed, so callers can defer their own
   * confirmation until they know it worked.
   */
  const run = useCallback(
    async (action: () => Promise<void>, what: string): Promise<boolean> => {
      setSyncing(true)
      try {
        await action()
        return true
      } catch (err) {
        push({
          tone: 'error',
          title: `Could not update your cart`,
          description:
            err instanceof ApiError && err.status === 401
              ? 'Your session expired. Sign in again to retry.'
              : `${what}. Please try again.`,
        })
        return false
      } finally {
        setSyncing(false)
      }
    },
    [push],
  )

  const refresh = useCallback(async (authToken: string) => {
    const cart = await apiRequest<{ items: { productId: string; quantity: number }[] }>('/cart', {
      token: authToken,
    })
    setServerLines(
      cart.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    )
  }, [])

  useEffect(() => {
    if (!hydrated) return

    if (!token) {
      // Drop the server cart from view; the guest cart takes over.
      setServerLines(null)
      setSyncing(false)
      return
    }

    let cancelled = false
    setSyncing(true)
    ;(async () => {
      try {
        await mergeGuestIntoServer(token)
        if (!cancelled) await refresh(token)
      } catch {
        // Leave the cart empty rather than showing a stale guest cart against a
        // signed-in session.
        if (!cancelled) setServerLines([])
      } finally {
        if (!cancelled) setSyncing(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token, hydrated, mergeGuestIntoServer, refresh])

  const addItem = useCallback(
    async (productId: string, quantity = 1): Promise<boolean> => {
      if (token) {
        const ok = await run(async () => {
          await apiRequest('/cart/items', {
            method: 'POST',
            token,
            body: { productId, quantity },
          })
          await refresh(token)
        }, 'Adding that item failed')
        if (!ok) return false
      } else {
        setGuestLines((prev) => {
          const existing = prev.find((l) => l.productId === productId)
          if (existing) {
            return prev.map((l) =>
              l.productId === productId ? { ...l, quantity: l.quantity + quantity } : l,
            )
          }
          return [...prev, { productId, quantity }]
        })
      }

      setState((prev) => ({
        ...prev,
        saved: prev.saved.filter((l) => l.productId !== productId),
      }))
      setLastAddedId(productId)
      return true
    },
    [token, refresh, run],
  )

  const removeItem = useCallback(
    async (productId: string): Promise<boolean> => {
      if (token) {
        return run(async () => {
          await apiRequest(`/cart/items/${productId}`, { method: 'DELETE', token })
          await refresh(token)
        }, 'Removing that item failed')
      }
      setGuestLines((prev) => prev.filter((l) => l.productId !== productId))
      return true
    },
    [token, refresh, run],
  )

  const setQuantity = useCallback(
    async (productId: string, quantity: number): Promise<boolean> => {
      if (quantity < 1) return removeItem(productId)

      if (token) {
        return run(async () => {
          await apiRequest(`/cart/items/${productId}`, {
            method: 'PATCH',
            token,
            body: { quantity },
          })
          await refresh(token)
        }, 'Changing the quantity failed')
      }
      setGuestLines((prev) =>
        prev.map((l) => (l.productId === productId ? { ...l, quantity } : l)),
      )
      return true
    },
    [token, refresh, removeItem, run],
  )

  const moveToSaved = useCallback(
    async (productId: string): Promise<boolean> => {
      const line = lines.find((l) => l.productId === productId)
      if (!(await removeItem(productId))) return false
      setState((prev) =>
        prev.saved.some((l) => l.productId === productId)
          ? prev
          : { ...prev, saved: [...prev.saved, { productId, quantity: line?.quantity ?? 1 }] },
      )
      return true
    },
    [lines, removeItem],
  )

  const moveToCart = useCallback(
    async (productId: string): Promise<boolean> => {
      const line = state.saved.find((l) => l.productId === productId)
      if (!(await addItem(productId, line?.quantity ?? 1))) return false
      setState((prev) => ({
        ...prev,
        saved: prev.saved.filter((l) => l.productId !== productId),
      }))
      setLastAddedId(productId)
      return true
    },
    [state.saved, addItem],
  )

  const removeSaved = useCallback((productId: string) => {
    setState((prev) => ({ ...prev, saved: prev.saved.filter((l) => l.productId !== productId) }))
  }, [])

  const toggleWishlist = useCallback(
    (productId: string) => {
      // Read the list synchronously instead of deriving it inside the
      // setState updater: React is free to defer that updater until the next
      // render, so `added` would still be false when we return. Callers use
      // this value to decide whether the toast says "Saved" or "Removed".
      const has = state.wishlist.includes(productId)
      setState((prev) => ({
        ...prev,
        wishlist: has
          ? prev.wishlist.filter((id) => id !== productId)
          : [...prev.wishlist, productId],
      }))
      return !has
    },
    [state.wishlist],
  )

  const isWishlisted = useCallback(
    (productId: string) => state.wishlist.includes(productId),
    [state.wishlist],
  )

  const clearCart = useCallback(async (): Promise<boolean> => {
    if (token) {
      return run(async () => {
        await apiRequest('/cart', { method: 'DELETE', token })
        await refresh(token)
      }, 'Emptying your cart failed')
    }
    setGuestLines([])
    return true
  }, [token, refresh, run])

  const cartProducts = useMemo(
    () => resolveLines(lines, productById),
    [lines, productById],
  )
  const savedProducts = useMemo(
    () => resolveLines(state.saved, productById),
    [state.saved, productById],
  )
  const subtotal = useMemo(
    () => cartProducts.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0),
    [cartProducts],
  )

  const shipping = useMemo(
    () => (subtotal === 0 || subtotal > SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING),
    [subtotal],
  )

  const tax = useMemo(() => subtotal * TAX_RATE, [subtotal])
  const total = subtotal + shipping + tax

  const value: CartContextValue = {
    lines,
    saved: state.saved,
    wishlist: state.wishlist,
    cartProducts,
    savedProducts,
    itemCount: cartProducts.reduce((n, l) => n + l.quantity, 0),
    savedCount: savedProducts.reduce((n, l) => n + l.quantity, 0),
    subtotal,
    shipping,
    tax,
    total,
    syncing,
    lastAddedId,
    addItem,
    removeItem,
    setQuantity,
    moveToSaved,
    moveToCart,
    removeSaved,
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
