import { motion, useReducedMotion } from 'motion/react'
import { useId, memo } from 'react'
import type { ArtKind, Product } from '../types'

/* -------------------------------------------------------------------------- */
/*  DeviceArt — line-art illustrations of each product family, drawn on a     */
/*  200x150 grid so every scene shares the same optical weight.               */
/* -------------------------------------------------------------------------- */

interface ArtProps {
  /** Unique gradient ids, so multiple instances on a page never collide. */
  s: string
  e: string
}

function Laptop({ s, e }: ArtProps) {
  return (
    <g>
      <path
        d="M56 30h88a5 5 0 0 1 5 5v58H51V35a5 5 0 0 1 5-5Z"
        fill={`url(#${s})`}
        stroke={`url(#${e})`}
        strokeWidth="2"
      />
      <path d="M56 30h88a5 5 0 0 1 5 5v6H51v-6a5 5 0 0 1 5-5Z" fill="#fff" opacity=".1" />
      <path
        d="M64 44h72M64 54h72M64 64h46M64 74h58"
        stroke="#fff"
        strokeOpacity=".28"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M38 93h124l10 11a3 3 0 0 1-2 5H30a3 3 0 0 1-2-5l10-11Z"
        fill="#0d1120"
        stroke={`url(#${e})`}
        strokeWidth="2"
      />
      <path d="M88 98h24" stroke="#fff" strokeOpacity=".45" strokeWidth="2.4" strokeLinecap="round" />
    </g>
  )
}

function Monitor({ s, e }: ArtProps) {
  return (
    <g>
      <rect
        x="30"
        y="20"
        width="140"
        height="82"
        rx="7"
        fill={`url(#${s})`}
        stroke={`url(#${e})`}
        strokeWidth="2"
      />
      <path
        d="M74 102c0 14-4 18-10 21h72c-6-3-10-7-10-21"
        fill="none"
        stroke={`url(#${e})`}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M52 123h96" stroke={`url(#${e})`} strokeWidth="2.6" strokeLinecap="round" />
      <path
        d="M44 34h112M44 46h78M44 58h96M44 70h60"
        stroke="#fff"
        strokeOpacity=".26"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </g>
  )
}

function Keyboard({ e }: ArtProps) {
  return (
    <g>
      <rect
        x="26"
        y="42"
        width="148"
        height="66"
        rx="9"
        fill="#0d1120"
        stroke={`url(#${e})`}
        strokeWidth="2"
      />
      {[0, 1, 2, 3].map((row) =>
        Array.from({ length: 11 }, (_, col) => (
          <rect
            key={`${row}-${col}`}
            x={34 + col * 12.6}
            y={50 + row * 14}
            width="9.6"
            height="10.5"
            rx="2.4"
            fill="#fff"
            opacity={0.1 + ((row * 11 + col) % 5) * 0.06}
          />
        )),
      )}
      <rect x="72" y="92" width="56" height="10.5" rx="2.4" fill="#7aa2ff" opacity=".22" />
    </g>
  )
}

function Mouse({ s, e }: ArtProps) {
  return (
    <g>
      <ellipse cx="100" cy="136" rx="36" ry="5" fill="#000" opacity=".32" />
      <path
        d="M100 20c27 0 43 23 43 54s-16 56-43 56-43-25-43-56 16-54 43-54Z"
        fill={`url(#${s})`}
        stroke={`url(#${e})`}
        strokeWidth="2"
      />
      <path d="M100 20v46" stroke={`url(#${e})`} strokeWidth="2" />
      <rect x="95.5" y="37" width="9" height="21" rx="4.5" fill="#fff" opacity=".3" />
      <path
        d="M70 78c0 24 13 40 30 46"
        fill="none"
        stroke="#fff"
        strokeOpacity=".2"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </g>
  )
}

function Headset({ s, e }: ArtProps) {
  return (
    <g>
      <path
        d="M44 86V78a56 56 0 0 1 112 0v8"
        fill="none"
        stroke={`url(#${e})`}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <rect
        x="26"
        y="82"
        width="34"
        height="50"
        rx="15"
        fill={`url(#${s})`}
        stroke={`url(#${e})`}
        strokeWidth="2"
      />
      <rect
        x="140"
        y="82"
        width="34"
        height="50"
        rx="15"
        fill={`url(#${s})`}
        stroke={`url(#${e})`}
        strokeWidth="2"
      />
      <path
        d="M157 132c0 8-6 13-15 13"
        fill="none"
        stroke={`url(#${e})`}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="140" cy="145" r="5" fill="#7aa2ff" opacity=".55" />
    </g>
  )
}

