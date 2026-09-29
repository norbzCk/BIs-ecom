import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES } from '../data/products'
import { useToast } from '../lib/motion/toast'
import { Marquee } from '../lib/motion/marquee'
import { Icon } from './icons'
import { ThemeToggle } from './ThemeToggle'

const TRUST_LINKS = [
  { label: 'Shipping & delivery', to: '/support#shipping' },
  { label: 'Warranty terms', to: '/support#warranty' },
  { label: '30-day returns', to: '/support#returns' },
  { label: 'Compare products', to: '/compare' },
  { label: 'Enterprise procurement', to: '/support#enterprise' },
]

const COMPANY_LINKS = [
  { label: 'About Billionare', to: '/support#about' },
  { label: 'Help centre', to: '/support' },
  { label: 'Your account', to: '/account' },
  { label: 'Deals of the week', to: '/deals' },
  { label: 'Admin console', to: '/admin/login' },
]

const PAYMENTS = ['Visa', 'Mastercard', 'Amex', 'Apple Pay', 'Wire']

export function SiteFooter() {
  const { push } = useToast()
  const [email, setEmail] = useState('')

  const subscribe = (e: FormEvent) => {
    e.preventDefault()
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
    if (!valid) {
      push({ tone: 'error', title: 'That email does not look right', description: 'Check the format and try again.' })
      return
    }
    push({
      tone: 'success',
      title: 'You are on the list',
      description: `Deals and build guides will land in ${email}.`,
    })
    setEmail('')
  }

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-line-faint bg-canvas-raised/60">
      {/* Brand marquee */}
      <div className="border-b border-line-faint py-5">
        <Marquee speed={44} className="font-display">
          {['Intel', 'NVIDIA', 'AMD', 'ASUS', 'BenQ', 'Logitech', 'Razer', 'Billionare'].map(
            (brand) => (
              <span
                key={brand}
                className="mx-8 flex items-center gap-2.5 text-lg font-bold tracking-tight text-ink-faint transition-colors hover:text-body sm:mx-12"
              >
                <span className="size-1.5 rounded-full bg-brand-500/50" />
                {brand}
              </span>
            ),
          )}
        </Marquee>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl border border-line-faint bg-linear-to-br from-brand-500 to-accent-500">
                <img
                  src="/logo.png"
                  alt=""
                  width={24}
                  height={24}
                  className="size-6 rounded-[6px] object-contain"
                />
              </span>
              <span className="font-display text-lg font-extrabold text-ink">Billionare</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">
              Performance hardware, colour-accurate displays and the accessories that make a desk
              worth sitting at. Every unit verified, every warranty direct from the manufacturer.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {['Verified stock', 'Direct warranty', '30-day returns'].map((tag) => (
                <span key={tag} className="chip cursor-default text-[11px]">
                  <Icon.Check className="size-3 text-emerald-400" />
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Shop */}
          <FooterColumn title="Shop" links={CATEGORIES.map((c) => ({ label: c.name, to: `/shop?category=${encodeURIComponent(c.name)}` }))} />

          {/* Help */}
          <FooterColumn title="Help & trust" links={TRUST_LINKS} />

          {/* Newsletter */}
          <div>
            <h3 className="text-sm font-bold text-ink">Get insider deals</h3>
            <p className="mt-3 text-sm text-ink-muted">
              One email a week: build guides, flash discounts and restock alerts. No noise.
            </p>
            <form onSubmit={subscribe} className="mt-4 flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                aria-label="Email address for the newsletter"
                className="input flex-1"
              />
              <button type="submit" className="btn-primary shrink-0">
                Join
              </button>
            </form>

            <div className="mt-5">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-subtle uppercase">
                We accept
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PAYMENTS.map((p) => (
                  <span
                    key={p}
                    className="rounded-md border border-line-faint bg-surface-glass px-2 py-1 text-[10px] font-semibold text-ink-muted"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-line-faint pt-6 sm:flex-row">
          <p className="text-xs text-ink-subtle">
            © {new Date().getFullYear()} Billionare Retail Technologies. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            <FooterColumn title="Company" links={COMPANY_LINKS} inline />
            <ThemeToggle className="size-9" />
          </div>
        </div>
      </div>

      {/* Bottom glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-32 h-64 bg-linear-to-t from-brand-600/20 to-transparent"
      />
    </footer>
  )
}

function FooterColumn({
  title,
  links,
  inline = false,
}: {
  title: string
  links: { label: string; to: string }[]
  inline?: boolean
}) {
  if (inline) {
    return (
      <>
        {links.map((link) => (
          <Link
            key={link.label}
            to={link.to}
            className="link-underline rounded-md px-2 py-1 text-xs text-ink-subtle transition-colors hover:text-body"
          >
            {link.label}
          </Link>
        ))}
      </>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-bold text-ink">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              to={link.to}
              className="group inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
            >
              <span className="h-px w-0 bg-brand-400 transition-all duration-300 group-hover:w-3" />
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
