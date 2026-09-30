import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../lib/cart-context'
import { useToast } from '../lib/motion/toast'
import { ProductVisual, hueFor } from './ProductVisual'
import { StarRating } from './StarRating'
import { Icon } from './icons'
import { PriceTag, StockPill } from './ui'
import type { Product } from '../types'
import { discountPercent, isNew } from '../lib/catalog'
import { money } from '../lib/money'

export function ProductCard({
  product,
  index = 0,
  compact = false,
}: {
  product: Product
  index?: number
  compact?: boolean
}) {
  const { addItem, toggleWishlist, isWishlisted } = useCart()
  const { push } = useToast()
  const reduce = useReducedMotion()
  const [burst, setBurst] = useState(0)
  const saved = isWishlisted(product.id)
  const discount = discountPercent(product) ?? 0

  const onAdd = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Wait for the write before celebrating: a signed-in cart is server-side,
    // so the request can fail, and the cart context has already told the user
    // why. Bursting and claiming success regardless would be a lie.
    if (!(await addItem(product.id, 1))) return
    setBurst((b) => b + 1)
    push({
      title: 'Added to cart',
      description: product.name,
      amount: money(product.price),
      action: { label: 'Go to cart', to: '/cart' },
    })
  }

  const onWish = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const added = toggleWishlist(product.id)
    push({
      title: added ? 'Saved for later' : 'Removed from saved',
      description: product.name,
      action: added ? { label: 'View saved items', to: '/account?tab=saved' } : undefined,
    })
  }

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 26, filter: 'blur(8px)' }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.65, delay: Math.min(index, 7) * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="group panel ring-gradient relative flex flex-col overflow-hidden transition-transform duration-500 hover:-translate-y-1.5"
      style={{ ['--hue' as string]: hueFor(product.id) }}
    >
      {/* Artwork */}
      <Link
        to={`/product/${product.slug}`}
        className="relative block aspect-[4/3] overflow-hidden"
        aria-label={product.name}
      >
        <ProductVisual product={product} className="size-full" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
          {product.badge && (
            <span className="badge bg-surface-glass-hover text-ink backdrop-blur-md ring-1 ring-white/20">
              {product.badge}
            </span>
          )}
          {isNew(product) && (
            <span className="badge bg-linear-to-r from-accent-500 to-brand-500 text-ink shadow-lg shadow-accent-500/25">
              Just landed
            </span>
          )}
          {discount > 0 && (
            <span className="badge bg-emerald-500 text-ink shadow-lg shadow-emerald-500/25">
              &minus;{discount}%
            </span>
          )}
        </div>

        {/* Wishlist */}
        <motion.button
          onClick={onWish}
          whileTap={{ scale: 0.85 }}
          aria-label={saved ? 'Remove from saved items' : 'Save for later'}
          aria-pressed={saved}
          className={`absolute top-3 right-3 flex size-9 items-center justify-center rounded-full border backdrop-blur-md transition-colors ${
            saved
              ? 'border-rose-400/50 bg-rose-500/20 text-rose-300'
              : 'border-white/15 bg-black/30 text-white/80 hover:bg-black/50 hover:text-white'
          }`}
        >
          {saved ? <Icon.HeartFilled className="size-4" /> : <Icon.Heart className="size-4" />}
        </motion.button>

        {/* Quick add */}
        <div className="absolute inset-x-2.5 bottom-2.5 translate-y-3 opacity-0 transition-all duration-400 group-hover:translate-y-0 group-hover:opacity-100 focus-within:translate-y-0 focus-within:opacity-100">
          <button
            onClick={onAdd}
            className="sheen flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-bold text-navy-950 shadow-xl backdrop-blur transition-transform duration-300 hover:scale-[1.02] active:scale-95"
          >
            <Icon.Cart className="size-4" />
            Add to cart
          </button>
        </div>

        {/* Add confirmation ring */}
        <motion.span
          key={burst}
          className="pointer-events-none absolute inset-0 border-2 border-emerald-400/70"
          initial={{ opacity: 0.9, scale: 1 }}
          animate={{ opacity: 0, scale: 1.25 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ display: burst > 0 ? 'block' : 'none' }}
        />
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold tracking-[0.14em] text-ink-subtle uppercase">
            {product.brand ?? product.category}
          </span>
          {product.stock <= 3 && (
            <span className="text-[10px] font-bold text-rose-400">{product.stock} left</span>
          )}
        </div>

        <Link
          to={`/product/${product.slug}`}
          className="mt-1.5 line-clamp-2 text-sm font-bold text-ink transition-colors hover:text-brand-oncanvas"
        >
          {product.name}
        </Link>

        {!compact && (
          <div className="mt-2">
            {product.rating !== null && (
              <StarRating rating={product.rating} reviewCount={product.reviewCount} />
            )}
          </div>
        )}

        <div className="mt-auto pt-4">
          <PriceTag
            price={product.price}
            compareAt={discount > 0 ? product.compareAtPrice : null}
            size="md"
          />
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <StockPill stock={product.stock} label={product.stockLabel} />
            <Link
              to={`/product/${product.slug}`}
              className="flex items-center gap-1 text-xs font-semibold text-ink-muted transition-colors hover:text-brand-oncanvas"
            >
              Details
              <Icon.ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  )
}
