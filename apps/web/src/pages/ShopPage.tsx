import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SiteLayout } from '../components/SiteLayout'
import { TrustBar } from '../components/TrustBar'
import { ProductCard } from '../components/ProductCard'
import { products } from '../data/products'

const categories = [
  { name: 'All Computers', count: 8 },
  { name: 'Monitors & Screens', count: 6 },
  { name: 'Performance Mice', count: 4 },
  { name: 'Mechanical Keyboards', count: 6 },
]

const brandsList = ['Billionare', 'ASUS', 'ASRock', 'Logitech']

export function ShopPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!activeCategory) return products
    return products.filter((p) => p.category === activeCategory)
  }, [activeCategory])

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-xs text-slate-400">
          Home / <span className="text-slate-500">Shop Categories</span> / All Hardware
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Shop & Search Results</h1>
        <p className="mt-1 text-sm text-slate-500">
          Showing {filtered.length} of {products.length} premium workstation devices tagged
          &ldquo;Certified In-Stock&rdquo;
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {['Categories ×', 'In-Stock Only ×', 'Rating 4.5+ ×'].map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500"
            >
              {chip}
            </span>
          ))}
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside className="space-y-8">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Categories</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {categories.map((cat) => (
                  <li key={cat.name}>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={activeCategory === cat.name}
                        onChange={() =>
                          setActiveCategory((prev) => (prev === cat.name ? null : cat.name))
                        }
                        className="size-3.5 accent-brand-600"
                      />
                      {cat.name} ({cat.count})
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">Price Filter</h3>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <input
                  type="text"
                  placeholder="$ Min"
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5"
                />
                <span>–</span>
                <input
                  type="text"
                  placeholder="$ Max"
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5"
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">Brand</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {brandsList.map((brand) => (
                  <li key={brand} className="flex items-center gap-2">
                    <input type="checkbox" className="size-3.5 accent-brand-600" />
                    {brand}
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-slate-400">{filtered.length} results</span>
              <select className="rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-600">
                <option>Sort by: Recommended</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Top Rated</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {filtered.length === 0 && (
              <p className="mt-10 text-center text-sm text-slate-400">
                No products match this filter yet.{' '}
                <Link to="/shop" className="text-brand-600 hover:underline">
                  Clear filters
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>

      <TrustBar />
    </SiteLayout>
  )
}
