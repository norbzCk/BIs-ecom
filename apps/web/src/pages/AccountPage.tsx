import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { SiteLayout } from '../components/SiteLayout'
import { TrustBar } from '../components/TrustBar'
import { Icon } from '../components/icons'
import { EmptyState, ProgressMeter } from '../components/ui'
import { products } from '../data/products'
import { useAccount, type Address, type Order, type OrderStatus } from '../lib/account-context'
import { useCart } from '../lib/cart-context'
import { Counter } from '../lib/motion/counter'
import { Magnetic } from '../lib/motion/interactive'
import { Stagger, StaggerItem } from '../lib/motion/reveal'
import { useToast } from '../lib/motion/toast'
import { money, moneyExact, SYMBOL } from '../lib/money'

type Tab = 'overview' | 'orders' | 'addresses' | 'payments' | 'rewards' | 'saved'

const TABS: { id: Tab; label: string; icon: 'User' | 'Package' | 'Pin' | 'Card' | 'Award' | 'Heart' }[] = [
  { id: 'overview', label: 'Overview', icon: 'User' },
  { id: 'orders', label: 'Orders', icon: 'Package' },
  { id: 'addresses', label: 'Addresses', icon: 'Pin' },
  { id: 'payments', label: 'Payments', icon: 'Card' },
  { id: 'rewards', label: 'Rewards', icon: 'Award' },
  { id: 'saved', label: 'Saved', icon: 'Heart' },
]

const STATUS_META: Record<OrderStatus, { label: string; tone: string; step: number }> = {
  PROCESSING: { label: 'Processing', tone: 'bg-slate-500/15 text-body', step: 1 },
  PACKED: { label: 'Packed', tone: 'bg-amber-500/15 text-amber-300', step: 2 },
  SHIPPED: { label: 'Shipped', tone: 'bg-sky-500/15 text-sky-300', step: 3 },
  DELIVERED: { label: 'Delivered', tone: 'bg-emerald-500/15 text-emerald-300', step: 4 },
}

const FLOW: OrderStatus[] = ['PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED']

const TIERS = [
  { name: 'Member', at: 0, perk: 'Earn 1 point per TSh 1,000' },
  { name: 'Professional', at: 2_500, perk: 'Priority support, early access' },
  { name: 'Elite', at: 10_000, perk: 'Free express shipping, 5-year warranty' },
]

const digits = (v: string) => v.replace(/\D/g, '')

function luhnValid(value: string) {
  const nums = digits(value)
  if (nums.length < 13 || nums.length > 19) return false
  let sum = 0
  let double = false
  for (let i = nums.length - 1; i >= 0; i -= 1) {
    let d = Number(nums[i])
    if (double) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    double = !double
  }
  return sum % 10 === 0
}

