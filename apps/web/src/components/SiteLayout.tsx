import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { SiteHeader } from './SiteHeader'
import { SiteFooter } from './SiteFooter'
import { Icon } from './icons'

export function SiteLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 900)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="noise relative flex min-h-screen flex-col">
      <a href="#main" className="sr-only-focusable">
        Skip to content
      </a>

      <SiteHeader />

      <main id="main" className="flex-1">
        {children}
      </main>

      <SiteFooter />

      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        className={`fixed right-5 bottom-5 z-40 flex size-11 items-center justify-center rounded-full border border-line-faint bg-surface/90 text-body shadow-lg backdrop-blur-xl transition-all duration-500 hover:border-brand-400/60 hover:text-ink ${
          showTop
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        <Icon.ChevronLeft className="size-4 rotate-90" />
      </button>

      <span className="sr-only" aria-live="polite">
        {pathname}
      </span>
    </div>
  )
}
