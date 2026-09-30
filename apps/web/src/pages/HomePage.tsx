import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Aurora, ParticleField } from '../lib/motion/aurora'
import { Counter } from '../lib/motion/counter'
import { Magnetic, TiltCard } from '../lib/motion/interactive'
import { Marquee, SectionHeading } from '../lib/motion/marquee'
import { Reveal, SplitWords, Stagger, StaggerItem } from '../lib/motion/reveal'
import { ProductThumb, hueFor } from '../components/ProductVisual'
import { ProductCard } from '../components/ProductCard'
import { StarRating } from '../components/StarRating'
import { TrustBar } from '../components/TrustBar'
import { SiteLayout } from '../components/SiteLayout'
import { Icon, type IconName } from '../components/icons'
import { Section, Stat } from '../components/ui'
import { useCatalog, useRecentReviews, discountPercent } from '../lib/catalog'
import type { Product } from '../types'
import { money } from '../lib/money'

/**
 * Categories are created by admins, so the icon is matched on the name instead
 * of an index. Anything unrecognised falls back to a generic chip icon.
 */
const CATEGORY_ICONS: { match: RegExp; icon: IconName }[] = [
  { match: /lap|notebook|macbook|portable/i, icon: 'Laptop' },
  { match: /monitor|display|screen|panel/i, icon: 'Monitor' },
  { match: /key|board|input/i, icon: 'Keyboard' },
  { match: /mouse|pointer|trackpad/i, icon: 'Mouse' },
  { match: /head|audio|speaker|ear/i, icon: 'Headset' },
  { match: /dock|hub|adapter|port/i, icon: 'Dock' },
  { match: /cable|charger|power/i, icon: 'Bolt' },
  { match: /component|part|gear|accessor/i, icon: 'Cpu' },
]

function categoryIcon(name: string): IconName {
  return CATEGORY_ICONS.find((entry) => entry.match.test(name))?.icon ?? 'Cpu'
}

const STEPS = [
  {
    title: 'Pick your build',
    body: 'Filter by category, price or brand, then compare up to four products side by side before you commit to anything.',
  },
  {
    title: 'Lock it in at checkout',
    body: 'Stock is reserved the moment you add to cart. Free insured shipping kicks in over TSh 400,000, and promo codes apply instantly.',
  },
  {
    title: 'Tracked to your desk',
    body: 'Every order ships same day with a direct manufacturer warranty attached. Thirty days to change your mind, no questions.',
  },
]

