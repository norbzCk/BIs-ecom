import { motion, useReducedMotion } from 'motion/react'
import { memo, useId } from 'react'
import type { Product } from '../types'

/* -------------------------------------------------------------------------- */
/*  Placeholder                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Shown until an admin uploads a picture for the product. Products are created
 * before their photography exists, so the storefront needs a tile that looks
 * deliberate rather than broken.
 */
function NoImage({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex size-full items-center justify-center bg-linear-to-br from-ink-soft to-ink ${className}`}
    >
      <svg viewBox="0 0 24 24" className="size-1/3 text-ink-muted" fill="none" aria-hidden>
        <path
          d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5v-9Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="m4 16 4.5-4.5a1.5 1.5 0 0 1 2.1 0L14 15m0 0 2-2a1.5 1.5 0 0 1 2.1 0L21 16M8.5 9.75h.01"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">No image yet</span>
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
  if (!product.image) return <NoImage className={className} />

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
  const uid = useId().replace(/:/g, '')
  const hue = hueFor(product.id)

  return (
    <div className={`relative overflow-hidden bg-ink ${className}`}>
      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 200 150"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <radialGradient id={`${uid}a`} cx="26%" cy="18%">
            <stop offset="0%" stopColor={`hsl(${hue} 90% 62%)`} stopOpacity=".55" />
            <stop offset="100%" stopColor={`hsl(${hue} 90% 62%)`} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${uid}b`} cx="82%" cy="88%">
            <stop offset="0%" stopColor={`hsl(${hue + 58} 92% 58%)`} stopOpacity=".45" />
            <stop offset="100%" stopColor={`hsl(${hue + 58} 92% 58%)`} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="200" height="150" fill="#070911" />
        <rect width="200" height="150" fill={`url(#${uid}a)`} />
        <rect width="200" height="150" fill={`url(#${uid}b)`} />
      </svg>

      {product.image ? (
        <motion.div
          className="absolute inset-0"
          initial={live ? { opacity: 0, scale: 1.04 } : false}
          whileHover={live ? { scale: 1.06 } : undefined}
          animate={live ? { opacity: 1, scale: 1 } : undefined}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <img
            src={product.image.url}
            alt={product.image.alt || product.name}
            className="size-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </motion.div>
      ) : (
        <NoImage />
      )}

      {live && (
        <motion.span
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-linear-to-r from-transparent via-white/12 to-transparent"
          animate={{ x: ['0%', '420%'] }}
          transition={{ duration: 4.2, repeat: Infinity, repeatDelay: 3.6, ease: 'easeInOut' }}
        />
      )}

      <span className="pointer-events-none absolute inset-0 ring-1 ring-white/8 ring-inset" />
    </div>
  )
})

/* -------------------------------------------------------------------------- */
/*  Tint                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Stable hue per id, so the decorative backdrops still vary from tile to tile
 * without the catalog having to store a colour. Presentation only — the same id
 * always produces the same hue, on this device and the next.
 */
export function hueFor(seed: string): number {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 360
  }
  return hash
}
