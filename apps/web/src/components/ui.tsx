import { AnimatePresence, motion } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { money } from '../lib/money'

/* -------------------------------------------------------------------------- */
/*  Breadcrumbs                                                                */
/* -------------------------------------------------------------------------- */

export function Breadcrumbs({
  items,
  className = '',
}: {
  items: { label: string; to?: string }[]
  className?: string
}) {
  return (
    <nav aria-label="Breadcrumb" className={`flex flex-wrap items-center gap-1.5 text-xs ${className}`}>
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="flex items-center gap-1.5">
          {i > 0 && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="size-3 text-ink-faint">
              <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {item.to ? (
            <Link to={item.to} className="text-ink-subtle transition hover:text-brand-oncanvas">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-body">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

/* -------------------------------------------------------------------------- */
/*  Section wrapper — consistent vertical rhythm + optional divider.           */
/* -------------------------------------------------------------------------- */

export function Section({
  children,
  className = '',
  id,
  divider = false,
  bare = false,
}: {
  children: ReactNode
  className?: string
  id?: string
  divider?: boolean
  /** Skip the inner max-width container — caller handles layout. */
  bare?: boolean
}) {
  return (
    <section id={id} className={`relative py-16 sm:py-20 lg:py-24 ${className}`}>
      {bare ? children : (
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
      )}
      {divider && <div className="divider-glow mx-auto max-w-7xl" />}
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  SectionTitle — the standard section header used across the storefront.       */
/* -------------------------------------------------------------------------- */

export function SectionTitle({
  eyebrow,
  title,
  lede,
  action,
  align = 'left',
  className = '',
}: {
  eyebrow?: string
  title: string
  lede?: string
  action?: ReactNode
  align?: 'left' | 'center'
  className?: string
}) {
  return (
    <div
      className={`flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between ${
        align === 'center' ? 'text-center sm:flex-col sm:items-center' : ''
      } ${className}`}
    >
      <div className={align === 'center' ? 'mx-auto max-w-2xl' : 'max-w-2xl'}>
        {eyebrow && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-brand-oncanvas uppercase"
          >
            <span className="h-px w-6 bg-brand-400/60" />
            {eyebrow}
          </motion.p>
        )}
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="mt-2.5 text-2xl font-extrabold text-balance sm:text-3xl lg:text-4xl"
        >
          {title}
        </motion.h2>
        {lede && (
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base"
          >
            {lede}
          </motion.p>
        )}
      </div>

      {action && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.18 }}
          className="shrink-0"
        >
          {action}
        </motion.div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Stat — animated figure with label.                                         */
/* -------------------------------------------------------------------------- */

export function Stat({
  value,
  label,
  hint,
  icon,
  to,
}: {
  value: ReactNode
  label: string
  hint?: string
  icon?: ReactNode
  to?: string
}) {
  const inner = (
    <>
      {icon && (
        <span className="mb-3 flex size-9 items-center justify-center rounded-xl border border-line bg-surface-inset text-brand-oncanvas transition group-hover:border-brand-400/50 group-hover:text-brand-oncanvas">
          {icon}
        </span>
      )}
      <p className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{value}</p>
      <p className="mt-1 text-sm font-medium text-body">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-subtle">{hint}</p>}
    </>
  )

  if (to) {
    return (
      <Link
        to={to}
        className="group panel ring-gradient relative block p-5 transition-transform duration-300 hover:-translate-y-1"
      >
        {inner}
      </Link>
    )
  }

  return <div className="group panel p-5">{inner}</div>
}

/* -------------------------------------------------------------------------- */
/*  EmptyState — used by cart, wishlist, orders, compare and search results.   */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  icon,
  title,
  body,
  action,
  className = '',
}: {
  icon?: ReactNode
  title: string
  body?: string
  action?: { label: string; to: string }
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`panel relative flex flex-col items-center px-6 py-16 text-center ${className}`}
    >
      {icon && (
        <span className="relative mb-5 flex size-16 items-center justify-center rounded-2xl border border-line bg-linear-to-b from-surface-inset to-transparent text-brand-oncanvas">
          <span className="absolute inset-0 animate-pulse-ring rounded-2xl border border-brand-400/40" />
          {icon}
        </span>
      )}
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      {body && <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">{body}</p>}
      {action && (
        <Link to={action.to} className="btn-primary sheen mt-6">
          {action.label}
        </Link>
      )}
    </motion.div>
  )
}

/* -------------------------------------------------------------------------- */
/*  QuantityStepper                                                            */
/* -------------------------------------------------------------------------- */

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  size = 'md',
  label = 'Quantity',
}: {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  size?: 'sm' | 'md'
  label?: string
}) {
  const btn =
    size === 'sm'
      ? 'size-8 text-base'
      : 'size-10 text-lg'

  return (
    <div
      className="inline-flex items-center gap-1 rounded-xl border border-line bg-canvas-raised/70 p-1"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className={`flex ${btn} items-center justify-center rounded-lg text-ink-muted transition hover:bg-surface-glass-hover hover:text-ink active:scale-90 disabled:pointer-events-none disabled:opacity-30`}
      >
        &minus;
      </button>
      <motion.span
        key={value}
        initial={{ opacity: 0, y: -6, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 520, damping: 24 }}
        className="w-8 text-center text-sm font-bold text-ink tabular-nums"
        aria-live="polite"
      >
        {value}
      </motion.span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
        className={`flex ${btn} items-center justify-center rounded-lg text-ink-muted transition hover:bg-surface-glass-hover hover:text-ink active:scale-90 disabled:pointer-events-none disabled:opacity-30`}
      >
        +
      </button>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Tabs — animated underline indicator.                                       */
/* -------------------------------------------------------------------------- */

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className = '',
}: {
  tabs: { id: T; label: string; count?: number }[]
  value: T
  onChange: (id: T) => void
  className?: string
}) {
  return (
    <div
      role="tablist"
      className={`mask-fade-x flex gap-1 overflow-x-auto border-b border-line-faint ${className}`}
    >
      {tabs.map((tab) => {
        const active = tab.id === value
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`relative shrink-0 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
              active ? 'text-ink' : 'text-ink-muted hover:text-body'
            }`}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <span className="ml-1.5 rounded-md bg-surface-inset px-1.5 py-0.5 text-[11px] text-body">
                {tab.count}
              </span>
            )}
            {active && (
              <motion.span
                layoutId="tab-underline"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-linear-to-r from-brand-400 to-accent-400"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Drawer — slide-in panel from the right (mobile nav, mini cart).           */
/* -------------------------------------------------------------------------- */

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'max-w-sm',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  width?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[80] bg-canvas/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`fixed inset-y-0 right-0 z-[90] flex w-full ${width} flex-col border-l border-line bg-canvas-raised/95 backdrop-blur-2xl`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <div className="flex items-center justify-between border-b border-line-faint px-5 py-4">
              <h2 className="text-base font-bold text-ink">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-surface-glass-hover hover:text-ink"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="size-4">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

            {footer && <div className="border-t border-line-faint px-5 py-4">{footer}</div>}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

/* -------------------------------------------------------------------------- */
/*  PriceTag                                                                   */
/* -------------------------------------------------------------------------- */

export function PriceTag({
  price,
  compareAt,
  size = 'md',
  className = '',
}: {
  price: number
  compareAt?: number | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const scale = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-3xl sm:text-4xl',
  }[size]

  return (
    <span className={`flex flex-wrap items-baseline gap-2 ${className}`}>
      <span className={`font-display font-extrabold tracking-tight text-ink ${scale}`}>
        {money(price)}
      </span>
      {compareAt && compareAt > price && (
        <span className={`text-ink-subtle line-through ${size === 'lg' ? 'text-base' : 'text-xs'}`}>
          {money(compareAt)}
        </span>
      )}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/*  StockPill                                                                  */
/* -------------------------------------------------------------------------- */

export function StockPill({ stock, label }: { stock: number; label?: string }) {
  const tone =
    stock <= 3
      ? 'border-rose-400/30 bg-rose-500/12 text-rose-300'
      : stock <= 10
        ? 'border-amber-400/30 bg-amber-500/12 text-amber-300'
        : 'border-emerald-400/30 bg-emerald-500/12 text-emerald-300'

  const dot = stock <= 3 ? 'bg-rose-400' : stock <= 10 ? 'bg-amber-400' : 'bg-emerald-400'

  return (
    <span className={`badge border ${tone}`}>
      <span className={`size-1.5 rounded-full ${dot}`}>
        {stock <= 10 && <span className={`absolute size-1.5 animate-ping rounded-full ${dot}`} />}
      </span>
      {label ?? (stock <= 3 ? `Only ${stock} left` : 'In stock')}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/*  ProgressMeter — animated bar (free-shipping threshold, stock, etc).        */
/* -------------------------------------------------------------------------- */

export function ProgressMeter({
  value,
  tone = 'brand',
  className = '',
}: {
  /** 0..1 */
  value: number
  tone?: 'brand' | 'emerald' | 'amber'
  className?: string
}) {
  const gradients = {
    brand: 'from-brand-500 to-accent-400',
    emerald: 'from-emerald-500 to-teal-400',
    amber: 'from-amber-500 to-orange-400',
  }
  const clamped = Math.max(0, Math.min(1, value))

  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-surface-inset ${className}`}>
      <motion.div
        className={`h-full rounded-full bg-linear-to-r ${gradients[tone]}`}
        initial={{ width: 0 }}
        animate={{ width: `${clamped * 100}%` }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  )
}
