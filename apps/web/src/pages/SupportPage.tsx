import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SiteLayout } from '../components/SiteLayout'
import { Icon } from '../components/icons'
import { Breadcrumbs, Section, SectionTitle, Tabs } from '../components/ui'
import { Counter } from '../lib/motion/counter'
import { Magnetic } from '../lib/motion/interactive'
import { Reveal, Stagger, StaggerItem } from '../lib/motion/reveal'
import { useToast } from '../lib/motion/toast'

type Channel = 'orders' | 'warranty' | 'advice'

const CHANNELS = [
  {
    id: 'Orders',
    icon: 'Truck',
    blurb: 'Tracking, changes, returns',
    detail:
      'Order changes are free until the parcel is picked. After that it is already boxed, so we will arrange a return instead.',
  },
  {
    id: 'Warranty',
    icon: 'Shield',
    blurb: 'Claims and repairs',
    detail:
      'Warranties are handled by us, not a third-party desk. Send a photo or a short video and we will ship a replacement.',
  },
  {
    id: 'Advice',
    icon: 'Compass',
    blurb: 'Fit and compatibility',
    detail:
      'Tell us what you already own and what you want to end up with. We will tell you honestly if something does not fit.',
  },
] as const

const FAQS = [
  {
    q: 'Is this a real store?',
    a: 'No. Billionare is a demonstration storefront. The catalog, cart and checkout all work end to end, but no payment is taken and no card details leave your browser.',
    group: 'orders' as Channel,
  },
  {
    q: 'Do I need an account to buy?',
    a: 'Yes, you need an account to place an order, because the order history is tied to it. You can fill in the checkout form first and sign in when you are ready to pay.',
    group: 'orders' as Channel,
  },
  {
    q: 'How long does delivery take?',
    a: 'In-stock items are dispatched the same day and arrive in two to four business days. Every product page states its own estimate before you add it to the cart.',
    group: 'orders' as Channel,
  },
  {
    q: 'What is the return window?',
    a: 'Thirty days from delivery, for any reason. A prepaid label is included in every box, and refunds land on the original payment method.',
    group: 'orders' as Channel,
  },
  {
    q: 'What does the warranty cover?',
    a: 'Three years against manufacturing defects on all hardware, and one year on refurbished units. Accidental damage is not covered, but we sell insurance for it.',
    group: 'warranty' as Channel,
  },
  {
    q: 'How do I start a claim?',
    a: 'Message us with your order number and a photo or short video of the fault. Claims are usually resolved within one business day.',
    group: 'warranty' as Channel,
  },
  {
    q: 'Will this fit my desk setup?',
    a: 'Almost certainly, and we will confirm it. Every product page lists dimensions and weight, and the support form lets you describe your setup so we can check.',
    group: 'advice' as Channel,
  },
  {
    q: 'Can you build a full workstation for me?',
    a: 'Yes. Describe the workload, the budget and any hardware you already own. We reply with a shortlist and the reasoning behind it.',
    group: 'advice' as Channel,
  },
]

const EMAIL = 'support@billionare.example'

