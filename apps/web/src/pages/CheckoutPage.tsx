import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../components/icons'
import { ProductVisual } from '../components/ProductVisual'
import { SiteLayout } from '../components/SiteLayout'
import { TrustBar } from '../components/TrustBar'
import { EmptyState, ProgressMeter } from '../components/ui'
import { FLAT_SHIPPING, SHIPPING_THRESHOLD, TAX_RATE, useCart } from '../lib/cart-context'
import { useAccount, type Address } from '../lib/account-context'
import { apiRequest, ApiError } from '../lib/api-client'
import { Magnetic } from '../lib/motion/interactive'
import { Stagger, StaggerItem } from '../lib/motion/reveal'
import { useToast } from '../lib/motion/toast'
import { money, moneyExact } from '../lib/money'

type StepId = 'contact' | 'shipping' | 'payment' | 'review'

const STEPS: { id: StepId; label: string; icon: 'Mail' | 'Truck' | 'Card' | 'Check' }[] = [
  { id: 'contact', label: 'Contact', icon: 'Mail' },
  { id: 'shipping', label: 'Shipping', icon: 'Truck' },
  { id: 'payment', label: 'Payment', icon: 'Card' },
  { id: 'review', label: 'Review', icon: 'Check' },
]

/** The address being typed, before it becomes a saved Address record. */
type DraftAddress = Omit<Address, 'id' | 'isDefault'>

const EMPTY_ADDRESS: DraftAddress = {
  label: 'Home',
  name: '',
  street: '',
  city: '',
  state: '',
  zip: '',
}

/** Groups of 4, ignoring spaces and dashes. */
const digits = (value: string) => value.replace(/\D/g, '')

/**
 * Mirrors the `PaymentMethod` enum in prisma/schema.prisma. Nothing is charged
 * here: the order is created with a PENDING payment and the method decides who
 * collects the money, so we record the choice and never ask for card details
 * we have no way to take.
 */
type PaymentMethod = 'MOBILE_MONEY' | 'CARD' | 'BANK_TRANSFER' | 'CASH_ON_DELIVERY'

const PAYMENT_METHODS: { id: PaymentMethod; title: string; detail: string }[] = [
  {
    id: 'MOBILE_MONEY',
    title: 'Mobile money',
    detail: 'We send a payment request to the number on this order.',
  },
  {
    id: 'CARD',
    title: 'Card',
    detail: 'Pay by card when the parcel is handed over.',
  },
  {
    id: 'BANK_TRANSFER',
    title: 'Bank transfer',
    detail: 'We email you the account details to transfer to.',
  },
  {
    id: 'CASH_ON_DELIVERY',
    title: 'Cash on delivery',
    detail: 'Keep the exact amount ready for the rider.',
  },
]