function Dock({ s, e }: ArtProps) {
  return (
    <g>
      <rect
        x="34"
        y="56"
        width="132"
        height="52"
        rx="12"
        fill={`url(#${s})`}
        stroke={`url(#${e})`}
        strokeWidth="2"
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={46 + i * 25}
          y="76"
          width="16"
          height="9"
          rx="2.5"
          fill="#fff"
          opacity={0.16 + i * 0.06}
        />
      ))}
      <circle cx="152" cy="68" r="4" fill="#7aa2ff" opacity=".6" />
    </g>
  )
}

function Gpu({ e }: ArtProps) {
  return (
    <g>
      <rect
        x="26"
        y="52"
        width="148"
        height="62"
        rx="8"
        fill="#0d1120"
        stroke={`url(#${e})`}
        strokeWidth="2"
      />
      <circle cx="66" cy="83" r="20" fill="none" stroke={`url(#${e})`} strokeWidth="2" />
      <circle cx="66" cy="83" r="9" fill="none" stroke="#fff" strokeOpacity=".3" strokeWidth="2" />
      <path
        d="M66 63v40M46 83h40M52 69l28 28M80 69l-28 28"
        stroke="#fff"
        strokeOpacity=".16"
        strokeWidth="1.6"
      />
      <rect x="102" y="66" width="58" height="34" rx="4" fill="#fff" opacity=".07" />
      <path d="M102 74h58M102 84h58M102 94h38" stroke="#fff" strokeOpacity=".14" strokeWidth="1.6" />
      <path
        d="M26 62h-9v42h9M174 62h9v42h-9"
        stroke={`url(#${e})`}
        strokeWidth="2"
        fill="none"
      />
    </g>
  )
}

const ART: Record<ArtKind, (p: ArtProps) => React.ReactElement> = {
  laptop: Laptop,
  monitor: Monitor,
  keyboard: Keyboard,
  mouse: Mouse,
  headset: Headset,
  dock: Dock,
  gpu: Gpu,
}

/** Gradient defs scoped to one instance. */
function ArtDefs({ s, e, hue }: { s: string; e: string; hue: number }) {
  return (
    <defs>
      <linearGradient id={s} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={`hsl(${hue} 70% 26%)`} stopOpacity=".95" />
        <stop offset="100%" stopColor="#0a0d18" stopOpacity=".95" />
      </linearGradient>
      <linearGradient id={e} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={`hsl(${hue} 95% 78%)`} />
        <stop offset="50%" stopColor="#ffffff" stopOpacity=".55" />
        <stop offset="100%" stopColor={`hsl(${hue + 50} 92% 66%)`} />
      </linearGradient>
    </defs>
  )
}

function useArtIds(hue: number) {
  const raw = useId().replace(/:/g, '')
  return { s: `s${raw}`, e: `e${raw}${hue}` }
}

/* -------------------------------------------------------------------------- */
/*  DeviceArt — bare illustration on a transparent background.                 */
/* -------------------------------------------------------------------------- */

export const DeviceArt = memo(function DeviceArt({
  kind,
  hue,
  className = '',
}: {
  kind: ArtKind
  hue: number
  className?: string
}) {
  const ids = useArtIds(hue)
  const Device = ART[kind]
  return (
    <svg className={className} viewBox="0 0 200 150" aria-hidden>
      <ArtDefs s={ids.s} e={ids.e} hue={hue} />
      <Device s={ids.s} e={ids.e} />
    </svg>
  )
})

/* -------------------------------------------------------------------------- */
/*  ProductVisual — full product tile: mesh backdrop + device art + sheen.    */
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
  const ids = useArtIds(product.hue)
  const Device = ART[product.art]
  const live = animate && !reduce
  const uid = useId().replace(/:/g, '')
  const { hue } = product

  return (
    <div className={`relative overflow-hidden ${className}`} aria-hidden>
      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 200 150"
        preserveAspectRatio="xMidYMid slice"
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
        <g stroke="#fff" strokeOpacity=".05" strokeWidth=".5">
          {Array.from({ length: 13 }, (_, i) => (
            <line key={`v${i}`} x1={i * 16} y1="0" x2={i * 16} y2="150" />
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 16} x2="200" y2={i * 16} />
          ))}
        </g>
      </svg>

      <motion.svg
        className="absolute inset-0 size-full"
        viewBox="0 0 200 150"
        initial={live ? { opacity: 0, scale: 0.92, y: 8 } : false}
        whileHover={live ? { scale: 1.05, y: -3 } : undefined}
        animate={live ? { opacity: 1, scale: 1, y: 0 } : undefined}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <ArtDefs s={ids.s} e={ids.e} hue={hue} />
        <Device s={ids.s} e={ids.e} />
      </motion.svg>

      {live && (
        <motion.span
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-linear-to-r from-transparent via-transparent to-transparent"
          animate={{ x: ['0%', '420%'] }}
          transition={{ duration: 4.2, repeat: Infinity, repeatDelay: 3.6, ease: 'easeInOut' }}
        />
      )}

      <span className="pointer-events-none absolute inset-0 ring-1 ring-white/8 ring-inset" />
    </div>
  )
})
