import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiRequest, ApiError } from './api-client'

/** Loyalty accrues per TSh 1,000 spent — see the tier copy on the account page. */
const POINTS_PER_SHILLING = 1_000

function earnPoints(total: number) {
  return Math.floor(total / POINTS_PER_SHILLING)
}

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

export interface PaymentMethod {
  id: string
  brand: string
  last4: string
  expiry: string
  isDefault: boolean
}

export type OrderStatus = 'PROCESSING' | 'PACKED' | 'SHIPPED' | 'DELIVERED'

export interface OrderItem {
  productId: string
  name: string
  quantity: number
  price: number
}

export interface Order {
  id: string
  code: string
  placedOn: string
  status: OrderStatus
  speed: 'express' | 'standard'
  items: OrderItem[]
  subtotal: number
  discount: number
  shipping: number
  tax: number
  total: number
  address: Omit<Address, 'id' | 'isDefault'>
  cardLast4: string
  email: string
  notes?: string
}

export interface Profile {
  firstName: string
  lastName: string
  email: string
  phone: string
  memberSince: string
  tier: string
  points: number
  storeCredit: number
  /** True when the customer record lives only in this browser. */
  local: boolean
}

const STORAGE_KEY = 'billionare_account_v1'

interface Persisted {
  profile: Profile | null
  token: string | null
  addresses: Address[]
  payments: PaymentMethod[]
  orders: Order[]
}

const SEED_ADDRESSES: Address[] = [
  {
    id: 'addr-1',
    label: 'Home',
    name: 'Sarah Mwakalinga',
    street: '14 Samora Avenue, Msasani Ridge',
    city: 'Dar es Salaam',
    state: 'Dar es Salaam',
    zip: '14108',
    isDefault: true,
  },
]

const SEED_PAYMENTS: PaymentMethod[] = [
  {
    id: 'card-1',
    brand: 'Visa',
    last4: '4812',
    expiry: '08 / 29',
    isDefault: true,
  },
]

const SEED_ORDERS: Order[] = [
  {
    id: 'ord-1',
    code: 'NB-92841-X',
    placedOn: 'Oct 24, 2026',
    status: 'SHIPPED',
    speed: 'express',
    items: [
      {
        productId: 'p-apex-15-pro',
        name: 'Billionare Apex-15 Pro',
        quantity: 1,
        price: 4_590_000,
      },
      {
        productId: 'p-glide-x',
        name: 'BillionareGlide X Wireless Mouse',
        quantity: 1,
        price: 213_000,
      },
    ],
    subtotal: 4_803_000,
    discount: 0,
    shipping: 0,
    tax: 384_240,
    total: 5_187_240,
    address: {
      label: 'Home',
      name: 'Sarah Mwakalinga',
      street: '14 Samora Avenue, Msasani Ridge',
      city: 'Dar es Salaam',
      state: 'Dar es Salaam',
      zip: '14108',
    },
    cardLast4: '4812',
    email: 'sarah@archtech.co.tz',
  },
  {
    id: 'ord-2',
    code: 'NB-84201-M',
    placedOn: 'Aug 12, 2026',
    status: 'DELIVERED',
    speed: 'standard',
    items: [
      {
        productId: 'p-view-34',
        name: 'BillionareView 34" UltraWide Curved Monitor',
        quantity: 1,
        price: 1_482_000,
      },
    ],
    subtotal: 1_482_000,
    discount: 0,
    shipping: 0,
    tax: 118_560,
    total: 1_600_560,
    address: {
      label: 'Home',
      name: 'Sarah Mwakalinga',
      street: '14 Samora Avenue, Msasani Ridge',
      city: 'Dar es Salaam',
      state: 'Dar es Salaam',
      zip: '14108',
    },
    cardLast4: '4812',
    email: 'sarah@archtech.co.tz',
  },
]

const EMPTY: Persisted = {
  profile: null,
  token: null,
  addresses: SEED_ADDRESSES,
  payments: SEED_PAYMENTS,
  orders: SEED_ORDERS,
}