export function CheckoutPage() {
  const { cartProducts, subtotal, tax, itemCount, clearCart } = useCart()
  const { profile, signedIn, token, addresses } = useAccount()
  const { push } = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState<StepId>('contact')
  const [email, setEmail] = useState(profile?.email ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [address, setAddress] = useState(EMPTY_ADDRESS)
  const [method, setMethod] = useState<PaymentMethod>('MOBILE_MONEY')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [placing, setPlacing] = useState(false)
  const [orderCode, setOrderCode] = useState<string | null>(null)
  const [placedTotal, setPlacedTotal] = useState(0)

  const savedAddress = addresses.find((a) => a.isDefault) ?? addresses[0]
  const methodLabel = PAYMENT_METHODS.find((m) => m.id === method)?.title ?? 'Mobile money'

  // Mirrors FREE_SHIPPING_THRESHOLD / STANDARD_SHIPPING_FEE in
  // src/orders/orders.service.ts so the estimate matches what the server records.
  const shipping = useMemo(
    () => (subtotal > SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING),
    [subtotal],
  )

  const total = subtotal + shipping + tax

  const stepIndex = STEPS.findIndex((s) => s.id === step)

  const validate = (target: StepId): boolean => {
    const next: Record<string, string> = {}

    if (target === 'contact') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) next.email = 'Enter a valid email address'
      if (phone && digits(phone).length < 7) next.phone = 'That phone number looks short'
    }

    if (target === 'shipping') {
      if (!address.name.trim()) next.name = 'Who is receiving this?'
      if (address.street.trim().length < 4) next.street = 'Add a street address'
      if (!address.city.trim()) next.city = 'Required'
      if (address.state.trim().length < 2) next.state = 'Required'
      if (digits(address.zip).length < 4) next.zip = 'Enter a valid postcode'
    }

    setErrors(next)
    if (Object.keys(next).length > 0) {
      push({ tone: 'error', title: 'Check the highlighted fields' })
      return false
    }
    return true
  }

  const goTo = (target: StepId) => {
    // Every step before the target must be valid before moving forward.
    for (const s of STEPS.slice(0, STEPS.findIndex((x) => x.id === target))) {
      if (!validate(s.id)) {
        setStep(s.id)
        return
      }
    }
    setStep(target)
  }

  const next = () => {
    if (step === 'review') {
      place()
      return
    }
    if (!validate(step)) return
    const target = STEPS[stepIndex + 1]
    if (target) setStep(target.id)
  }

  const place = async () => {
    if (!validate('payment')) {
      setStep('payment')
      return
    }
    if (cartProducts.length === 0) return
    if (!token) {
      push({ tone: 'error', title: 'Sign in to place an order' })
      navigate('/account?next=/checkout')
      return
    }

    setPlacing(true)
    try {
      // The server owns the cart, the totals and the order record; it returns
      // the order number and the figures it recorded.
      const order = await apiRequest<{ orderNumber: string; total: number }>('/orders', {
        method: 'POST',
        token,
        body: {
          fullName: address.name,
          phone,
          street: address.street,
          city: address.city,
          region: address.state,
          country: 'Tanzania',
          postalCode: address.zip,
          paymentMethod: method,
          notes: notes.trim() || undefined,
        },
      })

      await clearCart()
      setPlacing(false)
      setOrderCode(order.orderNumber)
      setPlacedTotal(order.total)
      push({ tone: 'success', title: `Order ${order.orderNumber} placed` })
    } catch (err) {
      setPlacing(false)
      push({
        tone: 'error',
        title: 'Could not place the order',
        description: err instanceof ApiError ? err.message : 'Please try again',
      })
    }
  }

  /* ---------------------------------------------------------------------- */
  /*  Confirmation                                                          */
  /* ---------------------------------------------------------------------- */

  if (orderCode) {
    return (
      <SiteLayout>
        <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
          <motion.span
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 16 }}
            className="flex size-20 items-center justify-center rounded-3xl bg-emerald-500/15 text-emerald-400"
          >
            <Icon.Check className="size-9" />
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="mt-6 text-2xl font-extrabold sm:text-3xl"
          >
            Order confirmed
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base"
          >
            A confirmation is on its way to{' '}
            <span className="font-semibold text-body">{email}</span>. Your order reference is{' '}
            <span className="font-mono font-semibold text-brand-oncanvas">{orderCode}</span>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="mt-8 flex flex-wrap justify-center gap-3"
          >
            <Magnetic strength={0.2}>
              <Link to="/account?tab=orders" className="btn-primary sheen px-7 py-3.5">
                <Icon.Package className="size-4" />
                Track this order
              </Link>
            </Magnetic>
            <Link to="/shop" className="btn-ghost px-7 py-3.5">
              <Icon.Search className="size-4" />
              Keep shopping
            </Link>
          </motion.div>

          <p className="mt-10 text-xs text-ink-faint">
            Order total {moneyExact(placedTotal)}. No money has moved yet — the order is recorded
            as {methodLabel.toLowerCase()} and stays pending until payment is confirmed. We will
            email you as soon as the parcel leaves us.
          </p>
        </div>
      </SiteLayout>
    )
  }

  /* ---------------------------------------------------------------------- */
  /*  Empty cart                                                            */
  /* ---------------------------------------------------------------------- */

  if (cartProducts.length === 0) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <EmptyState
            icon={<Icon.Cart className="size-6" />}
            title="There is nothing to check out"
            body="Add something to your cart first. You can browse as a guest, but an account is needed to place the order."
            action={{ label: 'Browse the catalog', to: '/shop' }}
          />
        </div>
      </SiteLayout>
    )
  }

  /* ---------------------------------------------------------------------- */
  /*  Checkout                                                              */
  /* ---------------------------------------------------------------------- */

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Checkout</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {signedIn
            ? `Signed in as ${profile?.email}`
            : 'Sign in to place this order — the cart stays exactly as it is.'}
        </p>

        {/* Stepper ------------------------------------------------------- */}
        <ol className="mt-8 flex flex-wrap items-center gap-2 sm:gap-3">
          {STEPS.map((s, i) => {
            const done = i < stepIndex
            const active = s.id === step
            const IconStep = Icon[s.icon]
            return (
              <li key={s.id} className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => goTo(s.id)}
                  aria-current={active ? 'step' : undefined}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                    active
                      ? 'border-brand-400/60 bg-brand-500/15 text-ink'
                      : done
                        ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                        : 'border-line bg-surface-inset text-ink-subtle hover:border-line-strong hover:text-body'
                  }`}
                >
                  <span
                    className={`flex size-5 items-center justify-center rounded-full text-[10px] ${
                      active
                        ? 'bg-brand-500 text-ink'
                        : done
                          ? 'bg-emerald-500 text-ink'
                          : 'bg-surface-glass-hover text-ink-muted'
                    }`}
                  >
                    {done ? <Icon.Check className="size-3" /> : <IconStep className="size-3" />}
                  </span>
                  {s.label}
                </button>
                {i < STEPS.length - 1 && (
                  <span className="h-px w-4 bg-surface-glass-hover sm:w-8" aria-hidden />
                )}
              </li>
            )
          })}
        </ol>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Panels ------------------------------------------------------ */}
          <div className="panel p-5 sm:p-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                {step === 'contact' && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-lg font-bold text-ink">Contact details</h2>
                      <p className="mt-1 text-sm text-ink-muted">
                        We send the receipt and tracking here.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        id="email"
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        error={errors.email}
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                      <Field
                        id="phone"
                        label="Phone (optional)"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        error={errors.phone}
                        placeholder="For delivery updates"
                        autoComplete="tel"
                      />
                    </div>

                    {!signedIn && (
                      <div className="flex items-start gap-3 rounded-xl border border-line bg-surface-inset p-4">
                        <Icon.User className="mt-0.5 size-4 shrink-0 text-brand-oncanvas" />
                        <p className="text-xs leading-relaxed text-ink-muted">
                          You need an account before the order can be placed.{' '}
                          <Link to="/account?next=/checkout" className="font-semibold text-brand-oncanvas hover:text-brand-oncanvas">
                            Sign in or create an account
                          </Link>{' '}
                          — you can fill this in first, and your cart will carry over.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {step === 'shipping' && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-lg font-bold text-ink">Shipping address</h2>
                      <p className="mt-1 text-sm text-ink-muted">
                        Where should this go?
                      </p>
                    </div>

                    {savedAddress && (
                      <button
                        onClick={() => {
                          setAddress({
                            label: savedAddress.label,
                            name: savedAddress.name,
                            street: savedAddress.street,
                            city: savedAddress.city,
                            state: savedAddress.state,
                            zip: savedAddress.zip,
                          })
                          setErrors({})
                        }}
                        className="group flex w-full items-start gap-3 rounded-xl border border-line bg-surface-inset p-4 text-left transition hover:border-brand-400/50"
                      >
                        <Icon.Pin className="mt-0.5 size-4 shrink-0 text-brand-oncanvas" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-ink">
                            {savedAddress.label} — {savedAddress.name}
                          </span>
                          <span className="mt-0.5 block text-xs text-ink-muted">
                            {savedAddress.street}, {savedAddress.city}, {savedAddress.state}{' '}
                            {savedAddress.zip}
                          </span>
                        </span>
                        <span className="shrink-0 text-[11px] font-semibold text-brand-oncanvas">
                          Use this
                        </span>
                      </button>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        id="name"
                        label="Full name"
                        value={address.name}
                        onChange={(e) => setAddress({ ...address, name: e.target.value })}
                        error={errors.name}
                        autoComplete="name"
                      />
                      <Field
                        id="label"
                        label="Label"
                        value={address.label}
                        onChange={(e) => setAddress({ ...address, label: e.target.value })}
                        placeholder="Home"
                      />
                    </div>

                    <Field
                      id="street"
                      label="Street address"
                      value={address.street}
                      onChange={(e) => setAddress({ ...address, street: e.target.value })}
                      error={errors.street}
                      autoComplete="street-address"
                    />

                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field
                        id="city"
                        label="City"
                        value={address.city}
                        onChange={(e) => setAddress({ ...address, city: e.target.value })}
                        error={errors.city}
                        autoComplete="address-level2"
                      />
                      <Field
                        id="state"
                        label="State"
                        value={address.state}
                        onChange={(e) => setAddress({ ...address, state: e.target.value })}
                        error={errors.state}
                        autoComplete="address-level1"
                      />
                      <Field
                        id="zip"
                        label="Postcode"
                        value={address.zip}
                        onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                        error={errors.zip}
                        autoComplete="postal-code"
                      />
                    </div>

                    <div className="rounded-xl border border-line bg-surface-inset p-4">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-bold text-ink">Standard delivery</span>
                        <span className="text-sm font-semibold text-brand-oncanvas">
                          {shipping > SHIPPING_THRESHOLD ? 'Free' : money(shipping)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-ink-muted">
                        Delivered in 2–4 business days. Shipping is free on orders over{' '}
                        {money(SHIPPING_THRESHOLD)}.
                      </p>
                    </div>
                  </div>
                )}

                {step === 'payment' && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-lg font-bold text-ink">Payment</h2>
                      <p className="mt-1 text-sm text-ink-muted">
                        Choose how you would like to pay. We record the choice on the order and
                        sort out the money with you before it ships.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {PAYMENT_METHODS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setMethod(option.id)}
                          aria-pressed={method === option.id}
                          className={`rounded-xl border p-4 text-left transition ${
                            method === option.id
                              ? 'border-brand-400/60 bg-brand-500/12'
                              : 'border-line bg-surface-inset hover:border-line-strong'
                          }`}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-ink">{option.title}</span>
                            {method === option.id && (
                              <span className="badge shrink-0 bg-brand-500/15 text-brand-oncanvas">
                                Selected
                              </span>
                            )}
                          </span>
                          <span className="mt-1 block text-xs text-ink-muted">{option.detail}</span>
                        </button>
                      ))}
                    </div>

                    <div>
                      <label htmlFor="notes" className="label">
                        Delivery notes (optional)
                      </label>
                      <textarea
                        id="notes"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Gate code, safe place, anything the courier should know."
                        className="input mt-2 resize-y"
                      />
                    </div>
                  </div>
                )}

                {step === 'review' && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-lg font-bold text-ink">Review and confirm</h2>
                      <p className="mt-1 text-sm text-ink-muted">
                        Check the details below before placing the order.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <ReviewTile
                        label="Contact"
                        onEdit={() => setStep('contact')}
                        value={email}
                        detail={phone || 'No phone given'}
                      />
                      <ReviewTile
                        label="Shipping"
                        onEdit={() => setStep('shipping')}
                        value={`${address.name}, ${address.street}`}
                        detail={`${address.city}, ${address.state} ${address.zip} · Standard delivery`}
                      />
                      <ReviewTile
                        label="Payment"
                        onEdit={() => setStep('payment')}
                        value={methodLabel}
                        detail={PAYMENT_METHODS.find((m) => m.id === method)?.detail ?? ''}
                      />
                    </div>

                    <div>
                      <span className="label">Items ({itemCount})</span>
                      <Stagger className="mt-2 space-y-2" stagger={0.05}>
                        {cartProducts.map(({ product, quantity }) => (
                          <StaggerItem key={product.id}>
                            <div className="flex items-center gap-3 rounded-xl border border-line-faint bg-surface-inset p-2.5">
                              <span className="size-12 shrink-0 overflow-hidden rounded-lg bg-ink">
                                <ProductVisual product={product} className="size-full" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="line-clamp-1 block text-sm font-semibold text-ink">
                                  {product.name}
                                </span>
                                <span className="block text-[11px] text-ink-subtle">
                                  Qty {quantity} · {money(product.price)} each
                                </span>
                              </span>
                              <span className="shrink-0 text-sm font-semibold text-ink">
                                {moneyExact(product.price * quantity)}
                              </span>
                            </div>
                          </StaggerItem>
                        ))}
                      </Stagger>
                    </div>

                    {notes.trim() && (
                      <div className="rounded-xl border border-line-faint bg-surface-inset p-3">
                        <p className="text-[11px] tracking-wide text-ink-subtle uppercase">
                          Delivery notes
                        </p>
                        <p className="mt-1 text-sm text-body">{notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation ------------------------------------------------ */}
            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6">
              {stepIndex > 0 && (
                <button
                  onClick={() => setStep(STEPS[stepIndex - 1].id)}
                  className="btn-ghost"
                >
                  <Icon.ArrowRight className="size-4 rotate-180" />
                  Back
                </button>
              )}

              {step === 'review' ? (
                <Magnetic strength={0.18} className="flex-1 sm:flex-none">
                  <button
                    onClick={place}
                    disabled={placing}
                    className="btn-primary sheen w-full px-8 py-3.5"
                  >
                    {placing ? (
                      <>
                        <span className="size-4 animate-spin rounded-full border-2 border-line-strong border-t-white" />
                        Placing order…
                      </>
                    ) : (
                      <>
                        <Icon.Shield className="size-4" />
                        Place order · ${total.toFixed(2)}
                      </>
                    )}
                  </button>
                </Magnetic>
              ) : (
                <Magnetic strength={0.18} className="flex-1 sm:flex-none">
                  <button onClick={next} className="btn-primary sheen w-full px-8 py-3.5">
                    Continue
                    <Icon.ArrowRight className="size-4" />
                  </button>
                </Magnetic>
              )}

              <Link
                to="/cart"
                className="btn-quiet ml-auto text-sm"
                onClick={(e) => {
                  if (placing) {
                    e.preventDefault()
                    return
                  }
                }}
              >
                Back to cart
              </Link>
            </div>
          </div>

          {/* Summary ---------------------------------------------------- */}
          <aside className="lg:sticky lg:top-32 lg:self-start">
            <div className="panel p-5">
              <h2 className="text-sm font-bold text-ink">Order summary</h2>

              <dl className="mt-4 space-y-2.5 text-sm">
                <SummaryRow label={`Subtotal (${itemCount} ${itemCount === 1 ? 'item' : 'items'})`}>
                  ${subtotal.toFixed(2)}
                </SummaryRow>
                <SummaryRow label="Shipping" tone={shipping === 0 ? 'emerald' : undefined}>
                  {shipping === 0 ? 'FREE' : moneyExact(shipping)}
                </SummaryRow>
                <SummaryRow label={`Sales tax (${(TAX_RATE * 100).toFixed(0)}%)`}>
                  ${tax.toFixed(2)}
                </SummaryRow>
              </dl>

              <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
                <span className="text-sm font-semibold text-body">Total</span>
                <span className="font-display text-2xl font-extrabold text-ink">
                  ${total.toFixed(2)}
                </span>
              </div>

              <div className="mt-5">
                <ProgressMeter
                  value={Math.min(1, subtotal / 150)}
                  tone={subtotal >= 150 ? 'emerald' : 'brand'}
                />
                <p className="mt-2 text-[11px] text-ink-subtle">
                  {subtotal >= 150
                    ? 'Free standard shipping unlocked.'
                    : `Add $${(150 - subtotal).toFixed(2)} for free standard shipping.`}
                </p>
              </div>

              <button
                onClick={() => navigate('/cart')}
                className="btn-ghost btn-sm mt-5 w-full"
              >
                Edit cart
              </button>

              <ul className="mt-5 space-y-2 border-t border-line-faint pt-4">
                {[
                  { icon: <Icon.Shield className="size-3.5" />, text: 'Encrypted, PCI-compliant checkout' },
                  { icon: <Icon.Refresh className="size-3.5" />, text: '30-day free returns' },
                  { icon: <Icon.Truck className="size-3.5" />, text: 'Tracked from dispatch to door' },
                ].map((item) => (
                  <li key={item.text} className="flex items-center gap-2 text-[11px] text-ink-subtle">
                    <span className="text-emerald-400">{item.icon}</span>
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>

      <TrustBar />
    </SiteLayout>
  )
}

/* -------------------------------------------------------------------------- */
/*  Small building blocks                                                     */
/* -------------------------------------------------------------------------- */

function Field({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  type = 'text',
  inputMode,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  placeholder?: string
  type?: string
  inputMode?: 'numeric' | 'text'
  autoComplete?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
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

function SummaryRow({
  label,
  children,
  tone,
}: {
  label: string
  children: React.ReactNode
  tone?: 'emerald'
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-subtle">{label}</dt>
      <dd
        className={`font-semibold ${
          tone === 'emerald' ? 'text-emerald-400' : 'text-body tabular-nums'
        }`}
      >
        {children}
      </dd>
    </div>
  )
}

function ReviewTile({
  label,
  value,
  detail,
  onEdit,
}: {
  label: string
  value: string
  detail: string
  onEdit: () => void
}) {
  return (
    <div className="rounded-xl border border-line-faint bg-surface-inset p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] tracking-[0.14em] text-ink-subtle uppercase">{label}</span>
        <button
          onClick={onEdit}
          className="text-[11px] font-semibold text-brand-oncanvas transition hover:text-brand-oncanvas"
        >
          Edit
        </button>
      </div>
      <p className="mt-2 text-sm font-semibold text-ink">{value || 'Not set'}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{detail}</p>
    </div>
  )
}
