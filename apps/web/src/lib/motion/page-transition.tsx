import { motion, useReducedMotion, useScroll, useSpring } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

/* -------------------------------------------------------------------------- */
/*  PageTransition — cross-fades + lifts the page on every route change.        */
/* -------------------------------------------------------------------------- */

export function PageTransition({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion()
  const { pathname } = useLocation()

  if (reduce) return <>{children}</>

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

/* -------------------------------------------------------------------------- */
/*  ScrollProgress — hairline bar pinned to the very top of the viewport.      */
/* -------------------------------------------------------------------------- */

export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 26,
    restDelta: 0.001,
  })

  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left"
      style={{
        scaleX,
        background:
          'linear-gradient(90deg, #5b76ff, #38d6ee 50%, #7c3aed)',
        boxShadow: '0 0 12px rgb(91 118 255 / 0.8)',
      }}
    />
  )
}

/* -------------------------------------------------------------------------- */
/*  ScrollRestoration — returns to the top on navigation, honours anchors.    */
/* -------------------------------------------------------------------------- */

export function ScrollRestoration() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash])

  return null
}
