import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { SiteLayout } from '../components/SiteLayout'
import { TrustBar } from '../components/TrustBar'
import { Icon } from '../components/icons'
import { StarRating } from '../components/StarRating'
import { Breadcrumbs, EmptyState, Section, SectionTitle } from '../components/ui'
import type { Product } from '../types'
import { CATEGORIES, products } from '../data/products'
import { Counter } from '../lib/motion/counter'
import { Magnetic } from '../lib/motion/interactive'
import { Reveal, Stagger, StaggerItem } from '../lib/motion/reveal'
import { useToast } from '../lib/motion/toast'
import { useCart } from '../lib/cart-context'
import { money, SYMBOL } from '../lib/money'

type Band = 'all' | 'bestsellers' | 'clearance' | 'openbox'

const BANDS: { id: Band; label: string; blurb: string }[] = [
  { id: 'all', label: 'Everything on deal', blurb: 'Every active price drop, in one place.' },
  { id: 'bestsellers', label: 'Bestsellers', blurb: 'What people actually buy most often.' },
  { id: 'clearance', label: 'Clearance', blurb: 'Last units, lowest price, while stock lasts.' },
  { id: 'openbox', label: 'Open box', blurb: 'Refurbished units with a full-year warranty.' },
]

function discountOf(product: Product) {
  if (!product.compareAtPrice) return 0
  return Math.round((1 - product.price / product.compareAtPrice) * 100)
}

