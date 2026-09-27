import { Link } from 'react-router-dom'
import type { Product } from '../types'
import { StarRating } from './StarRating'
import { useCart } from '../lib/cart-context'

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart()

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md">
      <Link to={`/product/${product.slug}`} className="relative block aspect-4/3 overflow-hidden bg-slate-900">
        <img
          src={product.images[0]?.url}
          alt={product.images[0]?.alt ?? product.name}
          className="size-full object-cover opacity-90 transition group-hover:scale-105 group-hover:opacity-100"
        />
        {product.badge && (
          <span className="absolute left-2 top-2 rounded-md bg-emerald-500 px-2 py-1 text-[11px] font-bold text-white">
            {product.badge}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {product.category}
        </p>
        <Link to={`/product/${product.slug}`} className="text-sm font-semibold text-slate-900 hover:text-brand-600">
          {product.name}
        </Link>
        <StarRating rating={product.rating} reviewCount={product.reviewCount} />
        <div className="mt-1 flex items-center gap-2">
          <span className="text-base font-bold text-slate-900">${product.price.toLocaleString()}</span>
          {product.compareAtPrice && (
            <span className="text-xs text-slate-400 line-through">
              ${product.compareAtPrice.toLocaleString()}
            </span>
          )}
        </div>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-xs text-slate-400">{product.stockLabel ?? 'In Stock'}</span>
          <button
            onClick={() => addItem(product.id)}
            className="flex size-8 items-center justify-center rounded-md bg-brand-600 text-white transition hover:bg-brand-700"
            aria-label={`Add ${product.name} to cart`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h2l2.4 12.2a2 2 0 002 1.8h7.6a2 2 0 002-1.7L20 8H6" />
              <circle cx="9" cy="20" r="1" />
              <circle cx="17" cy="20" r="1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