export function SupportPage() {
  const [channel, setChannel] = useState<Channel>('orders')
  const [openFaq, setOpenFaq] = useState<string | null>(FAQS[0].q)
  const [form, setForm] = useState({ name: '', email: '', order: '', message: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)
  const { push } = useToast()

  const visibleFaqs = useMemo(() => FAQS.filter((f) => f.group === channel), [channel])

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Tell us who you are'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) next.email = 'Enter a valid email address'
    if (form.message.trim().length < 12) next.message = 'A little more detail helps us answer properly'

    setErrors(next)
    if (Object.keys(next).length > 0) {
      push({ tone: 'error', title: 'Check the highlighted fields' })
      return
    }

    setSent(true)
    push({
      tone: 'success',
      title: 'Message queued',
      description: `We will reply to ${form.email}`,
    })
  }

  const reset = () => {
    setForm({ name: '', email: '', order: '', message: '' })
    setSent(false)
  }

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Support' }]} />
      </div>

      {/* Hero ----------------------------------------------------------- */}
      <Section className="!pt-10">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div>
            <SectionTitle
              eyebrow="Support"
              title="Answers before you have to ask"
              lede="Everything about orders, warranties and getting the right hardware. If the answer is not here, the form below reaches a person."
            />

            <Reveal delay={0.15}>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="panel p-4">
                  <p className="text-[11px] tracking-wide text-ink-subtle uppercase">
                    Median reply time
                  </p>
                  <p className="font-display mt-1 text-2xl font-extrabold text-ink">
                    &lt; 4 hours
                  </p>
                </div>
                <div className="panel p-4">
                  <p className="text-[11px] tracking-wide text-ink-subtle uppercase">
                    Satisfaction
                  </p>
                  <p className="font-display mt-1 text-2xl font-extrabold text-ink">
                    <Counter to={98} suffix="%" />
                  </p>
                </div>
                <div className="panel p-4">
                  <p className="text-[11px] tracking-wide text-ink-subtle uppercase">
                    Returns window
                  </p>
                  <p className="font-display mt-1 text-2xl font-extrabold text-ink">30 days</p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.25}>
              <div className="panel mt-4 flex flex-wrap items-center gap-3 p-4">
                <span className="flex size-10 items-center justify-center rounded-xl border border-line bg-surface-inset text-brand-oncanvas">
                  <Icon.Mail className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ink-subtle">Prefer email?</p>
                  <a
                    href={`mailto:${EMAIL}`}
                    className="text-sm font-semibold text-ink transition hover:text-brand-oncanvas"
                  >
                    {EMAIL}
                  </a>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Form -------------------------------------------------------- */}
          <Reveal delay={0.1}>
            <div className="panel ring-gradient relative p-6 sm:p-8">
              <AnimatePresence mode="wait">
                {sent ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col items-center py-10 text-center"
                  >
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 16 }}
                      className="flex size-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400"
                    >
                      <Icon.Check className="size-7" />
                    </motion.span>
                    <h2 className="mt-5 text-lg font-bold text-ink">Message received</h2>
                    <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-muted">
                      Thanks {form.name.split(' ')[0]}. This is a demo, so nothing was actually sent —
                      but in a live store a real reply would land in your inbox within a few hours.
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      <button onClick={reset} className="btn-ghost btn-sm">
                        <Icon.Refresh className="size-3.5" />
                        Send another
                      </button>
                      <Link to="/shop" className="btn-primary btn-sm">
                        Back to the catalog
                      </Link>
                    </div>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={submit}
                    noValidate
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <div>
                      <h2 className="text-lg font-bold text-ink">Contact support</h2>
                      <p className="mt-1 text-sm text-ink-muted">
                        Give us an order number if it is about a purchase — it halves the back and
                        forth.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        id="name"
                        label="Your name"
                        value={form.name}
                        onChange={set('name')}
                        error={errors.name}
                        placeholder="Alex Mercer"
                        autoComplete="name"
                      />
                      <Field
                        id="email"
                        label="Email"
                        type="email"
                        value={form.email}
                        onChange={set('email')}
                        error={errors.email}
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </div>

                    <Field
                      id="order"
                      label="Order number"
                      value={form.order}
                      onChange={set('order')}
                      placeholder="Optional — e.g. BNR-40218"
                    />

                    <div>
                      <label htmlFor="message" className="label">
                        How can we help?
                      </label>
                      <textarea
                        id="message"
                        rows={5}
                        value={form.message}
                        onChange={set('message')}
                        placeholder="Describe the issue, or what you are trying to build."
                        aria-invalid={Boolean(errors.message)}
                        aria-describedby={errors.message ? 'message-error' : undefined}
                        className={`input mt-2 resize-y ${errors.message ? '!border-rose-400/60' : ''}`}
                      />
                      {errors.message && (
                        <p id="message-error" className="mt-1.5 text-[11px] text-rose-300">
                          {errors.message}
                        </p>
                      )}
                    </div>

                    <Magnetic strength={0.15} className="w-full">
                      <button type="submit" className="btn-primary sheen w-full px-6 py-3.5">
                        <Icon.Mail className="size-4" />
                        Send message
                      </button>
                    </Magnetic>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* Channels ------------------------------------------------------- */}
      <Section divider>
        <Stagger className="grid gap-4 md:grid-cols-3" stagger={0.09}>
          {CHANNELS.map((c) => {
            const IconC = Icon[c.icon] ?? Icon.Info
            return (
              <StaggerItem key={c.id} className="h-full">
                <div className="panel h-full p-6">
                  <span className="flex size-11 items-center justify-center rounded-xl border border-line bg-surface-inset text-brand-oncanvas">
                    <IconC className="size-5" />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-ink">{c.id}</h3>
                  <p className="mt-0.5 text-xs tracking-wide text-brand-oncanvas">{c.blurb}</p>
                  <p className="mt-3 text-sm leading-relaxed text-ink-muted">{c.detail}</p>
                </div>
              </StaggerItem>
            )
          })}
        </Stagger>
      </Section>

      {/* FAQ ------------------------------------------------------------ */}
      <Section>
        <div className="mx-auto max-w-3xl">
          <SectionTitle
            align="center"
            eyebrow="FAQ"
            title="Frequently asked"
            lede="Grouped by what you are most likely dealing with."
          />

          <div className="mt-8">
            <Tabs
              value={channel}
              onChange={(id) => {
                setChannel(id)
                const first = FAQS.find((f) => f.group === id)
                setOpenFaq(first?.q ?? null)
              }}
              className="justify-center"
              tabs={CHANNELS.map((c) => ({
                id: c.id.toLowerCase() as Channel,
                label: c.id,
              }))}
            />

            <div className="mt-5 space-y-2">
              <AnimatePresence initial={false}>
                {visibleFaqs.map((faq) => {
                  const open = openFaq === faq.q
                  return (
                    <motion.div
                      key={faq.q}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className={`panel overflow-hidden ${open ? 'ring-gradient' : ''}`}
                    >
                      <button
                        onClick={() => setOpenFaq(open ? null : faq.q)}
                        aria-expanded={open}
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                      >
                        <span
                          className={`text-sm font-semibold transition-colors ${
                            open ? 'text-ink' : 'text-body'
                          }`}
                        >
                          {faq.q}
                        </span>
                        <motion.span
                          animate={{ rotate: open ? 45 : 0 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-line text-ink-muted"
                        >
                          <Icon.Plus className="size-3.5" />
                        </motion.span>
                      </button>

                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                          >
                            <p className="border-t border-line-faint px-5 py-4 text-sm leading-relaxed text-ink-muted">
                              {faq.a}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </Section>
    </SiteLayout>
  )
}

/* -------------------------------------------------------------------------- */

function Field({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  type = 'text',
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  placeholder?: string
  type?: string
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
