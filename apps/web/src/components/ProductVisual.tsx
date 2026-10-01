import { motion, useReducedMotion } from 'motion/react'
import { memo } from 'react'
import { Icon } from './icons'
import type { Product } from '../types'

/* -------------------------------------------------------------------------- */
/*  Placeholder                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Shown until an admin uploads a picture for the product. Products are created
 * before their photography exists, so the storefront needs a tile that reads as
 * "not photographed yet" rather than a broken image.
 */
function NoImage({ name, className = '' }: { name: string; className?: string }) {
  return (
    <div className={`flex size-full items-center justify-center bg-ink-soft ${className}`}>
      <Icon.Package className="size-1/4 text-ink-muted" />
      <span className="sr-only">No image for {name} yet</span>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Thumb                                                                      */
/* -------------------------------------------------------------------------- */

/** Square product image with no tile chrome, for lists, carts and compare rows. */
export const ProductThumb = memo(function ProductThumb({
  product,
  className = '',
}: {
  product: Pick<Product, 'name' | 'image'>
  className?: string
}) {
  if (!product.image) return <NoImage name={product.name} className={className} />

  return (
    <img
      src={product.image.url}
      alt={product.image.alt || product.name}
      className={`size-full object-cover ${className}`}
      loading="lazy"
      decoding="async"
    />
  )
})

/* -------------------------------------------------------------------------- */
/*  ProductVisual — the full product tile.                                     */
/* -------------------------------------------------------------------------- */

export const ProductVisual = memo(function ProductVisual({
  product,
  className = '',
  animate = true,
}: {
  product: Product
  className?: string
  animate?: boolean
}) {
  const reduce = useReducedMotion()
  const live = animate && !reduce

  return (
    <div className={`relative overflow-hidden bg-ink-soft ${className}`}>
      {product.image ? (
        <motion.img
          src={product.image.url}
          alt={product.image.alt || product.name}
          className="size-full object-cover"
          loading="lazy"
          decoding="async"
          initial={live ? { opacity: 0, scale: 1.02 } : false}
          whileHover={live ? { scale: 1.05 } : undefined}
          animate={live ? { opacity: 1, scale: 1 } : undefined}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      ) : (
        <NoImage name={product.name} />
      )}

      <span className="pointer-events-none absolute inset-0 ring-1 ring-white/8 ring-inset" />
    </div>
  )
})

/* -------------------------------------------------------------------------- */
/*  Tint                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Stable hue per id, so the product card tint and the category chips still vary
 * from tile to tile without the catalog having to store a colour. Presentation
 * only — the same id always produces the same hue, on this device and the next.
 */
export function hueFor(seed: string): number {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 360
  }
  return hash
}