export function HomePage() {
  const { categories, featuredProducts, dealProducts } = useCatalog()
  const reviews = useRecentReviews(6)
  const featured = featuredProducts()
  const deals = dealProducts()
  const topDeal = deals[0]

  return (
    <SiteLayout>
      {/* ---------------------------------------------------------------- */}
      {/*  Hero                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative isolate overflow-hidden">
        <Aurora />
        <ParticleField count={22} />
        <HeroFloor />

        <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 lg:px-8 lg:pt-32 lg:pb-28">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <motion.span
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="eyebrow"
              >
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-400 opacity-70" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-accent-400" />
                </span>
                Season event live now
              </motion.span>

              <h1 className="mt-6 font-display text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                <SplitWords text="Hardware that keeps up" className="block" delay={0.08} />
                <SplitWords
                  text="with how you work."
                  className="gradient-text block"
                  delay={0.24}
                />
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mt-6 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg"
              >
                Workstations, colour-accurate displays, tactile keyboards and low-latency
                peripherals. Curated, verified and shipped the same day you order.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.62, ease: [0.16, 1, 0.3, 1] }}
                className="mt-9 flex flex-wrap items-center gap-3"
              >
                <Magnetic strength={0.28}>
                  <Link to="/shop" className="btn-primary sheen px-7 py-3.5 text-base">
                    Explore the shop
                    <Icon.ArrowRight className="size-4" />
                  </Link>
                </Magnetic>
                <Magnetic strength={0.24}>
                  <Link to="/deals" className="btn-ghost sheen px-7 py-3.5 text-base">
                    <Icon.Bolt className="size-4" />
                    Today&rsquo;s deals
                  </Link>
                </Magnetic>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.85 }}
                className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3"
              >
                {[
                  { label: 'Verified buyers', value: 12480 },
                  { label: 'Orders shipped', value: 38210 },
                  { label: 'Average rating', value: 4.8, decimals: 1 },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="font-display text-2xl font-extrabold text-ink">
                      <Counter
                        to={stat.value}
                        decimals={'decimals' in stat ? stat.decimals : 0}
                        duration={2.2}
                      />
                      {'decimals' in stat && stat.decimals === 1 ? '' : '+'}
                    </p>
                    <p className="text-xs text-ink-subtle">{stat.label}</p>
                  </div>
                ))}
              </motion.div>
            </div>

            <HeroShowcase />
          </div>
        </div>

        <ScrollCue />
      </section>

      {/* ---------------------------------------------------------------- */}
      {/*  Categories                                                       */}
      {/* ---------------------------------------------------------------- */}
      <Section>
        <SectionHeading
          eyebrow="Browse"
          title="Six categories, zero filler"
          lede="Every product in each category earns its place. If we cannot say why it is better, we do not list it."
          action={
            <Link to="/shop" className="btn-ghost btn-sm">
              See everything
              <Icon.ArrowRight className="size-3.5" />
            </Link>
          }
        />

        <Stagger
          className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6"
          stagger={0.06}
        >
          {categories.map((category) => {
            const I = Icon[categoryIcon(category.name)]
            return (
              <StaggerItem key={category.name}>
                <TiltCard className="h-full" max={8}>
                  <Link
                    to={`/shop?category=${encodeURIComponent(category.name)}`}
                    className="group panel ring-gradient relative flex h-full flex-col items-center overflow-hidden p-4 pt-5 text-center transition-transform duration-500 hover:-translate-y-1"
                  >
                    <span
                      className="pointer-events-none absolute inset-x-0 -top-10 h-24 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                      style={{
                        background: `radial-gradient(60% 100% at 50% 100%, hsl(${hueFor(category.id)} 90% 55% / 0.5), transparent 70%)`,
                      }}
                    />

                    <span className="relative mb-2 flex size-16 items-center justify-center">
                      <I className="size-9" />
                    </span>

                    <span className="relative mt-1 text-[13px] leading-tight font-bold text-ink transition-colors group-hover:text-brand-oncanvas">
                      {category.name}
                    </span>
                    <span className="relative mt-1 inline-flex items-center gap-1 text-[11px] text-ink-subtle">
                      <I className="size-3" />
                      {category.productCount} {category.productCount === 1 ? 'product' : 'products'}
                    </span>
                  </Link>
                </TiltCard>
              </StaggerItem>
            )
          })}
        </Stagger>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/*  Featured                                                         */}
      {/* ---------------------------------------------------------------- */}
      <Section divider>
        <SectionHeading
          eyebrow="Featured"
          title="This week's standouts"
          lede="The pieces our team actually reaches for when we rebuild our own desks."
          action={
            <Link to="/shop" className="btn-ghost btn-sm">
              Shop all hardware
              <Icon.ArrowRight className="size-3.5" />
            </Link>
          }
        />

        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {featured.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/*  Deal of the week                                                 */}
      {/* ---------------------------------------------------------------- */}
      {topDeal && <DealBand deal={topDeal.product} off={topDeal.off} />}

      {/* ---------------------------------------------------------------- */}
      {/*  How it works                                                     */}
      {/* ---------------------------------------------------------------- */}
      <Section divider>
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="How it works"
              title="Three steps, no account required to browse"
              lede="You do not need to learn anything to use this site. Add to cart, check out, and the rest is handled."
            />
            <Reveal delay={0.15} className="mt-8">
              <Link to="/shop" className="btn-primary sheen">
                Start browsing
                <Icon.ArrowRight className="size-4" />
              </Link>
            </Reveal>
          </div>

          <Stagger className="space-y-4" stagger={0.12}>
            {STEPS.map((step, i) => (
              <StaggerItem key={step.title}>
                <div className="group panel ring-gradient relative flex gap-5 p-5 transition-transform duration-500 hover:-translate-y-0.5">
                  <span className="relative font-display text-4xl font-extrabold text-ink/[0.07] transition-colors duration-500 group-hover:text-brand-500/25">
                    0{i + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-ink">{step.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{step.body}</p>
                  </div>
                  <span className="absolute top-5 right-5 h-px w-8 bg-linear-to-r from-transparent to-transparent transition-all duration-500 group-hover:w-14 group-hover:to-brand-400/60" />
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/*  Reviews                                                          */}
      {/* ---------------------------------------------------------------- */}
      <Section divider>
        <SectionHeading
          align="center"
          eyebrow="Verified reviews"
          title="What people say after the box arrives"
          lede="Only customers who ordered from Billionare can review a product here."
        />

        <div className="mt-10">
          <Marquee speed={58} className="py-2">
            {[...reviews, ...reviews].map((review, i) => (
              <figure
                key={`${review.id}-${i}`}
                className="panel mx-2.5 w-[19rem] shrink-0 p-5 sm:w-[22rem]"
              >
                <StarRating rating={review.rating} showValue={false} />
                <blockquote className="mt-3 text-sm leading-relaxed text-body">
                  &ldquo;{review.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-3 border-t border-line-faint pt-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand-500 to-accent-500 text-sm font-bold text-ink">
                    {review.author.charAt(0)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {review.author}
                    </span>
                    <span className="block truncate text-xs text-ink-subtle">{review.role}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </Marquee>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/*  Why / stats                                                      */}
      {/* ---------------------------------------------------------------- */}
      <Section divider>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            icon={<Icon.Shield className="size-4.5" />}
            value="100%"
            label="Verified units"
            hint="Inspected and logged before dispatch"
          />
          <Stat
            icon={<Icon.Clock className="size-4.5" />}
            value="24h"
            label="Average dispatch"
            hint="Same-day packaging on in-stock items"
          />
          <Stat
            icon={<Icon.Refresh className="size-4.5" />}
            value="30 days"
            label="Free returns"
            hint="Prepaid label, no restocking fee"
          />
          <Stat
            icon={<Icon.Award className="size-4.5" />}
            value="4.8 / 5"
            label="Customer rating"
            hint="From 12,480 verified orders"
            to="/shop"
          />
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/*  Compare teaser                                                   */}
      {/* ---------------------------------------------------------------- */}
      <Section divider>
        <div className="panel noise relative overflow-hidden p-8 sm:p-12 lg:p-16">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-brand-500/25 blur-3xl"
          />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <Reveal from="left">
                <span className="eyebrow">
                  <Icon.Scale className="size-3" />
                  Side by side
                </span>
                <h2 className="mt-5 text-2xl font-extrabold text-balance sm:text-3xl lg:text-4xl">
                  Still torn between two monitors? Put them next to each other.
                </h2>
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-muted sm:text-base">
                  Pick up to four products and compare price, panel specs, warranty and stock in a
                  single table. No account, no email wall.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link to="/compare" className="btn-primary sheen">
                    <Icon.Scale className="size-4" />
                    Open the comparator
                  </Link>
                  <Link to="/deals" className="btn-ghost">
                    <Icon.Bolt className="size-4" />
                    See today&rsquo;s deals
                  </Link>
                </div>
              </Reveal>
            </div>

            <Reveal from="right" delay={0.1}>
              <ComparePreview />
            </Reveal>
          </div>
        </div>
      </Section>

      <TrustBar />
    </SiteLayout>
  )
}

/* -------------------------------------------------------------------------- */
/*  Hero pieces                                                                */
/* -------------------------------------------------------------------------- */

function HeroFloor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-x-0 bottom-0 h-64 bg-linear-to-t from-navy-950 to-transparent" />
      <div className="grid-lines absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)]" />
    </div>
  )
}

function HeroShowcase() {
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 700], [0, 90])
  const rotate = useTransform(scrollY, [0, 700], [0, 6])

  const { featuredProducts, products } = useCatalog()
  const cards = useMemo(
    () => {
      const picks = (featuredProducts().length >= 3 ? featuredProducts() : products).slice(0, 3)
      const layout = [
        { angle: -7, offset: 'translate-y-6' },
        { angle: 5, offset: 'translate-y-16' },
        { angle: 0, offset: 'translate-y-0' },
      ] as const
      return picks.map((product, i) => ({ product, ...layout[i] }))
    },
    [featuredProducts, products],
  )

  return (
    <motion.div
      style={reduce ? undefined : { y, rotate }}
      className="relative mx-auto aspect-square w-full max-w-lg"
    >
      {/* Glow core */}
      <motion.div
        className="absolute inset-[18%] rounded-full bg-brand-500/25 blur-3xl"
        animate={reduce ? undefined : { scale: [1, 1.12, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="absolute inset-0">
        {cards.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-center text-sm text-ink-subtle">
            New hardware is on the way.
          </p>
        )}
        {cards.map((card, i) => (
          <motion.div
            key={card.product.id}
            initial={reduce ? false : { opacity: 0, y: 60, scale: 0.85, rotate: card.angle * 2 }}
            animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1, rotate: card.angle }}
            transition={{
              duration: 1.1,
              delay: 0.45 + i * 0.14,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={`absolute w-[58%] ${card.offset}`}
            style={{ left: `${i * 13}%`, top: `${8 + i * 9}%` }}
          >
            <motion.div
              animate={reduce ? undefined : { y: [0, -14, 0] }}
              transition={{
                duration: 6 + i,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.5,
              }}
            >
              <Link
                to={`/product/${card.product.slug}`}
                className="group panel ring-gradient relative block overflow-hidden p-2 transition-transform duration-500 hover:scale-105"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-ink">
                  <ProductThumb product={card.product} />
                </div>
                <div className="px-2 py-2.5">
                  <p className="truncate text-[11px] font-bold text-ink">{card.product.name}</p>
                  <p className="text-[11px] font-semibold text-brand-oncanvas">
                    {money(card.product.price)}
                  </p>
                </div>
              </Link>
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Floating stat chips */}
      <FloatingChip
        className="top-[6%] right-[2%]"
        delay={1.1}
        icon={<Icon.Bolt className="size-3.5" />}
        title="Same-day dispatch"
        tone="emerald"
      />
      <FloatingChip
        className="bottom-[14%] left-[-2%]"
        delay={1.35}
        icon={<Icon.Shield className="size-3.5" />}
        title="3-year warranty"
        tone="brand"
      />
    </motion.div>
  )
}

function FloatingChip({
  className = '',
  delay = 0,
  icon,
  title,
  tone = 'brand',
}: {
  className?: string
  delay?: number
  icon: React.ReactNode
  title: string
  tone?: 'brand' | 'emerald'
}) {
  const reduce = useReducedMotion()
  const tones = {
    brand: 'border-brand-400/40 text-brand-oncanvas shadow-brand-500/20',
    emerald: 'border-emerald-400/40 text-emerald-200 shadow-emerald-500/20',
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`absolute ${className}`}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -9, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay }}
        className={`panel flex items-center gap-2 px-3 py-2 shadow-xl ${tones[tone]}`}
      >
        {icon}
        <span className="text-[11px] font-bold whitespace-nowrap text-ink">{title}</span>
      </motion.div>
    </motion.div>
  )
}

function ScrollCue() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.6, duration: 1 }}
      className="relative mx-auto mb-6 flex w-fit flex-col items-center gap-2"
    >
      <span className="text-[10px] font-semibold tracking-[0.2em] text-ink-faint uppercase">
        Scroll
      </span>
      <span className="relative flex h-9 w-5.5 items-start justify-center rounded-full border border-line-faint p-1">
        <motion.span
          className="size-1.5 rounded-full bg-brand-400"
          animate={{ y: [0, 14, 0], opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </span>
    </motion.div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Deal band with a live countdown                                            */
/* -------------------------------------------------------------------------- */

/** Next Tuesday 09:00 local — matches the "restocked every Tuesday" copy. */
function nextReset(from: Date) {
  const target = new Date(from)
  const day = target.getDay()
  const daysUntilTuesday = (2 - day + 7) % 7 || 7
  target.setDate(target.getDate() + daysUntilTuesday)
  target.setHours(9, 0, 0, 0)
  if (target <= from) target.setDate(target.getDate() + 7)
  return target
}

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const diff = Math.max(0, target.getTime() - now)
  return {
    hours: Math.floor(diff / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
  }
}

function DealBand({
  deal,
  off,
}: {
  deal: Product
  off: number
}) {
  const [target] = useState(() => nextReset(new Date()))
  const { hours, minutes, seconds } = useCountdown(target)

  return (
    <section className="relative overflow-hidden py-16 sm:py-20">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-br from-amber-500/8 via-navy-950 to-brand-600/10"
      />
      <Aurora opacity={0.4} />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-canvas/60"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal from="left">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge bg-linear-to-r from-amber-400 to-orange-500 text-ink shadow-lg shadow-amber-500/25">
                <Icon.Bolt className="size-3" />
                Deal of the week
              </span>
              <span className="badge border border-line bg-surface-inset text-body">
                Ends in
              </span>
            </div>

            <h2 className="mt-5 text-2xl font-extrabold text-balance sm:text-3xl lg:text-4xl">
              {deal.name}
            </h2>

            <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-muted sm:text-base">
              {deal.badge ?? `Save ${discountPercent(deal) ?? 0}% while the reduced price lasts.`}
            </p>

            <div className="mt-7 flex flex-wrap items-end gap-4">
              <div>
                <p className="font-display text-4xl font-extrabold text-ink sm:text-5xl">
                  {money(deal.price)}
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-ink-subtle">
                  <span className="line-through">
                    {deal.compareAtPrice != null && money(deal.compareAtPrice)}
                  </span>
                  <span className="badge bg-emerald-500/15 text-emerald-300">
                    Save {money((deal.compareAtPrice ?? 0) - deal.price)}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-1.5" aria-label="Deal countdown">
                {[
                  { value: hours, label: 'hrs' },
                  { value: minutes, label: 'min' },
                  { value: seconds, label: 'sec' },
                ].map((unit) => (
                  <div
                    key={unit.label}
                    className="min-w-13 rounded-lg border border-line bg-surface-inset px-2 py-1.5 text-center backdrop-blur"
                  >
                    <p className="font-display text-lg font-extrabold text-ink tabular-nums">
                      {String(unit.value).padStart(2, '0')}
                    </p>
                    <p className="text-[9px] font-semibold tracking-[0.14em] text-ink-subtle uppercase">
                      {unit.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Magnetic strength={0.24}>
                <Link to={`/product/${deal.slug}`} className="btn-primary sheen px-6 py-3">
                  Grab this deal
                  <Icon.ArrowRight className="size-4" />
                </Link>
              </Magnetic>
              <Link to="/deals" className="btn-ghost px-6 py-3">
                See all deals
              </Link>
            </div>
          </Reveal>

          <Reveal from="right" delay={0.1}>
            <TiltCard className="mx-auto max-w-md" max={10}>
              <Link
                to={`/product/${deal.slug}`}
                className="group panel ring-gradient block overflow-hidden p-2"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-ink">
                  <ProductThumb product={deal} />
                  <span className="absolute top-3 left-3 badge bg-rose-500 text-ink shadow-lg shadow-rose-500/30">
                    &minus;{off}%
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{deal.name}</p>
                    {deal.rating !== null && (
                      <div className="mt-1">
                        <StarRating rating={deal.rating} reviewCount={deal.reviewCount} />
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 rounded-xl border border-line bg-surface-inset px-3 py-2 text-sm font-bold text-ink">
                    {deal.stock} in stock
                  </span>
                </div>
              </Link>
            </TiltCard>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Compare preview                                                            */
/* -------------------------------------------------------------------------- */

function ComparePreview() {
  const { featuredProducts, products } = useCatalog()

  const items = useMemo(() => {
    const pool = featuredProducts().length >= 3 ? featuredProducts() : products
    return pool.slice(0, 3)
  }, [featuredProducts, products])

  // Highlights are derived from the live catalog rather than curated by hand, so
  // they stay accurate as prices, ratings and stock change.
  const highlights = useMemo(() => {
    const rated = [...items].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    const value = [...items].sort(
      (a, b) => (b.rating ?? 0) / (b.price || 1) - (a.rating ?? 0) / (a.price || 1),
    )
    const popular = [...items].sort((a, b) => b.reviewCount - a.reviewCount)
    return [
      { label: 'Best rated', value: rated[0]?.name },
      { label: 'Best value', value: value[0]?.name },
      { label: 'Most reviewed', value: popular[0]?.name },
    ].filter((row): row is { label: string; value: string } => Boolean(row.value))
  }, [items])

  if (items.length === 0) {
    return (
      <div className="panel flex aspect-[4/3] items-center justify-center p-6 text-center text-sm text-ink-subtle">
        Compare products once the first ones are listed.
      </div>
    )
  }

  return (
    <div className="panel overflow-hidden">
      <div className="grid grid-cols-3 divide-x divide-white/8">
        {items.map((p) => (
          <Link
            key={p.id}
            to={`/product/${p.slug}`}
            className="group p-3 transition-colors hover:bg-surface-glass"
          >
            <div className="relative aspect-square overflow-hidden rounded-lg bg-ink">
              <ProductThumb product={p} />
            </div>
            <p className="mt-2 line-clamp-2 text-[10px] leading-tight font-semibold text-body transition-colors group-hover:text-ink">
              {p.name}
            </p>
            <p className="mt-0.5 text-[11px] font-bold text-brand-oncanvas">
              {money(p.price)}
            </p>
          </Link>
        ))}
      </div>

      <div className="space-y-2 border-t border-line-faint p-3">
        {highlights.map((row, i) => (
          <motion.div
            key={row.label}
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-between gap-3 rounded-lg bg-surface-glass px-3 py-2"
          >
            <span className="text-[11px] text-ink-subtle">{row.label}</span>
            <span className="truncate text-[11px] font-semibold text-body">{row.value}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