export function DealsPage() {
  const [band, setBand] = useState<Band>('all')
  const { addItem } = useCart()
  const { push } = useToast()

  const deals = useMemo(() => {
    const all = products.filter((p) => discountOf(p) > 0 || p.featured)
    switch (band) {
      case 'bestsellers':
        return all
          .filter((p) => p.featured || p.rating >= 4.8)
          .sort((a, b) => b.reviewCount - a.reviewCount)
      case 'clearance':
        return all.filter((p) => p.stock > 0 && p.stock <= 12).sort((a, b) => a.stock - b.stock)
      case 'openbox':
        return all.filter((p) => (p.condition ?? '').toLowerCase().includes('open box'))
      default:
        return all.sort((a, b) => discountOf(b) - discountOf(a))
    }
  }, [band])

  const deepest = deals.reduce((best, p) => (discountOf(p) > discountOf(best) ? p : best), deals[0])
  const averageSaving =
    deals.reduce((sum, p) => sum + (p.compareAtPrice ? p.compareAtPrice - p.price : 0), 0) /
    Math.max(1, deals.length)

  const quickAdd = (product: Product) => {
    addItem(product.id, 1)
    push({
      tone: 'success',
      title: `${product.name} added`,
      description: 'Locked at today’s price',
      amount: money(product.price),
      action: { label: 'Checkout', to: '/checkout' },
    })
  }

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Deals' }]} />
      </div>

      {/* Hero ---------------------------------------------------------- */}
      <section className="relative mt-6 overflow-hidden border-b border-line-faint">
        <div className="absolute inset-0 grid-lines opacity-40" />
        <motion.div
          aria-hidden
          className="absolute -top-32 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-brand-600/25 blur-[110px]"
          animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.75, 0.5] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <Reveal>
            <span className="badge border border-amber-400/30 bg-amber-400/10 text-amber-300">
              <Icon.Bolt className="size-3" />
              Price drops live
            </span>
            <h1 className="mt-5 text-3xl font-extrabold text-balance sm:text-4xl lg:text-5xl">
              Real reductions, not invented urgency
            </h1>
            <p className="mt-4 max-w-2xl text-base text-ink-muted sm:text-lg">
              Every price here is compared against its own list price, so the saving you see is the
              saving you get. No countdown timers, no fake scarcity.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                {
                  label: 'Products reduced',
                  value: deals.length,
                  suffix: '',
                  icon: <Icon.Tag className="size-4" />,
                },
                {
                  label: 'Deepest cut right now',
                  value: deepest ? discountOf(deepest) : 0,
                  suffix: '%',
                  icon: <Icon.Bolt className="size-4" />,
                },
                {
                  label: 'Average saving per unit',
                  value: averageSaving,
                  prefix: `${SYMBOL}\u2009`,
                  icon: <Icon.Sparkle className="size-4" />,
                },
              ].map((stat) => (
                <div key={stat.label} className="panel flex items-center gap-4 p-4">
                  <span className="flex size-10 items-center justify-center rounded-xl border border-line bg-surface-inset text-brand-oncanvas">
                    {stat.icon}
                  </span>
                  <div>
                    <p className="text-[11px] tracking-wide text-ink-subtle uppercase">
                      {stat.label}
                    </p>
                    <p className="font-display text-xl font-extrabold text-ink">
                      <Counter
                        to={stat.value}
                        prefix={stat.prefix}
                        suffix={stat.suffix}
                        decimals={0}
                      />
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Bands --------------------------------------------------------- */}
      <Section>
        <div className="flex flex-wrap items-center gap-2">
          {BANDS.map((b) => (
            <button
              key={b.id}
              onClick={() => setBand(b.id)}
              aria-pressed={band === b.id}
              className="chip px-4 py-2"
              data-active={band === b.id}
            >
              {b.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={band}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-4 text-sm text-ink-muted"
          >
            {BANDS.find((b) => b.id === band)?.blurb}{' '}
            <span className="text-ink-subtle">
              Showing {deals.length} {deals.length === 1 ? 'product' : 'products'}.
            </span>
          </motion.p>
        </AnimatePresence>

        {deals.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon={<Icon.Tag className="size-6" />}
              title="Nothing in this band right now"
              body="This section updates as stock changes. Browse the full catalog in the meantime."
              action={{ label: 'Browse all products', to: '/shop' }}
            />
          </div>
        ) : (
          <Stagger className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4" stagger={0.05}>
            {deals.map((product, i) => {
              const off = discountOf(product)
              return (
                <StaggerItem key={product.id} className="h-full">
                  <div className="group relative h-full">
                    <ProductCard product={product} index={i} />

                    {off > 0 && (
                      <motion.span
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3 + i * 0.04, type: 'spring', stiffness: 380, damping: 18 }}
                        className="pointer-events-none absolute -top-2 -right-2 z-10 flex size-12 flex-col items-center justify-center rounded-full bg-linear-to-br from-emerald-400 to-emerald-600 text-[11px] leading-none font-extrabold text-ink shadow-lg shadow-emerald-500/25"
                      >
                        {off}%
                        <span className="text-[7px] font-bold opacity-70">OFF</span>
                      </motion.span>
                    )}

                    <button
                      onClick={() => quickAdd(product)}
                      className="btn-ghost btn-sm mt-2 w-full opacity-0 transition-opacity duration-300 group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <Icon.Cart className="size-3.5" />
                      Quick add
                    </button>
                  </div>
                </StaggerItem>
              )
            })}
          </Stagger>
        )}
      </Section>

      {/* Best of the catalog ------------------------------------------- */}
      <Section divider>
        <SectionTitle
          eyebrow="Not on sale"
          title="Still worth buying"
          lede="Some things are already priced right. These are the ones we would build a desk around."
        />
        <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.08}>
          {CATEGORIES.slice(0, 3).map((category) => {
            const picks = products
              .filter((p) => p.category === category.name)
              .sort((a, b) => b.rating - a.rating)[0]
            if (!picks) return null
            return (
              <StaggerItem key={category.name}>
                <Link
                  to={`/shop?category=${encodeURIComponent(category.name)}`}
                  className="panel ring-gradient group flex h-full flex-col justify-between gap-6 p-6 transition-transform duration-300 hover:-translate-y-1"
                >
                  <div>
                    <p className="text-[11px] tracking-[0.16em] text-brand-oncanvas uppercase">
                      {category.name}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                      {category.blurb}
                    </p>
                  </div>
                  <div className="flex items-end justify-between gap-4">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-bold text-ink">{picks.name}</p>
                      <StarRating rating={picks.rating} reviewCount={picks.reviewCount} size="sm" />
                    </div>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line-faint text-body transition group-hover:border-brand-400 group-hover:bg-brand-500 group-hover:text-ink">
                      <Icon.ArrowRight className="size-4" />
                    </span>
                  </div>
                </Link>
              </StaggerItem>
            )
          })}
        </Stagger>

        <Reveal delay={0.2} className="mt-12 flex justify-center">
          <Magnetic strength={0.22}>
            <Link to="/shop" className="btn-primary sheen px-8 py-3.5">
              <Icon.Search className="size-4" />
              Browse all {products.length} products
            </Link>
          </Magnetic>
        </Reveal>
      </Section>

      <TrustBar />
    </SiteLayout>
  )
}
