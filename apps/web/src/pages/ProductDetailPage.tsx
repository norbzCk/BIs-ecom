import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { ProductVisual } from '../components/ProductVisual'
import { SiteLayout } from '../components/SiteLayout'
import { StarRating } from '../components/StarRating'
import { TrustBar } from '../components/TrustBar'
import { Icon } from '../components/icons'
import { Breadcrumbs, PriceTag, QuantityStepper, Section, StockPill, Tabs } from '../components/ui'
import { useCart } from '../lib/cart-context'
import { Magnetic, TiltCard } from '../lib/motion/interactive'
import { SectionHeading } from '../lib/motion/marquee'
import { Stagger, StaggerItem } from '../lib/motion/reveal'
import { useToast } from '../lib/motion/toast'
import { productBySlug, relatedProducts, relatedReviews } from '../data/products'
import { money, moneyExact } from '../lib/money'

type Tab = 'specs' | 'highlights' | 'reviews' | 'shipping'

/**
 * Keying the inner component on the slug remounts it when the visitor moves to
 * another product, which resets quantity/tab/angle without a state-syncing
 * effect.
 */
export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()

  if (!slug || !productBySlug(slug)) return <Navigate to="/shop" replace />

  return <ProductDetail key={slug} slug={slug} />
}

function ProductDetail({ slug }: { slug: string }) {
  const product = productBySlug(slug)!
  const { addItem, toggleWishlist, isWishlisted } = useCart()
  const { push } = useToast()
  const navigate = useNavigate()
  const reduce = useReducedMotion()

  const [quantity, setQuantity] = useState(1)
  const [tab, setTab] = useState<Tab>('specs')
  const [angle, setAngle] = useState(0)

  const stickyRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: stickyRef,
    offset: ['start end', 'start start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [70, 0])
  const rotate = useTransform(scrollYProgress, [0, 1], [16, 0])

  const related = relatedProducts(product)
  const productReviews = relatedReviews(product.id)
  const saved = isWishlisted(product.id)
  const discount = product.compareAtPrice
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0
  const perMonth = (product.price / 12).toFixed(2)

  const add = (goToCheckout = false) => {
    addItem(product.id, quantity)
    push({
      tone: 'success',
      title: `${quantity} × ${product.name}`,
      description: 'Added to your cart',
      amount: `${moneyExact(product.price * quantity)}`,
      action: { label: 'Checkout now', to: '/checkout' },
    })
    if (goToCheckout) navigate('/checkout')
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: 'Home', to: '/' },
            { label: 'Shop', to: '/shop' },
            { label: product.category, to: `/shop?category=${encodeURIComponent(product.category)}` },
            { label: product.name },
          ]}
        />

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          {/* ---------------------------------------------------------- */}
          {/*  Gallery                                                      */}
          {/* ---------------------------------------------------------- */}
          <div ref={stickyRef} className="lg:sticky lg:top-32 lg:self-start">
            <TiltCard className="relative" max={7} glare={false}>
              <div className="panel relative overflow-hidden p-1.5">
                <ProductVisual product={product} className="aspect-square rounded-xl" />

                {/* Floating angle badge — motion-linked flourish */}
                <motion.div
                  style={reduce ? undefined : { y, rotate }}
                  className="absolute top-5 right-5 rounded-xl border border-line-faint bg-canvas/70 px-3 py-2 backdrop-blur-md"
                >
                  <p className="text-[9px] font-semibold tracking-[0.16em] text-ink-subtle uppercase">
                    Viewing angle
                  </p>
                  <p className="font-display text-lg font-extrabold text-ink tabular-nums">
                    {Math.round(angle)}&deg;
                  </p>
                </motion.div>

                <div className="absolute bottom-5 left-5 flex flex-wrap gap-1.5">
                  <StockPill stock={product.stock} label={product.stockLabel} />
                  <span className="badge border border-line-faint bg-canvas/70 text-body backdrop-blur-md">
                    {product.shipsIn}
                  </span>
                </div>
              </div>
            </TiltCard>

            {/* Angle presets — a real, tappable interaction */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[11px] font-semibold tracking-[0.14em] text-ink-subtle uppercase">
                Rotate
              </span>
              {[0, 20, 45, 90, 135].map((deg) => (
                <button
                  key={deg}
                  onClick={() => setAngle(deg)}
                  aria-pressed={angle === deg}
                  className="chip px-2.5 py-1 text-[11px]"
                  data-active={angle === deg}
                >
                  {deg}&deg;
                </button>
              ))}
            </div>
          </div>

          {/* ---------------------------------------------------------- */}
          {/*  Buy box                                                      */}
          {/* ---------------------------------------------------------- */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/shop?brand=${encodeURIComponent(product.brand)}`}
                className="badge border border-line bg-surface-inset text-body transition hover:border-brand-400/50 hover:text-ink"
              >
                {product.brand}
              </Link>
              {product.isNew && (
                <span className="badge bg-linear-to-r from-accent-500 to-brand-500 text-ink">
                  New arrival
                </span>
              )}
              {discount > 0 && (
                <span className="badge bg-emerald-500 text-ink">Saving {discount}%</span>
              )}
            </div>

            <h1 className="mt-4 text-2xl font-extrabold text-balance sm:text-3xl lg:text-4xl">
              {product.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-4">
              <StarRating rating={product.rating} reviewCount={product.reviewCount} size="md" />
              <span className="h-3 w-px bg-surface-glass-hover" />
              <span className="text-xs text-ink-subtle">
                Released {product.releasedOn}
              </span>
              <span className="h-3 w-px bg-surface-glass-hover" />
              <span className="text-xs text-ink-subtle">SKU {product.id.toUpperCase()}</span>
            </div>

            <div className="mt-6 flex flex-wrap items-end gap-4">
              <PriceTag
                price={product.price}
                compareAt={product.compareAtPrice}
                size="lg"
              />
              {product.compareAtPrice && (
                <span className="badge mb-1 bg-emerald-500/15 text-emerald-300">
                  You save {money(product.compareAtPrice - product.price)}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-ink-subtle">
              or 12 interest-free payments of{' '}
              <span className="font-semibold text-body">${perMonth}/mo</span>
            </p>

            {product.description && (
              <p className="mt-6 text-sm leading-relaxed text-ink-muted sm:text-base">
                {product.description}
              </p>
            )}

            <ul className="mt-6 space-y-2.5">
              {product.highlights.map((highlight, i) => (
                <motion.li
                  key={highlight}
                  initial={reduce ? false : { opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-start gap-2.5 text-sm text-body"
                >
                  <span className="mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                    <Icon.Check className="size-3" />
                  </span>
                  {highlight}
                </motion.li>
              ))}
            </ul>

            {/* Quantity + actions */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <QuantityStepper
                value={quantity}
                onChange={setQuantity}
                max={Math.max(1, product.stock)}
              />
              <span className="text-xs text-ink-subtle">
                {product.stock} available
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Magnetic strength={0.2} className="flex-1">
                <button
                  onClick={() => add(false)}
                  className="btn-primary sheen w-full px-7 py-3.5 text-base"
                >
                  <Icon.Cart className="size-4" />
                  Add to cart
                  <span className="text-ink-subtle">·</span>
                  {moneyExact(product.price * quantity)}
                </button>
              </Magnetic>

              <Magnetic strength={0.2}>
                <button
                  onClick={() => add(true)}
                  className="btn-ghost sheen w-full px-7 py-3.5 text-base"
                >
                  <Icon.Bolt className="size-4" />
                  Buy now
                </button>
              </Magnetic>

              <motion.button
                onClick={() => {
                  const added = toggleWishlist(product.id)
                  push({
                    title: added ? 'Saved for later' : 'Removed from saved',
                    description: product.name,
                    action: added ? { label: 'View saved items', to: '/account?tab=saved' } : undefined,
                  })
                }}
                whileTap={{ scale: 0.9 }}
                aria-label={saved ? 'Remove from saved items' : 'Save for later'}
                aria-pressed={saved}
                className={`flex size-14 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                  saved
                    ? 'border-rose-400/50 bg-rose-500/15 text-rose-300'
                    : 'border-line-faint bg-surface-glass text-body hover:border-line-strong hover:text-ink'
                }`}
              >
                {saved ? <Icon.HeartFilled className="size-5" /> : <Icon.Heart className="size-5" />}
              </motion.button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-subtle">
              <span className="flex items-center gap-1.5">
                <Icon.Shield className="size-3.5 text-emerald-400" />
                3-year direct warranty
              </span>
              <span className="flex items-center gap-1.5">
                <Icon.Refresh className="size-3.5 text-sky-400" />
                30-day free returns
              </span>
              <span className="flex items-center gap-1.5">
                <Icon.Truck className="size-3.5 text-amber-400" />
                {product.shipsIn}
              </span>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/*  Detail tabs                                                   */}
        {/* ------------------------------------------------------------ */}
        <div className="mt-16">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'specs', label: 'Specifications', count: product.specs.length },
              { id: 'highlights', label: 'Why we list it' },
              { id: 'reviews', label: 'Reviews', count: productReviews.length },
              { id: 'shipping', label: 'Shipping & returns' },
            ]}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="pt-6"
            >
              {tab === 'specs' && (
                <div className="panel overflow-hidden">
                  {product.specs.map((spec, i) => (
                    <motion.div
                      key={spec.label}
                      initial={reduce ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05, duration: 0.4 }}
                      className={`grid gap-1 border-b border-line-faint px-5 py-3.5 last:border-0 sm:grid-cols-[260px_1fr] sm:gap-6 ${
                        i % 2 === 0 ? 'bg-surface-inset' : 'bg-transparent'
                      }`}
                    >
                      <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                        {spec.label}
                      </span>
                      <span className="text-sm text-body">{spec.value}</span>
                    </motion.div>
                  ))}
                </div>
              )}

              {tab === 'highlights' && (
                <Stagger className="grid gap-4 sm:grid-cols-3" stagger={0.09}>
                  {product.highlights.map((h, i) => (
                    <StaggerItem key={h}>
                      <div className="panel h-full p-5">
                        <span className="font-display text-3xl font-extrabold text-brand-500/30">
                          0{i + 1}
                        </span>
                        <p className="mt-2 text-sm leading-relaxed text-body">{h}</p>
                      </div>
                    </StaggerItem>
                  ))}
                </Stagger>
              )}

              {tab === 'reviews' && (
                <Stagger className="grid gap-4 md:grid-cols-2" stagger={0.08}>
                  {productReviews.map((review) => (
                    <StaggerItem key={review.id}>
                      <figure className="panel h-full p-5">
                        <div className="flex items-start justify-between gap-3">
                          <StarRating rating={review.rating} showValue={false} />
                          <Icon.Star className="size-3.5 text-ink-faint" />
                        </div>
                        <blockquote className="mt-3 text-sm leading-relaxed text-body">
                          &ldquo;{review.quote}&rdquo;
                        </blockquote>
                        <figcaption className="mt-4 flex items-center gap-3 border-t border-line-faint pt-3">
                          <span className="flex size-8 items-center justify-center rounded-full bg-linear-to-br from-brand-500 to-accent-500 text-xs font-bold text-ink">
                            {review.author.charAt(0)}
                          </span>
                          <span>
                            <span className="block text-sm font-semibold text-ink">
                              {review.author}
                            </span>
                            <span className="block text-xs text-ink-subtle">{review.role}</span>
                          </span>
                        </figcaption>
                      </figure>
                    </StaggerItem>
                  ))}
                </Stagger>
              )}

              {tab === 'shipping' && (
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    {
                      icon: <Icon.Truck className="size-5" />,
                      title: 'Dispatch',
                      body: `In-stock items are packaged the same day. ${product.shipsIn.toLowerCase()}, tracked from the moment it leaves us.`,
                    },
                    {
                      icon: <Icon.Refresh className="size-5" />,
                      title: 'Returns',
                      body: 'Thirty days from delivery. Prepaid label in the box, full refund to the original payment method, no restocking fee.',
                    },
                    {
                      icon: <Icon.Shield className="size-5" />,
                      title: 'Warranty',
                      body: 'Manufacturer warranty handled directly by Billionare. No paperwork, no third-party claims desk.',
                    },
                  ].map((card) => (
                    <div key={card.title} className="panel p-5">
                      <span className="flex size-10 items-center justify-center rounded-xl border border-line bg-surface-inset text-brand-oncanvas">
                        {card.icon}
                      </span>
                      <h3 className="mt-4 text-sm font-bold text-ink">{card.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{card.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* -------------------------------------------------------------- */}
      {/*  Related                                                        */}
      {/* -------------------------------------------------------------- */}
      <Section divider className="pb-20">
        <SectionHeading
          eyebrow="Pairs well with"
          title="Complete the desk"
          lede="Other hardware people buy alongside this one."
          action={
            <Link to={`/shop?category=${encodeURIComponent(product.category)}`} className="btn-ghost btn-sm">
              More in {product.category}
            </Link>
          }
        />
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {related.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} compact />
          ))}
        </div>
      </Section>

      <TrustBar />

      {/* Sticky mobile buy bar */}
      <motion.div
        initial={reduce ? false : { y: 90 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/92 backdrop-blur-xl lg:hidden"
      >
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-ink-muted">{product.name}</p>
              <PriceTag price={product.price * quantity} size="sm" className="mt-0.5" />
            </div>
            <QuantityStepper value={quantity} onChange={setQuantity} size="sm" />
            <button onClick={() => add(false)} className="btn-primary btn-sm shrink-0 px-5">
              Add
            </button>
          </div>
        </div>
      </motion.div>
    </SiteLayout>
  )
}
