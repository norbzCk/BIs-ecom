import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiRequest } from './api-client'

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface Address {
  id: string
  label: string
  name: string
  street: string
  city: string
  state: string
  zip: string
  isDefault: boolean
}

/** Mirrors OrderStatus in prisma/schema.prisma. */
export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'

export interface OrderItem {
  productId: string
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  createdAt: string
  subtotal: number
  shippingFee: number
  tax: number
  total: number
  shippingAddress: {
    fullName: string
    phone: string
    street: string
    city: string
    region: string
    country: string
    postalCode: string | null
  }
  payment: { method: string; status: string } | null
  items: OrderItem[]
}

export interface Profile {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: 'CUSTOMER' | 'ADMIN'
  memberSince: string
}

const STORAGE_KEY = 'billionare_account_v1'

/** Shape of the payload the auth endpoints return alongside the access token. */
interface AuthUser {
  userId: string
  email: string
  firstName: string
  lastName: string
  phone?: string | null
  role: 'CUSTOMER' | 'ADMIN'
  createdAt: string
}

/**
 * Only the token and the browser-local conveniences are persisted. Orders come
 * from the API on every load, and the profile is derived from the access token
 * so it can never drift from the server's view of the user.
 */
interface UserBag {
  addresses: Address[]
}

interface Persisted {
  token: string | null
  /** The user the token belongs to; kept so a reload shows the account immediately. */
  user: AuthUser | null
  /**
   * Saved addresses are a browser convenience, not server data, so they are
   * filed under the user they belong to. A shared list would hand the previous
   * account's address book to whoever signs in next on the same browser.
   */
  byUser: Record<string, UserBag>
}

const EMPTY: Persisted = {
  token: null,
  user: null,
  byUser: {},
}

/** The bag for the signed-in user; an anonymous visitor always gets a fresh one. */
function bagOf(state: Persisted): UserBag {
  const id = state.user?.userId
  if (!id) return { addresses: [] }
  return state.byUser[id] ?? { addresses: [] }
}

/** Writes `next` into the current user's bag, leaving other users untouched. */
function withBag(state: Persisted, next: UserBag): Persisted {
  const id = state.user?.userId
  if (!id) return state
  return { ...state, byUser: { ...state.byUser, [id]: next } }
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<Persisted>) }
  } catch {
    return EMPTY
  }
}

interface AccountContextValue {
  profile: Profile | null
  signedIn: boolean
  token: string | null
  addresses: Address[]
  orders: Order[]
  ordersLoading: boolean
  totalSpent: number
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: {
    firstName: string
    lastName: string
    email: string
    password: string
    phone?: string
  }) => Promise<void>
  signOut: () => void
  addAddress: (address: Omit<Address, 'id' | 'isDefault'>) => void
  updateAddress: (id: string, patch: Partial<Omit<Address, 'id'>>) => void
  removeAddress: (id: string) => void
  makeDefaultAddress: (id: string) => void
}

const AccountContext = createContext<AccountContextValue | null>(null)

export function AccountProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(EMPTY)
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setState(load())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state, hydrated])

  /* ---------------------------------------------------------------------- */
  /*  Auth — the access token is the only source of truth. No offline or   */
  /*  invented session: if the API says no, the visitor stays signed out.   */
  /* ---------------------------------------------------------------------- */

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await apiRequest<{ accessToken: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    setState((prev) => ({ ...prev, token: res.accessToken, user: res.user }))
  }, [])

  const signUp = useCallback(
    async (input: {
      firstName: string
      lastName: string
      email: string
      password: string
      phone?: string
    }) => {
      const res = await apiRequest<{ accessToken: string; user: AuthUser }>('/auth/register', {
        method: 'POST',
        body: input,
      })
      setState((prev) => ({ ...prev, token: res.accessToken, user: res.user }))
    },
    [],
  )

  const signOut = useCallback(() => {
    setState((prev) => ({ ...prev, token: null, user: null }))
  }, [])

  /* ---------------------------------------------------------------------- */
  /*  Orders — always read from the API, never cached in the browser.       */
  /* ---------------------------------------------------------------------- */

  const { token } = state

  useEffect(() => {
    if (!token) {
      setOrders([])
      setOrdersLoading(false)
      return
    }

    let cancelled = false
    setOrdersLoading(true)

    // The list endpoint only returns summaries, so each order is fetched for
    // the details the account page renders.
    apiRequest<{ id: string }[]>('/orders', { token })
      .then(async (summaries) => {
        const details = await Promise.all(
          summaries.map((summary) =>
            apiRequest<Order>(`/orders/${summary.id}`, { token }).catch(() => null),
          ),
        )
        if (!cancelled) setOrders(details.filter((o): o is Order => o !== null))
      })
      .catch(() => {
        if (!cancelled) setOrders([])
      })
      .finally(() => {
        if (!cancelled) setOrdersLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  /* ---------------------------------------------------------------------- */
  /*  Addresses & payment methods                                           */
  /* ---------------------------------------------------------------------- */

  const addAddress = useCallback((address: Omit<Address, 'id' | 'isDefault'>) => {
    setState((prev) => {
      const bag = bagOf(prev)
      return withBag(prev, {
        addresses: [
          ...bag.addresses,
          {
            ...address,
            id: `addr-${Date.now().toString(36)}`,
            isDefault: bag.addresses.length === 0,
          },
        ],
      })
    })
  }, [])

  const updateAddress = useCallback((id: string, patch: Partial<Omit<Address, 'id'>>) => {
    setState((prev) => {
      const bag = bagOf(prev)
      return withBag(prev, {
        addresses: bag.addresses.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      })
    })
  }, [])

  const removeAddress = useCallback((id: string) => {
    setState((prev) => {
      const bag = bagOf(prev)
      const remaining = bag.addresses.filter((a) => a.id !== id)
      return withBag(prev, {
        // Never leave the account without a default to preselect at checkout.
        addresses:
          remaining.length && !remaining.some((a) => a.isDefault)
            ? remaining.map((a, i) => ({ ...a, isDefault: i === 0 }))
            : remaining,
      })
    })
  }, [])

  const makeDefaultAddress = useCallback((id: string) => {
    setState((prev) => {
      const bag = bagOf(prev)
      return withBag(prev, {
        addresses: bag.addresses.map((a) => ({ ...a, isDefault: a.id === id })),
      })
    })
  }, [])

  const addressesForUser = useMemo(() => bagOf(state).addresses, [state])

  const profile: Profile | null = useMemo(() => {
    const user = state.user
    if (!user) return null
    return {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone ?? '',
      role: user.role,
      memberSince: new Date(user.createdAt).toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
      }),
    }
  }, [state.user])

  const totalSpent = useMemo(() => orders.reduce((sum, o) => sum + o.total, 0), [orders])

  const value: AccountContextValue = {
    profile,
    signedIn: state.token !== null,
    token: state.token,
    addresses: addressesForUser,
    orders,
    ordersLoading,
    totalSpent,
    signIn,
    signUp,
    signOut,
    addAddress,
    updateAddress,
    removeAddress,
    makeDefaultAddress,
  }

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount must be used within an AccountProvider')
  return ctx
}

