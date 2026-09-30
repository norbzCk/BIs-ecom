import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { TrustBar } from '../components/TrustBar'
import { SiteLayout } from '../components/SiteLayout'
import { Icon } from '../components/icons'
import { Breadcrumbs, EmptyState, Section } from '../components/ui'
import { SectionHeading } from '../lib/motion/marquee'
import { useCatalog, discountPercent } from '../lib/catalog'
import { money } from '../lib/money'

type Sort = 'recommended' | 'price-asc' | 'price-desc' | 'rating' | 'newest' | 'discount'

const SORTS: { id: Sort; label: string }[] = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'rating', label: 'Top rated' },
  { id: 'newest', label: 'Newest first' },
  { id: 'discount', label: 'Biggest discount' },
]

const PER_PAGE = 9

const PRICE_BANDS = [
  { id: 'all', label: 'Any price', min: 0, max: Infinity },
  { id: 'under-500', label: 'Under TSh 500,000', min: 0, max: 500_000 },
  { id: '500-1m', label: 'TSh 500,000 – 1,000,000', min: 500_000, max: 1_000_000 },
  { id: '1m-3m', label: 'TSh 1M – 3M', min: 1_000_000, max: 3_000_000 },
  { id: 'over-3m', label: 'Over TSh 3M', min: 3_000_000, max: Infinity },
] as const

type BandId = (typeof PRICE_BANDS)[number]['id']