export function AccountPage() {
  const [params, setParams] = useSearchParams()
  const tabParam = params.get('tab') as Tab | null
  const [tab, setTab] = useState<Tab>(
    TABS.some((t) => t.id === tabParam) ? (tabParam as Tab) : 'overview',
  )

  const {
    profile,
    signedIn,
    addresses,
    payments,
    orders,
    totalSpent,
    signIn,
    signUp,
    signOut,
    addAddress,
    removeAddress,
    makeDefaultAddress,
    addPayment,
    removePayment,
    makeDefaultPayment,
    redeemPoints,
  } = useAccount()

  const { savedProducts, moveToCart, removeSaved, wishlist } = useCart()
  const { push } = useToast()

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [auth, setAuth] = useState({ firstName: '', lastName: '', email: '', password: '' })

  const [newAddress, setNewAddress] = useState<Omit<Address, 'id' | 'isDefault'>>({
    label: '',
    name: '',
    street: '',
    city: '',
    state: '',
    zip: '',
  })
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({})
  const [cardForm, setCardForm] = useState({ number: '', expiry: '', name: '' })
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({})
  const [redeeming, setRedeeming] = useState(false)

  // Keep ?tab= in step with the sidebar so links like /account?tab=saved work.
  useEffect(() => {
    if (tabParam === tab) return
    setParams(tab === 'overview' ? {} : { tab }, { replace: true })
  }, [tab, tabParam, setParams])

  const savedItems = useMemo(
    () => savedProducts.map(({ product }) => product),
    [savedProducts],
  )

  const wishlistItems = useMemo(
    () => products.filter((p) => wishlist.includes(p.id)),
    [wishlist],
  )

  const tier = useMemo(
    () => [...TIERS].reverse().find((t) => profile.points >= t.at) ?? TIERS[0],
    [profile.points],
  )
  const nextTier = TIERS[TIERS.indexOf(tier) + 1]
  const tierProgress = nextTier
    ? (profile.points - tier.at) / (nextTier.at - tier.at)
    : 1

  const submitAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(auth.email)) {
      setAuthError('Enter a valid email address')
      return
    }
    if (auth.password.length < 6) {
      setAuthError('Passwords are at least 6 characters')
      return
    }
    if (authMode === 'signup' && !auth.firstName.trim()) {
      setAuthError('Tell us your first name')
      return
    }

    setAuthBusy(true)
    try {
      if (authMode === 'signin') {
        await signIn(auth.email, auth.password)
        push({ tone: 'success', title: 'Signed in' })
      } else {
        await signUp({
          firstName: auth.firstName.trim(),
          lastName: auth.lastName.trim(),
          email: auth.email,
          password: auth.password,
        })
        push({ tone: 'success', title: 'Account created' })
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setAuthBusy(false)
    }
  }

  const submitAddress = (e: React.FormEvent) => {
    e.preventDefault()
    const errors: Record<string, string> = {}
    if (!newAddress.label.trim()) errors.label = 'Give it a name, e.g. Office'
    if (!newAddress.name.trim()) errors.name = 'Required'
    if (newAddress.street.trim().length < 4) errors.street = 'Required'
    if (!newAddress.city.trim()) errors.city = 'Required'
    if (newAddress.state.trim().length < 2) errors.state = 'Required'
    if (digits(newAddress.zip).length < 4) errors.zip = 'Required'
    setAddressErrors(errors)
    if (Object.keys(errors).length > 0) return

    addAddress({ ...newAddress, label: newAddress.label.trim() })
    setNewAddress({ label: '', name: '', street: '', city: '', state: '', zip: '' })
    setAddressErrors({})
    push({ tone: 'success', title: 'Address saved' })
  }

  const submitCard = (e: React.FormEvent) => {
    e.preventDefault()
    const errors: Record<string, string> = {}
    if (!luhnValid(cardForm.number)) errors.number = 'That card number is not valid'
    const [mm, yy] = cardForm.expiry.split('/').map((p) => digits(p))
    if (!mm || Number(mm) < 1 || Number(mm) > 12) errors.expiry = 'MM / YY'
    if (yy) {
      const expiry = new Date(2000 + Number(yy), Number(mm), 1)
      if (expiry <= new Date()) errors.expiry = 'That card has expired'
    }
    if (!cardForm.name.trim()) errors.name = 'Required'
    setCardErrors(errors)
    if (Object.keys(errors).length > 0) return

    const nums = digits(cardForm.number)
    const brand = nums.startsWith('4')
      ? 'Visa'
      : /^5[1-5]/.test(nums)
        ? 'Mastercard'
        : nums.startsWith('3')
          ? 'Amex'
          : 'Card'

    addPayment({
      brand,
      last4: nums.slice(-4),
      expiry: `${mm} / ${yy}`,
    })
    setCardForm({ number: '', expiry: '', name: '' })
    setCardErrors({})
    push({ tone: 'success', title: 'Card saved', description: 'Only the last four digits are kept' })
  }

  const redeem = () => {
    setRedeeming(true)
    window.setTimeout(() => {
      const value = redeemPoints()
      setRedeeming(false)
      push({
        tone: value > 0 ? 'success' : 'error',
        title: value > 0 ? `$${value.toFixed(2)} redeemed` : 'No credit to redeem',
        description: value > 0 ? 'Added to your next order' : undefined,
      })
    }, 700)
  }

  /* ---------------------------------------------------------------------- */

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Signed-out gate --------------------------------------------- */}
        {!signedIn ? (
          <div className="mx-auto max-w-md">
            <div className="panel ring-gradient p-7">
              <span className="flex size-12 items-center justify-center rounded-2xl border border-line bg-surface-inset text-brand-oncanvas">
                <Icon.User className="size-5" />
              </span>
              <h1 className="mt-5 text-xl font-extrabold">
                {authMode === 'signin' ? 'Sign in to your account' : 'Create your account'}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {authMode === 'signin'
                  ? 'Keep your orders, addresses and saved items in one place. You can also keep checking out as a guest.'
                  : 'Save your build, track orders and collect rewards. Takes about twenty seconds.'}
              </p>

              <form onSubmit={submitAuth} className="mt-6 space-y-4" noValidate>
                {authMode === 'signup' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="first" className="label">
                        First name
                      </label>
                      <input
                        id="first"
                        value={auth.firstName}
                        onChange={(e) => setAuth({ ...auth, firstName: e.target.value })}
                        className="input mt-2"
                        autoComplete="given-name"
                      />
                    </div>
                    <div>
                      <label htmlFor="last" className="label">
                        Last name
                      </label>
                      <input
                        id="last"
                        value={auth.lastName}
                        onChange={(e) => setAuth({ ...auth, lastName: e.target.value })}
                        className="input mt-2"
                        autoComplete="family-name"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="auth-email" className="label">
                    Email
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    value={auth.email}
                    onChange={(e) => setAuth({ ...auth, email: e.target.value })}
                    className="input mt-2"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label htmlFor="auth-password" className="label">
                    Password
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    value={auth.password}
                    onChange={(e) => setAuth({ ...auth, password: e.target.value })}
                    className="input mt-2"
                    autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                  />
                </div>

                <AnimatePresence>
                  {authError && (
                    <motion.p
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      role="alert"
                      className="flex items-start gap-1.5 text-xs text-rose-300"
                    >
                      <Icon.Alert className="mt-px size-3.5 shrink-0" />
                      {authError}
                    </motion.p>
                  )}
                </AnimatePresence>

                <Magnetic strength={0.15} className="w-full">
                  <button type="submit" disabled={authBusy} className="btn-primary sheen w-full py-3.5">
                    {authBusy ? (
                      <>
                        <span className="size-4 animate-spin rounded-full border-2 border-line-strong border-t-white" />
                        Working…
                      </>
                    ) : authMode === 'signin' ? (
                      'Sign in'
                    ) : (
                      'Create account'
                    )}
                  </button>
                </Magnetic>
              </form>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line-faint pt-5">
                <button
                  onClick={() => {
                    setAuthMode(authMode === 'signin' ? 'signup' : 'signin')
                    setAuthError(null)
                  }}
                  className="text-sm font-semibold text-brand-oncanvas transition hover:text-brand-oncanvas"
                >
                  {authMode === 'signin' ? 'Need an account? Sign up' : 'Already registered? Sign in'}
                </button>
                <Link to="/shop" className="btn-quiet btn-sm">
                  Continue as guest
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Signed in ------------------------------------------------- */
          <div className="grid gap-8 lg:grid-cols-[230px_1fr]">
            {/* Sidebar ----------------------------------------------- */}
            <aside className="lg:sticky lg:top-32 lg:self-start">
              <div className="panel p-5">
                <p className="font-display text-lg font-extrabold text-ink">
                  {profile.firstName} {profile.lastName}
                </p>
                <p className="mt-0.5 truncate text-xs text-ink-subtle">{profile.email}</p>
                <span className="badge mt-3 border border-brand-400/30 bg-brand-500/12 text-brand-oncanvas">
                  {profile.tier}
                </span>
                {profile.local && (
                  <p className="mt-3 text-[11px] leading-relaxed text-ink-subtle">
                    Running in local demo mode — this profile lives in your browser only.
                  </p>
                )}
              </div>

              <nav className="mt-3 space-y-1">
                {TABS.map((t) => {
                  const IconTab = Icon[t.icon]
                  const count =
                    t.id === 'orders'
                      ? orders.length
                      : t.id === 'addresses'
                        ? addresses.length
                        : t.id === 'payments'
                          ? payments.length
                          : t.id === 'saved'
                            ? savedItems.length + wishlistItems.length
                            : undefined
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      aria-current={tab === t.id ? 'page' : undefined}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                        tab === t.id
                          ? 'bg-brand-500/15 text-ink'
                          : 'text-ink-muted hover:bg-surface-inset hover:text-body'
                      }`}
                    >
                      <IconTab className="size-4 shrink-0" />
                      <span className="flex-1 text-left">{t.label}</span>
                      {typeof count === 'number' && count > 0 && (
                        <span className="rounded-md bg-surface-inset px-1.5 py-0.5 text-[11px] text-body">
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </nav>

              <button
                onClick={() => {
                  signOut()
                  push({ title: 'Signed out', description: 'Your cart is still here' })
                }}
                className="mt-3 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-300 transition hover:bg-rose-500/10"
              >
                <Icon.LogOut className="size-4" />
                Sign out
              </button>
            </aside>

            {/* Panels ------------------------------------------------- */}
            <div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  {tab === 'overview' && (
                    <div className="space-y-6">
                      <div className="grid gap-3 sm:grid-cols-3">
                        {[
                          { label: 'Orders placed', value: orders.length, icon: <Icon.Package className="size-4" /> },
                          { label: 'Total spent', value: totalSpent, prefix: `${SYMBOL}\u2009`, icon: <Icon.Award className="size-4" /> },
                          { label: 'Reward points', value: profile.points, icon: <Icon.Sparkle className="size-4" /> },
                        ].map((stat) => (
                          <div key={stat.label} className="panel p-4">
                            <span className="flex size-9 items-center justify-center rounded-xl border border-line bg-surface-inset text-brand-oncanvas">
                              {stat.icon}
                            </span>
                            <p className="mt-3 text-[11px] tracking-wide text-ink-subtle uppercase">
                              {stat.label}
                            </p>
                            <p className="font-display mt-0.5 text-xl font-extrabold text-ink">
                              <Counter
                                to={stat.value}
                                {...(stat.prefix ? { prefix: stat.prefix } : {})}
                              />
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="panel p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h2 className="text-sm font-bold text-ink">
                              {profile.firstName}&rsquo;s {tier.name} tier
                            </h2>
                            <p className="mt-0.5 text-xs text-ink-muted">
                              {nextTier
                                ? `${(nextTier.at - profile.points).toLocaleString()} points to ${nextTier.name}`
                                : 'Top tier reached — enjoy the perks'}
                            </p>
                          </div>
                          <button onClick={() => setTab('rewards')} className="btn-ghost btn-sm">
                            <Icon.Award className="size-3.5" />
                            Rewards
                          </button>
                        </div>
                        <ProgressMeter value={tierProgress} className="mt-4" />
                        <p className="mt-2 text-xs text-ink-subtle">
                          {tier.perk}
                          {nextTier ? ` · next: ${nextTier.perk}` : ''}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <h2 className="text-sm font-bold text-ink">Recent orders</h2>
                          <button
                            onClick={() => setTab('orders')}
                            className="text-xs font-semibold text-brand-oncanvas hover:text-brand-oncanvas"
                          >
                            View all
                          </button>
                        </div>
                        {orders.length === 0 ? (
                          <div className="panel mt-3 px-5 py-8 text-center text-sm text-ink-subtle">
                            No orders yet.{' '}
                            <Link to="/shop" className="text-brand-oncanvas hover:text-brand-oncanvas">
                              Start shopping
                            </Link>
                          </div>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {orders.slice(0, 3).map((order) => (
                              <OrderRow key={order.id} order={order} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {tab === 'orders' && (
                    <div>
                      <h2 className="text-lg font-bold text-ink">Order history</h2>
                      <p className="mt-1 text-sm text-ink-muted">
                        Every order placed with this profile, newest first.
                      </p>
                      {orders.length === 0 ? (
                        <div className="mt-5">
                          <EmptyState
                            icon={<Icon.Package className="size-6" />}
                            title="No orders yet"
                            body="When you place an order it appears here with live tracking."
                            action={{ label: 'Browse products', to: '/shop' }}
                          />
                        </div>
                      ) : (
                        <Stagger className="mt-5 space-y-3" stagger={0.06}>
                          {orders.map((order) => (
                            <StaggerItem key={order.id}>
                              <OrderDetail order={order} />
                            </StaggerItem>
                          ))}
                        </Stagger>
                      )}
                    </div>
                  )}

                  {tab === 'addresses' && (
                    <div>
                      <h2 className="text-lg font-bold text-ink">Saved addresses</h2>
                      <p className="mt-1 text-sm text-ink-muted">
                        Used to prefill checkout. One can be your default.
                      </p>

                      <Stagger className="mt-5 grid gap-3 sm:grid-cols-2" stagger={0.06}>
                        {addresses.map((address) => (
                          <StaggerItem key={address.id}>
                            <div className="panel h-full p-4">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-bold text-ink">{address.label}</p>
                                {address.isDefault && (
                                  <span className="badge bg-emerald-500/15 text-emerald-300">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="mt-2 text-sm text-body">{address.name}</p>
                              <p className="text-sm text-ink-muted">{address.street}</p>
                              <p className="text-sm text-ink-muted">
                                {address.city}, {address.state} {address.zip}
                              </p>
                              <div className="mt-4 flex flex-wrap gap-2">
                                {!address.isDefault && (
                                  <button
                                    onClick={() => makeDefaultAddress(address.id)}
                                    className="btn-quiet btn-sm"
                                  >
                                    <Icon.Check className="size-3.5" />
                                    Make default
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    removeAddress(address.id)
                                    push({ title: 'Address removed' })
                                  }}
                                  className="btn-quiet btn-sm hover:text-rose-300"
                                >
                                  <Icon.Trash className="size-3.5" />
                                  Remove
                                </button>
                              </div>
                            </div>
                          </StaggerItem>
                        ))}
                      </Stagger>

                      <form onSubmit={submitAddress} className="panel mt-5 p-5" noValidate>
                        <h3 className="text-sm font-bold text-ink">Add an address</h3>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <TextField
                            id="a-label"
                            label="Label"
                            value={newAddress.label}
                            onChange={(v) => setNewAddress({ ...newAddress, label: v })}
                            error={addressErrors.label}
                            placeholder="Office"
                          />
                          <TextField
                            id="a-name"
                            label="Full name"
                            value={newAddress.name}
                            onChange={(v) => setNewAddress({ ...newAddress, name: v })}
                            error={addressErrors.name}
                          />
                        </div>
                        <div className="mt-4">
                          <TextField
                            id="a-street"
                            label="Street address"
                            value={newAddress.street}
                            onChange={(v) => setNewAddress({ ...newAddress, street: v })}
                            error={addressErrors.street}
                          />
                        </div>
                        <div className="mt-4 grid gap-4 sm:grid-cols-3">
                          <TextField
                            id="a-city"
                            label="City"
                            value={newAddress.city}
                            onChange={(v) => setNewAddress({ ...newAddress, city: v })}
                            error={addressErrors.city}
                          />
                          <TextField
                            id="a-state"
                            label="State"
                            value={newAddress.state}
                            onChange={(v) => setNewAddress({ ...newAddress, state: v })}
                            error={addressErrors.state}
                          />
                          <TextField
                            id="a-zip"
                            label="Postcode"
                            value={newAddress.zip}
                            onChange={(v) => setNewAddress({ ...newAddress, zip: v })}
                            error={addressErrors.zip}
                          />
                        </div>
                        <button type="submit" className="btn-primary btn-sm mt-5 px-5">
                          <Icon.Plus className="size-3.5" />
                          Save address
                        </button>
                      </form>
                    </div>
                  )}

                  {tab === 'payments' && (
                    <div>
                      <h2 className="text-lg font-bold text-ink">Payment methods</h2>
                      <p className="mt-1 text-sm text-ink-muted">
                        Only the brand and last four digits are kept — never the full number.
                      </p>

                      <Stagger className="mt-5 grid gap-3 sm:grid-cols-2" stagger={0.06}>
                        {payments.map((method) => (
                          <StaggerItem key={method.id}>
                            <div className="panel flex items-center gap-3 p-4">
                              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-inset text-brand-oncanvas">
                                <Icon.Card className="size-4" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-ink">
                                  {method.brand} ···· {method.last4}
                                </p>
                                <p className="text-xs text-ink-subtle">Expires {method.expiry}</p>
                              </div>
                              {method.isDefault ? (
                                <span className="badge shrink-0 bg-emerald-500/15 text-emerald-300">
                                  Default
                                </span>
                              ) : (
                                <button
                                  onClick={() => makeDefaultPayment(method.id)}
                                  className="btn-quiet btn-sm shrink-0"
                                >
                                  Set default
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  removePayment(method.id)
                                  push({ title: 'Card removed' })
                                }}
                                aria-label={`Remove card ending ${method.last4}`}
                                className="btn-quiet btn-sm shrink-0 hover:text-rose-300"
                              >
                                <Icon.Trash className="size-3.5" />
                              </button>
                            </div>
                          </StaggerItem>
                        ))}
                      </Stagger>

                      <form onSubmit={submitCard} className="panel mt-5 p-5" noValidate>
                        <h3 className="text-sm font-bold text-ink">Add a card</h3>
                        <div className="mt-4">
                          <TextField
                            id="c-number"
                            label="Card number"
                            value={cardForm.number}
                            onChange={(v) =>
                              setCardForm({
                                ...cardForm,
                                number: digits(v).slice(0, 19).replace(/(.{4})/g, '$1 ').trim(),
                              })
                            }
                            error={cardErrors.number}
                            placeholder="4242 4242 4242 4242"
                            inputMode="numeric"
                          />
                        </div>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <TextField
                            id="c-expiry"
                            label="Expiry"
                            value={cardForm.expiry}
                            onChange={(v) => {
                              const nums = digits(v).slice(0, 4)
                              setCardForm({
                                ...cardForm,
                                expiry: nums.length <= 2 ? nums : `${nums.slice(0, 2)} / ${nums.slice(2)}`,
                              })
                            }}
                            error={cardErrors.expiry}
                            placeholder="MM / YY"
                            inputMode="numeric"
                          />
                          <TextField
                            id="c-name"
                            label="Name on card"
                            value={cardForm.name}
                            onChange={(v) => setCardForm({ ...cardForm, name: v })}
                            error={cardErrors.name}
                          />
                        </div>
                        <button type="submit" className="btn-primary btn-sm mt-5 px-5">
                          <Icon.Card className="size-3.5" />
                          Save card
                        </button>
                      </form>
                    </div>
                  )}

                  {tab === 'rewards' && (
                    <div>
                      <h2 className="text-lg font-bold text-ink">Rewards</h2>
                      <p className="mt-1 text-sm text-ink-muted">
                        One point per TSh 1,000 spent. 100 points is TSh 1,000 of store credit.
                      </p>

                      <div className="panel ring-gradient mt-5 p-6">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                          <div>
                            <p className="text-[11px] tracking-[0.16em] text-ink-subtle uppercase">
                              Available balance
                            </p>
                            <p className="font-display mt-1 text-4xl font-extrabold text-ink">
                              <Counter to={profile.points} />
                              <span className="ml-2 text-base font-semibold text-ink-subtle">
                                points
                              </span>
                            </p>
                            <p className="mt-1 text-sm text-ink-muted">
                              Worth {money(profile.points)} · store credit{' '}
                              {moneyExact(profile.storeCredit)}
                            </p>
                          </div>
                          <button
                            onClick={redeem}
                            disabled={redeeming || profile.storeCredit <= 0}
                            className="btn-primary"
                          >
                            {redeeming ? (
                              <>
                                <span className="size-4 animate-spin rounded-full border-2 border-line-strong border-t-white" />
                                Redeeming…
                              </>
                            ) : (
                              <>
                                <Icon.Sparkle className="size-4" />
                                Redeem store credit
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <Stagger className="mt-5 grid gap-3 sm:grid-cols-3" stagger={0.07}>
                        {TIERS.map((t) => {
                          const reached = profile.points >= t.at
                          return (
                            <StaggerItem key={t.name}>
                              <div
                                className={`panel h-full p-5 ${
                                  t.name === tier.name ? 'ring-gradient' : ''
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-bold text-ink">{t.name}</p>
                                  {reached && (
                                    <Icon.Check className="size-4 text-emerald-400" />
                                  )}
                                </div>
                                <p className="mt-1 text-xs text-ink-subtle">
                                  {t.at.toLocaleString()} points
                                </p>
                                <p className="mt-3 text-sm text-ink-muted">{t.perk}</p>
                              </div>
                            </StaggerItem>
                          )
                        })}
                      </Stagger>
                    </div>
                  )}

                  {tab === 'saved' && (
                    <div>
                      <h2 className="text-lg font-bold text-ink">Saved items</h2>
                      <p className="mt-1 text-sm text-ink-muted">
                        Everything you set aside, ready to move back into your cart.
                      </p>

                      {wishlistItems.length === 0 && savedItems.length === 0 ? (
                        <div className="mt-5">
                          <EmptyState
                            icon={<Icon.Heart className="size-6" />}
                            title="Nothing saved yet"
                            body="Tap the heart on any product to keep it here for later."
                            action={{ label: 'Browse products', to: '/shop' }}
                          />
                        </div>
                      ) : (
                        <div className="mt-5 space-y-8">
                          {savedItems.length > 0 && (
                            <div>
                              <h3 className="text-sm font-bold text-ink">Saved for later</h3>
                              <div className="mt-3 space-y-2">
                                {savedProducts.map(({ product, quantity }) => (
                                  <div key={product.id} className="panel flex items-center gap-3 p-3">
                                    <span className="min-w-0 flex-1">
                                      <span className="line-clamp-1 block text-sm font-semibold text-ink">
                                        {product.name}
                                      </span>
                                      <span className="text-xs text-ink-subtle">
                                        Qty {quantity} · {money(product.price)}
                                      </span>
                                    </span>
                                    <button
                                      onClick={() => {
                                        moveToCart(product.id)
                                        push({
                                          tone: 'success',
                                          title: 'Moved to cart',
                                          description: product.name,
                                          action: { label: 'Checkout', to: '/checkout' },
                                        })
                                      }}
                                      className="btn-primary btn-sm"
                                    >
                                      <Icon.Cart className="size-3.5" />
                                      Move
                                    </button>
                                    <button
                                      onClick={() => removeSaved(product.id)}
                                      aria-label={`Remove ${product.name}`}
                                      className="btn-quiet btn-sm hover:text-rose-300"
                                    >
                                      <Icon.Trash className="size-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {wishlistItems.length > 0 && (
                            <div>
                              <h3 className="text-sm font-bold text-ink">Wishlist</h3>
                              <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-3">
                                {wishlistItems.map((product, i) => (
                                  <ProductCard key={product.id} product={product} index={i} compact />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      <TrustBar />
    </SiteLayout>
  )
}

/* -------------------------------------------------------------------------- */
/*  Order components                                                           */
/* -------------------------------------------------------------------------- */

function OrderRow({ order }: { order: Order }) {
  const meta = STATUS_META[order.status]
  return (
    <div className="panel flex flex-wrap items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`badge ${meta.tone}`}>{meta.label}</span>
          <span className="font-mono text-xs text-ink-muted">{order.code}</span>
        </div>
        <p className="mt-1.5 line-clamp-1 text-sm text-ink-muted">
          {order.items.map((i) => i.name).join(', ')}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold text-ink">${order.total.toFixed(2)}</p>
        <p className="text-xs text-ink-subtle">{order.placedOn}</p>
      </div>
    </div>
  )
}

function OrderDetail({ order }: { order: Order }) {
  const meta = STATUS_META[order.status]
  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line-faint p-4">
        <span className={`badge ${meta.tone}`}>{meta.label}</span>
        <span className="font-mono text-xs text-ink-muted">{order.code}</span>
        <span className="ml-auto text-sm font-bold text-ink">${order.total.toFixed(2)}</span>
      </div>

      <div className="p-4">
        {/* Progress rail */}
        <ol className="flex items-center">
          {FLOW.map((stage, i) => {
            const reached = meta.step >= i + 1
            return (
              <li key={stage} className="flex flex-1 items-center last:flex-none">
                <span className="flex flex-col items-center gap-1.5">
                  <motion.span
                    initial={false}
                    animate={{
                      scale: reached ? 1 : 0.7,
                      backgroundColor: reached ? 'rgb(16 185 129)' : 'rgb(255 255 255 / 0.08)',
                    }}
                    transition={{ duration: 0.4 }}
                    className="flex size-6 items-center justify-center rounded-full"
                  >
                    {reached ? (
                      <Icon.Check className="size-3 text-ink" />
                    ) : (
                      <span className="size-1.5 rounded-full bg-slate-500" />
                    )}
                  </motion.span>
                  <span
                    className={`text-[10px] font-semibold tracking-wide uppercase ${
                      reached ? 'text-emerald-300' : 'text-ink-faint'
                    }`}
                  >
                    {STATUS_META[stage].label}
                  </span>
                </span>
                {i < FLOW.length - 1 && (
                  <span className="mx-1.5 h-px flex-1 bg-surface-glass-hover">
                    <motion.span
                      className="block h-px bg-emerald-500"
                      initial={false}
                      animate={{ width: meta.step > i + 1 ? '100%' : '0%' }}
                      transition={{ duration: 0.6 }}
                    />
                  </span>
                )}
              </li>
            )
          })}
        </ol>

        <ul className="mt-5 space-y-1.5">
          {order.items.map((item) => (
            <li key={item.productId} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-body">
                {item.name} <span className="text-ink-subtle">× {item.quantity}</span>
              </span>
              <span className="shrink-0 font-semibold text-ink tabular-nums">
                ${(item.price * item.quantity).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 grid gap-4 border-t border-line-faint pt-4 text-xs sm:grid-cols-3">
          <div>
            <p className="text-ink-subtle">Delivering to</p>
            <p className="mt-0.5 text-body">
              {order.address.name}, {order.address.street}
            </p>
            <p className="text-ink-muted">
              {order.address.city}, {order.address.state} {order.address.zip}
            </p>
          </div>
          <div>
            <p className="text-ink-subtle">Payment</p>
            <p className="mt-0.5 text-body">Card ending {order.cardLast4}</p>
            <p className="text-ink-muted">
              {order.speed === 'express' ? 'Express delivery' : 'Standard delivery'}
            </p>
          </div>
          <div>
            <p className="text-ink-subtle">Contact</p>
            <p className="mt-0.5 truncate text-body">{order.email}</p>
            <p className="text-ink-muted">Placed {order.placedOn}</p>
          </div>
        </div>

        {order.notes && (
          <p className="mt-3 rounded-lg border border-line-faint bg-surface-inset p-3 text-xs text-ink-muted">
            <span className="font-semibold text-body">Note:</span> {order.notes}
          </p>
        )}
      </div>
    </div>
  )
}

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  inputMode,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  inputMode?: 'numeric' | 'text'
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        value={value}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`input mt-2 ${error ? '!border-rose-400/60' : ''}`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[11px] text-rose-300">
          {error}
        </p>
      )}
    </div>
  )
}
