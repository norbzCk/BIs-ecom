import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { SiteLayout } from '../components/SiteLayout'
import { TrustBar } from '../components/TrustBar'
import { StarRating } from '../components/StarRating'
import { getProductBySlug } from '../data/products'
import { useCart } from '../lib/cart-context'

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const product = slug ? getProductBySlug(slug) : undefined
  const { addItem } = useCart()
  const [activeImage, setActiveImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  if (!product) return <Navigate to="/shop" replace />

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-xs text-slate-400">
          <Link to="/shop" className="hover:text-slate-600">
            Shop
          </Link>{' '}
          / <span className="text-brand-600">{product.category}</span>
        </p>

        <div className="mt-4 grid gap-10 lg:grid-cols-2">
          {/* Gallery */}
          <div>
            <div className="aspect-4/3 overflow-hidden rounded-xl bg-slate-900">
              <img
                src={product.images[activeImage]?.url}
                alt={product.images[activeImage]?.alt ?? product.name}
                className="size-full object-cover"
              />
            </div>
            {product.images.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {product.images.map((img, i) => (
                  <button
                    key={img.url}
                    onClick={() => setActiveImage(i)}
                    className={`aspect-square overflow-hidden rounded-lg border-2 ${
                      i === activeImage ? 'border-brand-600' : 'border-transparent'
                    }`}
                  >
                    <img src={img.url} alt={img.alt} className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Buy box */}
          <div>
            {product.badge && (
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                {product.badge} · Ref: SKU-{product.id.toUpperCase()}
              </span>
            )}
            <h1 className="mt-2 text-2xl font-bold text-slate-900">{product.name}</h1>
            <div className="mt-2">
              <StarRating rating={product.rating} reviewCount={product.reviewCount} size="md" />
            </div>

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-slate-900">
                ${product.price.toLocaleString()}
              </span>
              {product.compareAtPrice && (
                <span className="text-base text-slate-400 line-through">
                  ${product.compareAtPrice.toLocaleString()}
                </span>
              )}
              {product.compareAtPrice && (
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                  SAVE ${(product.compareAtPrice - product.price).toLocaleString()}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              or 12 monthly interest-free payments of ${(product.price / 12).toFixed(2)}/mo
            </p>

            {product.description && (
              <p className="mt-4 text-sm leading-relaxed text-slate-600">{product.description}</p>
            )}

            {product.stockLabel && (
              <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-amber-600">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.86L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.86a2 2 0 00-3.4 0z" />
                </svg>
                {product.stockLabel} — order in the next 2 hours for free delivery tomorrow
              </p>
            )}

            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center rounded-lg border border-slate-200">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 text-slate-500 hover:text-slate-900"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-3 py-2 text-slate-500 hover:text-slate-900"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              <button
                onClick={() => {
                  addItem(product.id, quantity)
                  setAdded(true)
                  setTimeout(() => setAdded(false), 1800)
                }}
                className="flex-1 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                {added ? 'Added to Cart ✓' : 'Add to Cart'}
              </button>
              <Link
                to="/checkout"
                onClick={() => addItem(product.id, quantity)}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Buy Now Instant
              </Link>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              Have custom procurement questions?{' '}
              <span className="font-medium text-brand-600">Message Shop →</span>
            </p>
          </div>
        </div>

        {/* Specs */}
        {product.specs.length > 0 && (
          <div className="mt-14">
            <h2 className="text-lg font-bold text-slate-900">Detailed Technical Specifications</h2>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
              {product.specs.map((spec, i) => (
                <div
                  key={spec.label}
                  className={`grid grid-cols-1 gap-1 px-4 py-3 text-sm sm:grid-cols-[240px_1fr] sm:gap-4 ${
                    i % 2 === 0 ? 'bg-slate-50' : 'bg-white'
                  }`}
                >
                  <span className="font-semibold text-slate-700">{spec.label}</span>
                  <span className="text-slate-600">{spec.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <TrustBar />
    </SiteLayout>
  )
}
