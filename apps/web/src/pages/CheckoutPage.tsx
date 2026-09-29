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

const EXPRESS = 24.95

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

function formatCard(value: string) {
  const nums = digits(value).slice(0, 19)
  return nums.replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(value: string) {
  const nums = digits(value).slice(0, 4)
  if (nums.length <= 2) return nums
  return `${nums.slice(0, 2)} / ${nums.slice(2)}`
}

export function CheckoutPage() {
  const { cartProducts, subtotal, discount, tax, promo, itemCount, clearCart } = useCart()
  const { profile, signedIn, addresses, payments, placeOrder } = useAccount()
  const { push } = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState<StepId>('contact')
  const [email, setEmail] = useState(profile.email)
  const [phone, setPhone] = useState(profile.phone)
  const [address, setAddress] = useState(EMPTY_ADDRESS)
  const [speed, setSpeed] = useState<'express' | 'standard'>('express')
  const [method, setMethod] = useState<'saved' | 'new'>(payments[0] ? 'saved' : 'new')
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' })
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [placing, setPlacing] = useState(false)
  const [orderCode, setOrderCode] = useState<string | null>(null)

  const savedAddress = addresses.find((a) => a.isDefault) ?? addresses[0]
  const savedCard = payments.find((p) => p.isDefault) ?? payments[0]

  const shipping = useMemo(() => {
    if (promo?.waivesShipping) return 0
    if (speed === 'express') return subtotal >= 150 ? EXPRESS : 14.99 + EXPRESS
    return subtotal >= 150 ? 0 : 14.99
  }, [promo, speed, subtotal])

  const total = Math.max(0, subtotal - discount) + shipping + tax

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

    if (target === 'payment' && method === 'new') {
      if (!luhnValid(card.number)) next.card = 'That card number is not valid'
      const [mm, yy] = card.expiry.split('/').map((p) => digits(p))
      if (!mm || Number(mm) < 1 || Number(mm) > 12) next.expiry = 'MM / YY'
      else if (yy) {
        const now = new Date()
        const expiry = new Date(2000 + Number(yy), Number(mm), 1)
        if (expiry <= now) next.expiry = 'That card has expired'
      }
      if (digits(card.cvc).length < 3) next.cvc = '3 or 4 digits'
      if (!card.name.trim()) next.cardName = 'Name as printed on the card'
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

  const place = () => {
    if (!validate('payment')) {
      setStep('payment')
      return
    }
    if (cartProducts.length === 0) return

    setPlacing(true)
    const cardLast4 = method === 'saved' && savedCard ? savedCard.last4 : digits(card.number).slice(-4)

    // A short delay so the confirmation animation reads as a real transaction.
    window.setTimeout(() => {
      const order = placeOrder({
        email,
        address: {
          label: address.label || 'Shipping',
          name: address.name,
          street: address.street,
          city: address.city,
          state: address.state,
          zip: address.zip,
        },
        cardLast4,
        speed,
        notes: notes.trim() || undefined,
        items: cartProducts.map(({ product, quantity }) => ({
          productId: product.id,
          name: product.name,
          quantity,
          price: product.price,
        })),
        subtotal,
        discount,
        shipping,
        tax,
        total,
      })

      clearCart()
      setPlacing(false)
      setOrderCode(order.code)
      push({ tone: 'success', title: `Order ${order.code} placed` })
    }, 900)
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
            This is a demonstration store, so no payment was taken and nothing will ship.
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
            body="Add something to your cart first. Guest checkout works without an account."
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
            ? `Signed in as ${profile.email}`
            : 'Checking out as a guest — no account needed.'}
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
                          Checking out as a guest. To keep your orders and addresses on file,{' '}
                          <Link to="/account" className="font-semibold text-brand-oncanvas hover:text-brand-oncanvas">
                            sign in or create an account
                          </Link>{' '}
                          first — your cart will carry over.
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

                    <div>
                      <span className="label">Delivery speed</span>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        {(
                          [
                            {
                              id: 'express' as const,
                              title: 'Express',
                              detail: 'Next business day, insured',
                              price: subtotal >= 150 ? `$${EXPRESS.toFixed(2)}` : `$${(14.99 + EXPRESS).toFixed(2)}`,
                            },
                            {
                              id: 'standard' as const,
                              title: 'Standard',
                              detail: '2–4 business days',
                              price: subtotal >= SHIPPING_THRESHOLD ? 'Free' : money(FLAT_SHIPPING),
                            },
                          ]
                        ).map((option) => (
                          <button
                            key={option.id}
                            onClick={() => setSpeed(option.id)}
                            aria-pressed={speed === option.id}
                            className={`rounded-xl border p-4 text-left transition ${
                              speed === option.id
                                ? 'border-brand-400/60 bg-brand-500/12'
                                : 'border-line bg-surface-inset hover:border-line-strong'
                            }`}
                          >
                            <span className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold text-ink">{option.title}</span>
                              <span className="text-sm font-semibold text-brand-oncanvas">
                                {option.price}
                              </span>
                            </span>
                            <span className="mt-1 block text-xs text-ink-muted">{option.detail}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 'payment' && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-lg font-bold text-ink">Payment</h2>
                      <p className="mt-1 text-sm text-ink-muted">
                        A demonstration store — nothing is charged and no card data is stored.
                      </p>
                    </div>

                    {savedCard && (
                      <button
                        onClick={() => setMethod('saved')}
                        aria-pressed={method === 'saved'}
                        className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${
                          method === 'saved'
                            ? 'border-brand-400/60 bg-brand-500/12'
                            : 'border-line bg-surface-inset hover:border-line-strong'
                        }`}
                      >
                        <Icon.Card className="size-5 shrink-0 text-brand-oncanvas" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-ink">
                            {savedCard.brand} ending {savedCard.last4}
                          </span>
                          <span className="block text-xs text-ink-muted">
                            Expires {savedCard.expiry}
                          </span>
                        </span>
                        {savedCard.isDefault && (
                          <span className="badge shrink-0 bg-emerald-500/15 text-emerald-300">
                            Default
                          </span>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => setMethod('new')}
                      aria-pressed={method === 'new'}
                      className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${
                        method === 'new'
                          ? 'border-brand-400/60 bg-brand-500/12'
                          : 'border-line bg-surface-inset hover:border-line-strong'
                      }`}
                    >
                      <Icon.Plus className="size-5 shrink-0 text-brand-oncanvas" />
                      <span className="text-sm font-semibold text-ink">Use a different card</span>
                    </button>

                    {method === 'new' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4 overflow-hidden"
                      >
                        <Field
                          id="card"
                          label="Card number"
                          value={card.number}
                          onChange={(e) => setCard({ ...card, number: formatCard(e.target.value) })}
                          error={errors.card}
                          placeholder="4242 4242 4242 4242"
                          inputMode="numeric"
                          autoComplete="cc-number"
                        />
                        <div className="grid gap-4 sm:grid-cols-3">
                          <Field
                            id="expiry"
                            label="Expiry"
                            value={card.expiry}
                            onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                            error={errors.expiry}
                            placeholder="MM / YY"
                            inputMode="numeric"
                            autoComplete="cc-exp"
                          />
                          <Field
                            id="cvc"
                            label="CVC"
                            value={card.cvc}
                            onChange={(e) =>
                              setCard({ ...card, cvc: digits(e.target.value).slice(0, 4) })
                            }
                            error={errors.cvc}
                            placeholder="123"
                            inputMode="numeric"
                            autoComplete="cc-csc"
                          />
                          <Field
                            id="cardName"
                            label="Name on card"
                            value={card.name}
                            onChange={(e) => setCard({ ...card, name: e.target.value })}
                            error={errors.cardName}
                            autoComplete="cc-name"
                          />
                        </div>
                        <p className="text-[11px] text-ink-subtle">
                          Any Luhn-valid test number works, e.g. 4242 4242 4242 4242.
                        </p>
                      </motion.div>
                    )}

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
                        detail={`${address.city}, ${address.state} ${address.zip} · ${
                          speed === 'express' ? 'Express' : 'Standard'
                        }`}
                      />
                      <ReviewTile
                        label="Payment"
                        onEdit={() => setStep('payment')}
                        value={
                          method === 'saved' && savedCard
                            ? `${savedCard.brand} ···· ${savedCard.last4}`
                            : card.number
                              ? `···· ${digits(card.number).slice(-4)}`
                              : 'Not set'
                        }
                        detail={method === 'saved' ? 'Saved card' : card.name || 'New card'}
                      />
                    </div>

                    <div>
                      <span className="label">Items ({itemCount})</span>
                      <Stagger className="mt-2 space-y-2" stagger={0.05}>
                        {cartProducts.map(({ product, quantity }) => (
                          <StaggerItem key={product.id}>
                            <div className="flex items-center gap-3 rounded-xl border border-line-faint bg-surface-inset p-2.5">
                              <span
                                className="relative size-12 shrink-0 overflow-hidden rounded-lg"
                                style={{
                                  background: `linear-gradient(140deg, hsl(${product.hue} 60% 20%), #070911)`,
                                }}
                              >
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
                {promo && (
                  <SummaryRow label={`Discount · ${promo.code}`} tone="emerald">
                    &minus;${discount.toFixed(2)}
                  </SummaryRow>
                )}
                <SummaryRow label="Shipping" tone={shipping === 0 ? 'emerald' : undefined}>
                  {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
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
