import { motion } from 'motion/react'
import { Link, useLocation } from 'react-router-dom'
import { SiteLayout } from '../components/SiteLayout'
import { Icon } from '../components/icons'
import { Section } from '../components/ui'
import { Magnetic } from '../lib/motion/interactive'
import { Stagger, StaggerItem } from '../lib/motion/reveal'
import { CATEGORIES, products } from '../data/products'
import { SHIPPING_THRESHOLD } from '../lib/cart-context'
import { money } from '../lib/money'

const SUGGESTIONS = [
  { label: 'Shop everything', to: '/shop', icon: 'Search' },
  { label: 'Current deals', to: '/deals', icon: 'Tag' },
  { label: 'Compare products', to: '/compare', icon: 'Scale' },
  { label: 'Support & FAQ', to: '/support', icon: 'Info' },
] as const

export function NotFoundPage() {
  const { pathname } = useLocation()

  return (
    <SiteLayout>
      <Section>
        <div className="relative mx-auto flex max-w-2xl flex-col items-center py-10 text-center">
          <motion.div
            aria-hidden
            className="absolute top-0 left-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600/20 blur-[100px]"
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.65, 0.4] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />

          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative font-display text-7xl font-extrabold tracking-tight text-transparent sm:text-8xl"
            style={{
              backgroundImage: 'linear-gradient(135deg, #5b76ff, #22d3ee 55%, #a78bfa)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
            }}
          >
            404
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="relative mt-4 text-2xl font-extrabold text-balance sm:text-3xl"
          >
            This page does not exist
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="relative mt-3 max-w-md text-sm leading-relaxed text-ink-muted sm:text-base"
          >
            The link may be out of date, or the product may have been retired. Nothing is broken on
            your side — here is where to go instead.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="relative mt-4 max-w-full truncate rounded-lg border border-line-faint bg-surface-glass px-3 py-1.5 font-mono text-xs text-ink-subtle"
          >
            {pathname}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.26 }}
            className="relative mt-8 flex flex-wrap justify-center gap-3"
          >
            <Magnetic strength={0.2}>
              <Link to="/" className="btn-primary sheen px-7 py-3.5">
                <Icon.Laptop className="size-4" />
                Back to home
              </Link>
            </Magnetic>
            <Link to="/shop" className="btn-ghost px-7 py-3.5">
              <Icon.Search className="size-4" />
              Browse the catalog
            </Link>
          </motion.div>

          <Stagger className="relative mt-12 grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4" stagger={0.07}>
            {SUGGESTIONS.map((s) => {
              const IconS = Icon[s.icon] ?? Icon.ArrowRight
              return (
                <StaggerItem key={s.to}>
                  <Link
                    to={s.to}
                    className="group panel flex items-center gap-3 p-4 text-left transition-transform duration-300 hover:-translate-y-0.5"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-inset text-brand-oncanvas transition group-hover:border-brand-400/50">
                      <IconS className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-semibold text-ink">
                      {s.label}
                    </span>
                    <Icon.ArrowRight className="size-3.5 shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-brand-oncanvas" />
                  </Link>
                </StaggerItem>
              )
            })}
          </Stagger>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="relative mt-10 w-full"
          >
            <p className="text-[11px] font-semibold tracking-[0.18em] text-ink-subtle uppercase">
              Popular categories
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {CATEGORIES.map((category) => (
                <Link
                  key={category.name}
                  to={`/shop?category=${encodeURIComponent(category.name)}`}
                  className="chip px-3.5 py-1.5"
                >
                  {category.name}
                </Link>
              ))}
            </div>
            <p className="mt-5 text-xs text-ink-faint">
              {products.length} products in stock · Free shipping over {money(SHIPPING_THRESHOLD)}
            </p>
          </motion.div>
        </div>
      </Section>
    </SiteLayout>
  )
}