export function ShopPage() {
  const [params, setParams] = useSearchParams()

  const [query, setQuery] = useState(() => params.get('q') ?? '')
  const { products, categories: catalogCategories, brands: catalogBrands } = useCatalog()
  const [categoryFilter, setCategoryFilter] = useState<string[]>(() => {
    const c = params.get('category')
    return c ? [c] : []
  })
  const [brands, setBrands] = useState<string[]>([])
  const [band, setBand] = useState<BandId>('all')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [topRatedOnly, setTopRatedOnly] = useState(false)
  const [sort, setSort] = useState<Sort>('recommended')
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [draftMin, setDraftMin] = useState('')
  const [draftMax, setDraftMax] = useState('')

  // Keep the URL in sync so results are shareable and back/forward works.
  useEffect(() => {
    const next = new URLSearchParams()
    if (query.trim()) next.set('q', query.trim())
    if (categoryFilter.length === 1) next.set('category', categoryFilter[0])
    if (categoryFilter.length > 1) next.set('category', categoryFilter.join(','))
    if (brands.length) next.set('brand', brands.join(','))
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, categoryFilter, brands])

  useEffect(() => setPage(1), [query, categoryFilter, brands, band, inStockOnly, topRatedOnly, sort])

  const minPrice = draftMin === '' ? null : Number(draftMin)
  const maxPrice = draftMax === '' ? null : Number(draftMax)

  const activeBands = PRICE_BANDS.filter((b) => b.id === band)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()

    let list = products.filter((p) => {
      if (categoryFilter.length && !categoryFilter.includes(p.category)) return false
      if (brands.length && !brands.includes(p.brand ?? '')) return false
      if (inStockOnly && p.stock <= 0) return false
      if (topRatedOnly && (p.rating ?? 0) < 4.5) return false

      if (minPrice !== null && !Number.isNaN(minPrice) && p.price < minPrice) return false
      if (maxPrice !== null && !Number.isNaN(maxPrice) && p.price > maxPrice) return false

      if (band !== 'all') {
        const b = activeBands[0]
        if (b && (p.price < b.min || p.price > b.max)) return false
      }

      if (q) {
        const haystack = [p.name, p.brand ?? '', p.category, p.badge ?? ''].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })

    const sorted = [...list]
    switch (sort) {
      case 'price-asc':
        sorted.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        sorted.sort((a, b) => b.price - a.price)
        break
      case 'rating':
        sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        break
      case 'newest':
        sorted.sort((a, b) => (b.releasedAt ?? '').localeCompare(a.releasedAt ?? ''))
        break
      case 'discount':
        sorted.sort((a, b) => (discountPercent(b) ?? 0) - (discountPercent(a) ?? 0))
        break
      default:
        sorted.sort(
          (a, b) => Number(!!b.featured) - Number(!!a.featured) || (b.rating ?? 0) - (a.rating ?? 0),
        )
    }
    return sorted
  }, [
    query,
    products,
    categoryFilter,
    brands,
    band,
    inStockOnly,
    topRatedOnly,
    minPrice,
    maxPrice,
    sort,
    activeBands,
  ])

  const pageCount = Math.max(1, Math.ceil(results.length / PER_PAGE))
  const pageItems = results.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const toggleIn = (list: string[], value: string, set: (next: string[]) => void) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

  const activeFilters =
    categoryFilter.length +
    brands.length +
    (band !== 'all' ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (topRatedOnly ? 1 : 0) +
    (minPrice !== null || maxPrice !== null ? 1 : 0)

  const clearAll = () => {
    setQuery('')
    setCategoryFilter([])
    setBrands([])
    setBand('all')
    setInStockOnly(false)
    setTopRatedOnly(false)
    setDraftMin('')
    setDraftMax('')
  }

  const filterPanel = (
    <div className="space-y-7">
      <FilterGroup title="Category" count={categoryFilter.length || undefined}>
        {catalogCategories.map((c) => (
          <CheckRow
            key={c.name}
            label={c.name}
            count={c.productCount}
            checked={categoryFilter.includes(c.name)}
            onChange={() => toggleIn(categoryFilter, c.name, setCategoryFilter)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Price">
        <div className="space-y-2">
          {PRICE_BANDS.map((b) => (
            <CheckRow
              key={b.id}
              label={b.label}
              checked={band === b.id}
              onChange={() => setBand(b.id)}
              radio
            />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={draftMin}
            onChange={(e) => setDraftMin(e.target.value)}
            placeholder="Min"
            aria-label="Minimum price"
            className="input py-1.5 text-xs"
          />
          <span className="text-ink-faint">–</span>
          <input
            type="number"
            min={0}
            value={draftMax}
            onChange={(e) => setDraftMax(e.target.value)}
            placeholder="Max"
            aria-label="Maximum price"
            className="input py-1.5 text-xs"
          />
        </div>
      </FilterGroup>

      <FilterGroup title="Brand" count={brands.length || undefined}>
        {catalogBrands.map((b) => {
          const count = products.filter((p) => p.brand === b).length
          if (count === 0) return null
          return (
            <CheckRow
              key={b}
              label={b}
              count={count}
              checked={brands.includes(b)}
              onChange={() => toggleIn(brands, b, setBrands)}
            />
          )
        })}
      </FilterGroup>

      <FilterGroup title="Availability & quality">
        <div className="space-y-2.5">
          <CheckRow
            label="In stock only"
            checked={inStockOnly}
            onChange={() => setInStockOnly((v) => !v)}
          />
          <CheckRow
            label="Rated 4.5 and above"
            checked={topRatedOnly}
            onChange={() => setTopRatedOnly((v) => !v)}
          />
        </div>
      </FilterGroup>
    </div>
  )

  return (
    <SiteLayout>
      {/* Header band */}
      <div className="relative overflow-hidden border-b border-line-faint">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-linear-to-b from-brand-600/12 to-transparent"
        />
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[{ label: 'Home', to: '/' }, { label: 'Shop' }]}
          />
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-balance sm:text-3xl">
                {query.trim() ? (
                  <>
                    Results for <span className="gradient-text">&ldquo;{query.trim()}&rdquo;</span>
                  </>
                ) : (
                  'The full catalog'
                )}
              </h1>
              <p className="mt-2 text-sm text-ink-muted">
                <span className="font-semibold text-ink">{results.length}</span> of {products.length}{' '}
                products &middot; all verified in stock
              </p>
            </div>

            <div className="relative">
              <Icon.Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by name, brand, spec…"
                aria-label="Filter products"
                className="input w-full pl-9 sm:w-80"
              />
            </div>
          </div>

          {/* Active filter chips */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {categoryFilter.map((c) => (
              <Chip key={c} onRemove={() => toggleIn(categoryFilter, c, setCategoryFilter)}>
                {c}
              </Chip>
            ))}
            {brands.map((b) => (
              <Chip key={b} onRemove={() => toggleIn(brands, b, setBrands)}>
                {b}
              </Chip>
            ))}
            {band !== 'all' && (
              <Chip onRemove={() => setBand('all')}>
                {PRICE_BANDS.find((b) => b.id === band)?.label}
              </Chip>
            )}
            {(minPrice !== null || maxPrice !== null) && (
              <Chip onRemove={() => { setDraftMin(''); setDraftMax('') }}>
                {draftMin ? money(Number(draftMin)) : money(0)} –{' '}
                {draftMax ? money(Number(draftMax)) : 'any'}
              </Chip>
            )}
            {inStockOnly && <Chip onRemove={() => setInStockOnly(false)}>In stock only</Chip>}
            {topRatedOnly && <Chip onRemove={() => setTopRatedOnly(false)}>Rated 4.5+</Chip>}
            {query.trim() && <Chip onRemove={() => setQuery('')}>&ldquo;{query.trim()}&rdquo;</Chip>}

            {activeFilters > 0 && (
              <button
                onClick={clearAll}
                className="ml-1 text-xs font-semibold text-ink-subtle underline-offset-4 transition hover:text-rose-300 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      <Section className="py-10 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-32 lg:self-start">
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className="btn-ghost btn-sm w-full lg:hidden"
              aria-expanded={filtersOpen}
            >
              <Icon.Filter className="size-4" />
              {filtersOpen ? 'Hide filters' : 'Show filters'}
              {activeFilters > 0 && (
                <span className="ml-1 rounded-md bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-ink">
                  {activeFilters}
                </span>
              )}
            </button>

            <div className={`mt-4 lg:mt-0 ${filtersOpen ? 'block' : 'hidden lg:block'}`}>
              {filterPanel}
            </div>
          </aside>

          {/* Results */}
          <div>
            <div className="mb-5 flex items-center justify-between gap-3">
              <p className="text-sm text-ink-subtle">
                {results.length > 0 ? (
                  <>
                    Showing{' '}
                    <span className="font-semibold text-body">
                      {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, results.length)}
                    </span>{' '}
                    of {results.length}
                  </>
                ) : (
                  'No matches'
                )}
              </p>

              <div className="flex items-center gap-2">
                <label htmlFor="sort" className="hidden text-xs text-ink-subtle sm:block">
                  Sort
                </label>
                <select
                  id="sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  className="input w-auto py-1.5 text-sm"
                >
                  {SORTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {results.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.4 }}
                >
                  <EmptyState
                    icon={<Icon.Search className="size-6" />}
                    title="Nothing matches those filters"
                    body="Try widening the price range, removing a brand, or searching for something broader like &ldquo;monitor&rdquo;."
                    action={{ label: 'Clear all filters', to: '/shop' }}
                  />
                  <div className="mt-4 text-center">
                    <button onClick={clearAll} className="btn-quiet btn-sm">
                      Reset filters instead
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={`${page}-${sort}-${results.length}`}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="grid grid-cols-2 gap-4 md:grid-cols-3"
                >
                  {pageItems.map((product, i) => (
                    <ProductCard key={product.id} product={product} index={i} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pagination */}
            {pageCount > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Pagination">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-ghost btn-sm"
                  aria-label="Previous page"
                >
                  <Icon.ChevronLeft className="size-4" />
                </button>

                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    aria-current={n === page ? 'page' : undefined}
                    className={`relative size-9 rounded-lg text-sm font-semibold transition ${
                      n === page ? 'text-ink' : 'text-ink-muted hover:bg-surface-inset hover:text-ink'
                    }`}
                  >
                    {n === page && (
                      <motion.span
                        layoutId="page-pill"
                        className="absolute inset-0 rounded-lg bg-linear-to-br from-brand-500 to-accent-500"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative">{n}</span>
                  </button>
                ))}

                <button
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page === pageCount}
                  className="btn-ghost btn-sm"
                  aria-label="Next page"
                >
                  <Icon.ChevronRight className="size-4" />
                </button>
              </nav>
            )}
          </div>
        </div>
      </Section>

      {/* Cross-sell */}
      {results.length > 0 && results.length < products.length && (
        <div className="border-t border-line-faint">
          <Section className="py-14">
            <SectionHeading
              eyebrow="You might also like"
              title="Outside your current filters"
              action={
                <button onClick={clearAll} className="btn-ghost btn-sm">
                  Show everything
                </button>
              }
            />
            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {products
                .filter((p) => !results.some((r) => r.id === p.id))
                .slice(0, 4)
                .map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} />
                ))}
            </div>
          </Section>
        </div>
      )}

      <TrustBar />
    </SiteLayout>
  )
}

/* -------------------------------------------------------------------------- */

function FilterGroup({
  title,
  count,
  children,
}: {
  title: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <div className="panel p-4">
      <h3 className="flex items-center justify-between text-xs font-bold tracking-[0.14em] text-body uppercase">
        {title}
        {count ? (
          <span className="rounded-md bg-brand-500/20 px-1.5 py-0.5 text-[10px] text-brand-oncanvas">
            {count}
          </span>
        ) : null}
      </h3>
      <div className="mt-3.5">{children}</div>
    </div>
  )
}

function CheckRow({
  label,
  count,
  checked,
  onChange,
  radio = false,
}: {
  label: string
  count?: number
  checked: boolean
  onChange: () => void
  radio?: boolean
}) {
  return (
    <label className="group flex cursor-pointer items-center gap-2.5 py-1 text-sm">
      <span className="relative flex items-center">
        <input
          type={radio ? 'radio' : 'checkbox'}
          checked={checked}
          onChange={onChange}
          className="peer sr-only"
        />
        <span
          className={`flex items-center justify-center border transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 ${
            radio ? 'size-4 rounded-full' : 'size-4 rounded-[5px]'
          } ${checked ? 'border-brand-500 bg-brand-500' : 'border-line-strong bg-surface-inset group-hover:border-line-strong'}`}
        >
          <AnimatePresence>
            {checked && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 600, damping: 26 }}
                className="flex size-full items-center justify-center text-ink"
              >
                {radio ? (
                  <span className="size-1.5 rounded-full bg-white" />
                ) : (
                  <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth={3.5}>
                    <path d="m5 12.5 4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </span>

      <span className={`flex-1 transition-colors ${checked ? 'text-ink' : 'text-ink-muted group-hover:text-body'}`}>
        {label}
      </span>

      {typeof count === 'number' && (
        <span className="text-xs text-ink-faint tabular-nums">{count}</span>
      )}
    </label>
  )
}

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="chip gap-1.5"
      data-active="true"
    >
      {children}
      <button
        onClick={onRemove}
        aria-label={`Remove filter ${String(children)}`}
        className="-mr-1 flex size-4 items-center justify-center rounded-full transition hover:bg-surface-inset"
      >
        <Icon.X className="size-2.5" />
      </button>
    </motion.span>
  )
}