/** A signed-out visitor still gets the seeded demo workspace to explore. */
const GUEST_PROFILE: Profile = {
  firstName: 'Sarah',
  lastName: 'Mwakalinga',
  email: 'sarah@archtech.co.tz',
  phone: '+255 754 000 142',
  memberSince: 'March 2024',
  tier: 'Professional',
  points: 4_800,
  storeCredit: 68_000,
  local: true,
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

export interface PlaceOrderInput {
  email: string
  address: Omit<Address, 'id' | 'isDefault'>
  cardLast4: string
  speed: 'express' | 'standard'
  notes?: string
  items: OrderItem[]
  subtotal: number
  discount: number
  shipping: number
  tax: number
  total: number
}

interface AccountContextValue {
  profile: Profile
  signedIn: boolean
  token: string | null
  addresses: Address[]
  payments: PaymentMethod[]
  orders: Order[]
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
  placeOrder: (input: PlaceOrderInput) => Order
  cancelOrder: (id: string) => void
  addAddress: (address: Omit<Address, 'id' | 'isDefault'>) => void
  updateAddress: (id: string, patch: Partial<Omit<Address, 'id'>>) => void
  removeAddress: (id: string) => void
  makeDefaultAddress: (id: string) => void
  addPayment: (method: Omit<PaymentMethod, 'id' | 'isDefault'>) => void
  removePayment: (id: string) => void
  makeDefaultPayment: (id: string) => void
  redeemPoints: () => number
}

const AccountContext = createContext<AccountContextValue | null>(null)

const orderCode = () =>
  `NB-${Math.floor(10000 + Math.random() * 89999)}-${Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase()}`

const friendlyDate = () =>
  new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

export function AccountProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(EMPTY)
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
  /*  Auth — talks to the real API, and degrades to a local profile when    */
  /*  the backend is not reachable, so the storefront never dead-ends.      */
  /* ---------------------------------------------------------------------- */

  const applyRemoteUser = (
    user: { firstName: string; lastName: string; email: string; phone?: string | null },
    accessToken: string,
  ) => {
    setState((prev) => ({
      ...prev,
      token: accessToken,
      profile: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone ?? prev.profile?.phone ?? '',
        memberSince: 'Just now',
        tier: 'Member',
        points: prev.profile?.points ?? 0,
        storeCredit: prev.profile?.storeCredit ?? 0,
        local: false,
      },
    }))
  }

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const res = await apiRequest<{ accessToken: string; user: Parameters<typeof applyRemoteUser>[0] }>(
        '/auth/login',
        { method: 'POST', body: { email, password } },
      )
      applyRemoteUser(res.user, res.accessToken)
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) throw err
      // Backend unreachable: accept locally so the demo stays explorable.
      setState((prev) => ({
        ...prev,
        token: null,
        profile: { ...GUEST_PROFILE, email: email || GUEST_PROFILE.email, local: true },
      }))
    }
  }, [])

  const signUp = useCallback(
    async (input: {
      firstName: string
      lastName: string
      email: string
      password: string
      phone?: string
    }) => {
      try {
        const res = await apiRequest<{
          accessToken: string
          user: Parameters<typeof applyRemoteUser>[0]
        }>('/auth/register', { method: 'POST', body: input })
        applyRemoteUser(res.user, res.accessToken)
      } catch (err) {
        if (err instanceof ApiError && err.status >= 400 && err.status < 500) throw err
        setState((prev) => ({
          ...prev,
          token: null,
          profile: {
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phone: input.phone ?? '',
            memberSince: friendlyDate(),
            tier: 'Member',
            points: 0,
            storeCredit: 0,
            local: true,
          },
        }))
      }
    },
    [],
  )

  const signOut = useCallback(() => {
    setState((prev) => ({ ...prev, token: null, profile: null }))
  }, [])

  /* ---------------------------------------------------------------------- */
  /*  Orders                                                                */
  /* ---------------------------------------------------------------------- */

  const placeOrder = useCallback((input: PlaceOrderInput): Order => {
    const order: Order = {
      ...input,
      id: `ord-${Date.now().toString(36)}`,
      code: orderCode(),
      placedOn: friendlyDate(),
      status: 'PROCESSING',
    }
    setState((prev) => {
      const points = prev.profile?.points ?? 0
      return {
        ...prev,
        orders: [order, ...prev.orders],
        profile: prev.profile
          ? { ...prev.profile, points: points + earnPoints(order.total) }
          : prev.profile,
      }
    })
    return order
  }, [])

  const cancelOrder = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      orders: prev.orders.filter((o) => o.id !== id),
    }))
  }, [])

  /* ---------------------------------------------------------------------- */
  /*  Addresses & payment methods                                           */
  /* ---------------------------------------------------------------------- */

  const addAddress = useCallback((address: Omit<Address, 'id' | 'isDefault'>) => {
    setState((prev) => ({
      ...prev,
      addresses: [
        ...prev.addresses,
        { ...address, id: `addr-${Date.now().toString(36)}`, isDefault: prev.addresses.length === 0 },
      ],
    }))
  }, [])

  const updateAddress = useCallback((id: string, patch: Partial<Omit<Address, 'id'>>) => {
    setState((prev) => ({
      ...prev,
      addresses: prev.addresses.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }))
  }, [])

  const removeAddress = useCallback((id: string) => {
    setState((prev) => {
      const next = prev.addresses.filter((a) => a.id !== id)
      if (prev.addresses.find((a) => a.id === id)?.isDefault && next.length > 0) {
        next[0] = { ...next[0], isDefault: true }
      }
      return { ...prev, addresses: next }
    })
  }, [])

  const makeDefaultAddress = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      addresses: prev.addresses.map((a) => ({ ...a, isDefault: a.id === id })),
    }))
  }, [])

  const addPayment = useCallback((method: Omit<PaymentMethod, 'id' | 'isDefault'>) => {
    setState((prev) => ({
      ...prev,
      payments: [
        ...prev.payments,
        { ...method, id: `card-${Date.now().toString(36)}`, isDefault: prev.payments.length === 0 },
      ],
    }))
  }, [])

  const removePayment = useCallback((id: string) => {
    setState((prev) => ({ ...prev, payments: prev.payments.filter((p) => p.id !== id) }))
  }, [])

  const makeDefaultPayment = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      payments: prev.payments.map((p) => ({ ...p, isDefault: p.id === id })),
    }))
  }, [])

  const redeemPoints = useCallback(() => {
    let value = 0
    setState((prev) => {
      if (!prev.profile || prev.profile.storeCredit <= 0) return prev
      value = prev.profile.storeCredit
      return { ...prev, profile: { ...prev.profile, storeCredit: 0, points: 0 } }
    })
    return value
  }, [])

  const profile = state.profile ?? GUEST_PROFILE
  const totalSpent = useMemo(
    () => state.orders.reduce((sum, o) => sum + o.total, 0),
    [state.orders],
  )

  const value: AccountContextValue = {
    profile,
    signedIn: state.profile !== null,
    token: state.token,
    addresses: state.addresses,
    payments: state.payments,
    orders: state.orders,
    totalSpent,
    signIn,
    signUp,
    signOut,
    placeOrder,
    cancelOrder,
    addAddress,
    updateAddress,
    removeAddress,
    makeDefaultAddress,
    addPayment,
    removePayment,
    makeDefaultPayment,
    redeemPoints,
  }

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount must be used within an AccountProvider')
  return ctx
}

