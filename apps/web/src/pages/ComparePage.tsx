import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ProductVisual } from '../components/ProductVisual'
import { SiteLayout } from '../components/SiteLayout'
import { StarRating } from '../components/StarRating'
import { Icon } from '../components/icons'
import { Breadcrumbs, EmptyState, Section, SectionTitle, Tabs } from '../components/ui'
import { useCatalog, useProductDetailsList } from '../lib/catalog'
import { useCart } from '../lib/cart-context'
import { Magnetic } from '../lib/motion/interactive'
import { Reveal, Stagger, StaggerItem } from '../lib/motion/reveal'
import { useToast } from '../lib/motion/toast'
import type { Product, ProductDetail } from '../types'
import { money } from '../lib/money'

const MAX = 4

/** Spec rows are compared by label; only labels present on ≥2 items are shown. */
type Row = { label: string; values: (string | null)[]; highlight?: boolean }

const HIGH_PRIORITY = ['Price', 'Rating', 'Stock', 'Warranty', 'Released']

export function ComparePage() {
  const [params, setParams] = useSearchParams()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'table' | 'cards'>('table')
  const { addItem } = useCart()
  const { push } = useToast()
  const { products, productBySlug } = useCatalog()

  const slugs = useMemo(
    () => params.get('items')?.split(',').map((s) => s.trim()).filter(Boolean) ?? [],
    [params],
  )

  const items = useMemo(
    () => slugs.map((s) => productBySlug(s)).filter((p): p is Product => Boolean(p)),
    [slugs, productBySlug],
  )

  // Keep the URL in step with local state so a comparison can be shared or reloaded.
  useEffect(() => {
    if (items.length === slugs.length) return
    setParams(items.length ? { items: items.map((p) => p.slug).join(',') } : {}, { replace: true })
  }, [items, slugs, setParams])

  const toggle = (product: Product) => {
    const next = items.some((p) => p.id === product.id)
      ? items.filter((p) => p.id !== product.id)
      : items.length >= MAX
        ? [...items.slice(1), product]
        : [...items, product]
    setParams({ items: next.map((p) => p.slug).join(',') })
  }

  const add = (product: Product) => {
    addItem(product.id, 1)
    push({
      tone: 'success',
      title: `${product.name} added`,
      amount: `${money(product.price)}`,
      action: { label: 'Checkout', to: '/checkout' },
    })
  }

  const bestPrice = items.length ? Math.min(...items.map((p) => p.price)) : 0
  const bestRated = items.length ? Math.max(...items.map((p) => p.rating ?? 0)) : 0

  // Specs live on the detail endpoint, so wait for them before building rows.
  const details = useProductDetailsList(items.map((p) => p.slug))

  const rows = useMemo<Row[]>(() => {
    if (details.length === 0) return []

    const labels = new Set<string>()
    details.forEach((p) => p.specs.forEach((s) => labels.add(s.label)))

    const lookup = (p: ProductDetail, label: string) =>
      p.specs.find((s) => s.label === label)?.value ?? null

    const high = HIGH_PRIORITY.filter((label) => label === 'Price' || labels.has(label)).map((label) => ({
      label,
      values: details.map((p) => {
        switch (label) {
          case 'Price':
            return money(p.price)
          case 'Rating':
            return p.rating === null ? 'Not rated' : `${p.rating} / 5`
          case 'Stock':
            return p.stockLabel
          case 'Warranty':
            return lookup(p, 'Warranty')
          case 'Released':
            return p.releasedAt
              ? new Date(p.releasedAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : null
          default:
            return lookup(p, label)
        }
      }),
      highlight: label === 'Price' || label === 'Rating',
    }))

    const rest = [...labels]
      .filter((l) => !HIGH_PRIORITY.includes(l))
      .map((label) => ({ label, values: details.map((p) => lookup(p, label)) }))

    return [...high, ...rest]
  }, [details])

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products
      .filter((p) => !items.some((i) => i.id === p.id))
      .filter(
        (p) => !q || `${p.name} ${p.brand ?? ''} ${p.category}`.toLowerCase().includes(q),
      )
      .slice(0, 12)
  }, [query, items, products])

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Compare' }]} />
      </div>

      {/* Header --------------------------------------------------------- */}
      <Section className="!pt-10">
        <SectionTitle
          eyebrow="Side by side"
          title={`Compare up to ${MAX} products`}
          lede="Pick hardware you are actually choosing between, then read the differences that matter. The cheapest price and the highest rating are called out automatically."
          action={
            items.length > 0 && (
              <button
                onClick={() => setParams({})}
                className="btn-quiet btn-sm"
              >
                <Icon.Refresh className="size-3.5" />
                Clear all
              </button>
            )
          }
        />
      </Section>

      {items.length === 0 ? (
        <Section className="!pt-0">
          <EmptyState
            icon={<Icon.Scale className="size-6" />}
            title="Nothing to compare yet"
            body="Add at least two products and this page lines them up on price, specifications and stock. Your selection is kept in the URL, so you can share it."
            action={{ label: 'Open the catalog', to: '/shop' }}
          />
        </Section>
      ) : (
        <>
          {/* Product cards ------------------------------------------------ */}
          <Section className="!py-8">
            <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.07}>
              {items.map((product) => {
                const isBestPrice = product.price === bestPrice
                const isBestRated = product.rating !== null && product.rating === bestRated
                return (
                  <StaggerItem key={product.id} className="h-full">
                    <div className="panel ring-gradient relative flex h-full flex-col overflow-hidden">
                      <button
                        onClick={() => toggle(product)}
                        aria-label={`Remove ${product.name} from comparison`}
                        className="absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-lg border border-line-faint bg-canvas/70 text-body backdrop-blur transition hover:border-rose-400/50 hover:text-rose-300"
                      >
                        <Icon.X className="size-4" />
                      </button>

                      <Link
                        to={`/product/${product.slug}`}
                        className="relative block aspect-4/3 overflow-hidden"
                      >
                        <ProductVisual product={product} className="size-full" />
                      </Link>

                      <div className="flex flex-1 flex-col p-4">
                        <Link
                          to={`/product/${product.slug}`}
                          className="line-clamp-2 text-sm font-bold text-ink transition hover:text-brand-oncanvas"
                        >
                          {product.name}
                        </Link>
                        <p className="mt-1 text-[11px] text-ink-subtle">
                          {product.brand} · {product.category}
                        </p>

                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {isBestPrice && items.length > 1 && (
                            <span className="badge bg-emerald-500 text-ink">Lowest price</span>
                          )}
                          {isBestRated && items.length > 1 && (
                            <span className="badge bg-amber-500 text-ink">Best rated</span>
                          )}
                        </div>

                        {product.rating !== null && (
                          <StarRating
                            rating={product.rating}
                            reviewCount={product.reviewCount}
                            size="sm"
                            className="mt-2.5"
                          />
                        )}

                        <p className="font-display mt-3 text-xl font-extrabold text-ink">
                          {money(product.price)}
                          {product.compareAtPrice && (
                            <span className="ml-2 text-xs font-medium text-ink-subtle line-through">
                              {money(product.compareAtPrice)}
                            </span>
                          )}
                        </p>

                        <div className="mt-4 flex gap-2 pt-1">
                          <button onClick={() => add(product)} className="btn-primary btn-sm flex-1">
                            <Icon.Cart className="size-3.5" />
                            Add
                          </button>
                          <Link
                            to={`/product/${product.slug}`}
                            className="btn-ghost btn-sm"
                            aria-label={`View ${product.name}`}
                          >
                            <Icon.ArrowRight className="size-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </StaggerItem>
                )
              })}

              {items.length < MAX &&
                Array.from({ length: MAX - items.length }).map((_, i) => (
                  <StaggerItem key={`slot-${i}`} className="h-full">
                    <button
                      onClick={() => setPickerOpen((v) => !v)}
                      className="flex h-full min-h-72 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line-faint text-ink-subtle transition hover:border-brand-400/60 hover:text-brand-oncanvas"
                    >
                      <span className="flex size-11 items-center justify-center rounded-xl border border-line bg-surface-glass">
                        <Icon.Plus className="size-5" />
                      </span>
                      <span className="text-sm font-semibold">Add a product</span>
                      <span className="text-xs">
                        {MAX - items.length} {MAX - items.length === 1 ? 'slot' : 'slots'} left
                      </span>
                    </button>
                  </StaggerItem>
                ))}
            </Stagger>

            {/* Picker ------------------------------------------------------ */}
            <AnimatePresence>
              {pickerOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="panel mt-4 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h2 className="text-sm font-bold text-ink">Add to comparison</h2>
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by name, brand or category"
                        className="input sm:max-w-xs"
                      />
                    </div>

                    <Stagger className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" stagger={0.04}>
                      {candidates.map((product) => (
                        <StaggerItem key={product.id}>
                          <button
                            onClick={() => {
                              toggle(product)
                              setQuery('')
                            }}
                            className="group flex w-full items-center gap-3 rounded-xl border border-line-faint bg-surface-inset p-2.5 text-left transition hover:border-brand-400/50 hover:bg-surface-inset"
                          >
                            <span className="size-11 shrink-0 overflow-hidden rounded-lg bg-ink">
                              <ProductVisual product={product} className="size-full" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-1 block text-sm font-semibold text-ink">
                                {product.name}
                              </span>
                              <span className="block text-[11px] text-ink-subtle">
                                {product.brand} · {money(product.price)}
                              </span>
                            </span>
                            <Icon.Plus className="size-4 shrink-0 text-ink-subtle transition group-hover:text-brand-oncanvas" />
                          </button>
                        </StaggerItem>
                      ))}
                    </Stagger>

                    {candidates.length === 0 && (
                      <p className="mt-4 text-sm text-ink-subtle">
                        Nothing matches &ldquo;{query}&rdquo;. Try a brand name.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Section>

          {/* Comparison table -------------------------------------------- */}
          <Section className="!pt-4">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-ink">Specification differences</h2>
              <div className="w-64 max-w-full">
                <Tabs
                  value={view}
                  onChange={setView}
                  tabs={[
                    { id: 'table', label: 'Table' },
                    { id: 'cards', label: 'Highlight' },
                  ]}
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {view === 'table' ? (
                <motion.div
                  key="table"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                  className="panel overflow-x-auto"
                >
                  <table className="w-full min-w-3xl border-collapse text-sm">
                    <caption className="sr-only">
                      Specification comparison of {items.map((p) => p.name).join(', ')}
                    </caption>
                    <thead>
                      <tr className="border-b border-line">
                        <th scope="col" className="sticky left-0 z-10 bg-canvas-raised/95 px-5 py-4 text-left text-xs font-semibold tracking-wide text-ink-subtle uppercase backdrop-blur">
                          Specification
                        </th>
                        {items.map((product) => (
                          <th key={product.id} scope="col" className="px-5 py-4 text-left">
                            <span className="line-clamp-2 block text-xs font-semibold text-ink">
                              {product.name}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => {
                        const distinct = new Set(row.values.map((v) => v ?? '—')).size > 1
                        return (
                          <tr
                            key={row.label}
                            className={`border-b border-line-faint last:border-0 ${
                              i % 2 === 0 ? 'bg-surface-inset' : ''
                            }`}
                          >
                            <th
                              scope="row"
                              className={`sticky left-0 z-10 px-5 py-3.5 text-left text-xs font-semibold tracking-wide uppercase backdrop-blur ${
                                row.highlight ? 'text-ink' : 'text-ink-subtle'
                              } ${i % 2 === 0 ? 'bg-canvas-raised/95' : 'bg-canvas-raised/90'}`}
                            >
                              {row.label}
                              {distinct && (
                                <span className="ml-1.5 inline-block size-1.5 rounded-full bg-amber-400 align-middle" />
                              )}
                            </th>
                            {row.values.map((value, j) => {
                              const isBest =
                                row.label === 'Price'
                                  ? items[j]?.price === bestPrice
                                  : row.label === 'Rating'
                                    ? items[j]?.rating === bestRated
                                    : false
                              return (
                                <td
                                  key={`${row.label}-${j}`}
                                  className={`px-5 py-3.5 ${
                                    isBest ? 'font-bold text-emerald-300' : 'text-body'
                                  }`}
                                >
                                  {value ?? <span className="text-ink-faint">—</span>}
                                  {isBest && (
                                    <span className="ml-2 text-[10px] font-semibold tracking-wide uppercase">
                                      best
                                    </span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </motion.div>
              ) : (
                <motion.div
                  key="cards"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                >
                  <Stagger className="grid gap-4 md:grid-cols-2" stagger={0.08}>
                    {rows
                      .filter((r) => r.highlight || r.label === 'Warranty' || r.label === 'Condition')
                      .map((row) => (
                        <StaggerItem key={row.label}>
                          <div className="panel p-5">
                            <h3 className="text-[11px] font-semibold tracking-[0.16em] text-ink-subtle uppercase">
                              {row.label}
                            </h3>
                            <ul className="mt-3 space-y-2">
                              {row.values.map((value, j) => (
                                <li key={j} className="flex items-baseline justify-between gap-4">
                                  <span className="text-sm text-ink-muted">
                                    {items[j]?.name ?? '—'}
                                  </span>
                                  <span
                                    className={`text-sm font-semibold ${
                                      new Set(row.values).size > 1
                                        ? 'text-ink'
                                        : 'text-body'
                                    }`}
                                  >
                                    {value ?? '—'}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </StaggerItem>
                      ))}
                  </Stagger>
                </motion.div>
              )}
            </AnimatePresence>
          </Section>

          {/* Recommendation ----------------------------------------------- */}
          <Section className="!pt-4">
            <Reveal>
              <div className="panel ring-gradient flex flex-col items-center gap-5 p-8 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl border border-line bg-surface-inset text-brand-oncanvas">
                  <Icon.Sparkle className="size-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-ink">
                    On price per review, the pick is{' '}
                    <span className="text-brand-oncanvas">
                      {[...items]
                        .sort(
                          (a, b) =>
                            (b.rating ?? 0) / (b.price || 1) - (a.rating ?? 0) / (a.price || 1),
                        )
                        .at(0)?.name}
                    </span>
                  </h2>
                  <p className="mt-2 max-w-lg text-sm text-ink-muted">
                    A simple heuristic — rating divided by price — not a verdict. Read the
                    specifications above before you decide.
                  </p>
                </div>
                <Magnetic strength={0.2}>
                  <Link to="/shop" className="btn-primary sheen px-7 py-3">
                    <Icon.Search className="size-4" />
                    Keep looking
                  </Link>
                </Magnetic>
              </div>
            </Reveal>
          </Section>
        </>
      )}
    </SiteLayout>
  )
}
