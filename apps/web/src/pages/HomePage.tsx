import { Link } from 'react-router-dom'
import { SiteLayout } from '../components/SiteLayout'
import { TrustBar } from '../components/TrustBar'
import { StarRating } from '../components/StarRating'
import { products, reviews } from '../data/products'

const categories = [
  { name: 'Computers', icon: 'laptop' },
  { name: 'Monitors', icon: 'monitor' },
  { name: 'Mice', icon: 'mouse' },
  { name: 'Keyboards', icon: 'keyboard' },
  { name: 'Audio', icon: 'headset' },
  { name: 'Accessories', icon: 'cable' },
]

const brands = ['Intel', 'NVIDIA', 'ASUS', 'AMD', 'Logitech', 'BenQ']

export function HomePage() {
  const featured = products.slice(0, 4)
  const clearance = products.slice(4, 6)

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-900">
        <img
          src="https://placehold.co/1600x700/0b1220/1d4ed8?text=Billionare+Workstation"
          alt="Dual monitor mechanical-keyboard workstation setup"
          className="absolute inset-0 size-full object-cover opacity-40"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <span className="inline-block rounded-full bg-brand-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            Exclusive Seasonal Event
          </span>
          <h1 className="mt-5 max-w-xl text-4xl font-extrabold leading-tight text-white sm:text-5xl">
            Upgrade Your Setup. Work Faster. Play Harder.
          </h1>
          <p className="mt-4 max-w-md text-sm text-slate-300">
            Explore premium computers, curved monitors, custom tactile keyboards, and
            performance workstation mice. Engineered for digital power users.
          </p>
          <div className="mt-7 flex gap-3">
            <Link
              to="/shop"
              className="rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Explore Shop Now
            </Link>
            <Link
              to="/deals"
              className="rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              View Deals
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-lg font-bold text-slate-900">Browse Trusted Categories</h2>
        <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              to="/shop"
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 py-5 text-center hover:border-brand-200 hover:bg-brand-50"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="size-6 text-brand-600">
                <rect x="4" y="4" width="16" height="11" rx="1.5" />
                <path strokeLinecap="round" d="M2 19h20" />
              </svg>
              <span className="text-xs font-medium text-slate-600">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Arrivals */}
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Featured Hardware Arrivals</h2>
          <Link to="/shop" className="text-sm font-semibold text-brand-600 hover:underline">
            View All Arrivals →
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {featured.map((product) => (
            <Link
              key={product.id}
              to={`/product/${product.slug}`}
              className="group relative block aspect-4/3 overflow-hidden rounded-xl bg-slate-900"
            >
              <img
                src={product.images[0]?.url}
                alt={product.images[0]?.alt ?? product.name}
                className="size-full object-cover opacity-90 transition group-hover:scale-105"
              />
              {product.badge && (
                <span className="absolute left-2 top-2 rounded-md bg-emerald-500 px-2 py-1 text-[11px] font-bold text-white">
                  {product.badge}
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-xs font-semibold text-white">
                {product.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Weekly clearance */}
      <section className="bg-amber-50/60 py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <span className="inline-block rounded-md bg-amber-500 px-2.5 py-1 text-[11px] font-bold uppercase text-white">
            Limited Flash Discounts
          </span>
          <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <h2 className="max-w-sm text-xl font-bold text-slate-900">
              Weekly High-Power Clearance Items
            </h2>
            <p className="max-w-sm text-sm text-slate-500">
              Get verified direct-from-factory computing gear with discounts up to 25%. Restocked
              every Tuesday with complete fulfillment.
            </p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {clearance.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.slug}`}
                className="group relative block aspect-video overflow-hidden rounded-xl bg-slate-900"
              >
                <img
                  src={product.images[0]?.url}
                  alt={product.images[0]?.alt ?? product.name}
                  className="size-full object-cover opacity-90 transition group-hover:scale-105"
                />
                {product.badge && (
                  <span className="absolute left-2 top-2 rounded-md bg-emerald-500 px-2 py-1 text-[11px] font-bold text-white">
                    {product.badge}
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/80 to-transparent p-3">
                  <span className="text-sm font-semibold text-white">{product.name}</span>
                  <span className="text-sm font-bold text-white">${product.price.toLocaleString()}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-lg font-bold text-slate-900">
          Thousands of Certified Workspace Reviews
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-slate-100 p-4">
              <StarRating rating={review.rating} />
              <p className="mt-3 text-sm leading-relaxed text-slate-600">“{review.quote}”</p>
              <p className="mt-3 text-sm font-semibold text-slate-900">{review.author}</p>
              {review.role && <p className="text-xs text-slate-400">{review.role}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Brand strip */}
      <section className="border-y border-slate-100 bg-slate-50 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-around gap-4 px-4 text-sm font-semibold text-slate-400 sm:px-6">
          {brands.map((brand) => (
            <span key={brand}>{brand}</span>
          ))}
        </div>
      </section>

      <TrustBar />
    </SiteLayout>
  )
}
