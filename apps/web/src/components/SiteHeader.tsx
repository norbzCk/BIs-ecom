import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from 'motion/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../lib/cart-context'
import { useCatalog } from '../lib/catalog'
import { money, moneyExact } from '../lib/money'
import { SHIPPING_THRESHOLD } from '../lib/cart-context'
import { ProductThumb } from './ProductVisual'
import { Drawer } from './ui'
import { Icon } from './icons'
import { ThemeToggle } from './ThemeToggle'

const NAV = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'Deals', to: '/deals' },
  { label: 'Compare', to: '/compare' },
  { label: 'Support', to: '/support' },
]

export function SiteHeader() {
  const { itemCount, cartProducts, subtotal } = useCart()
  const { categories, brands } = useCatalog()
  const navigate = useNavigate()
  const location = useLocation()

  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [suggestOpen, setSuggestOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const { scrollY } = useScroll()
  const blur = useSpring(scrollY, { stiffness: 120, damping: 26, restDelta: 0.5 })

  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 12))

  // Close everything on navigation.
  useEffect(() => {
    setMenuOpen(false)
    setCartOpen(false)
    setSuggestOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSuggestOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const submitSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) {
      navigate('/shop')
      return
    }
    navigate(`/shop?q=${encodeURIComponent(q)}`)
    setSuggestOpen(false)
    setQuery('')
  }

  const goToSuggestion = (term: string) => {
    setQuery('')
    setSuggestOpen(false)
    navigate(`/shop?q=${encodeURIComponent(term)}`)
  }

  // Search terms come from the live catalog, so they never point at a product
  // that has been discontinued or renamed.
  const suggestions = [...categories.map((c) => c.name), ...brands].slice(0, 6)

  return (
    <>
      <motion.header
        style={{ backdropFilter: `blur(${Math.min(18, 6 + blur.get() / 40)}px)` }}
        className="sticky top-0 z-50 transition-colors duration-500"
      >
        <div
          className={`absolute inset-0 -z-10 border-b transition-all duration-500 ${
            scrolled
              ? 'border-line-faint bg-canvas/85 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.9)]'
              : 'border-transparent bg-canvas/40'
          }`}
        />

        {/* Announcement rail */}
        <AnimatePresence>
          {scrolled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden border-b border-line-faint bg-linear-to-r from-brand-600/20 via-navy-850 to-accent-500/15"
            >
              <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5 text-[11px] font-medium text-body">
                <Icon.Bolt className="size-3 text-amber-400" />
                Free insured delivery on every order over {money(SHIPPING_THRESHOLD)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className={`flex items-center gap-3 transition-all duration-500 ${
              scrolled ? 'h-14' : 'h-16 sm:h-20'
            }`}
          >
            {/* Logo */}
            <Link to="/" className="group flex shrink-0 items-center gap-2.5" aria-label="Billionare home">
              <span className="relative flex size-9 items-center justify-center overflow-hidden rounded-xl border border-line-faint bg-linear-to-br from-brand-500 to-accent-500 transition-transform duration-500 group-hover:rotate-[18deg]">
                <span className="absolute inset-0 animate-spin-slow bg-conic from-transparent via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <img
                  src="/logo.png"
                  alt=""
                  width={24}
                  height={24}
                  className="relative size-6 rounded-[6px] object-contain"
                />
              </span>
              <span className="hidden font-display text-lg font-extrabold tracking-tight text-ink sm:block">
                Billionare
              </span>
            </Link>

            {/* Search */}
            <div ref={searchRef} className="relative hidden flex-1 md:block">
              <form onSubmit={submitSearch}>
                <div className="group relative flex items-center overflow-hidden rounded-xl border border-line bg-canvas-raised/70 transition-colors focus-within:border-brand-400/70 focus-within:bg-canvas-raised">
                  <Icon.Search className="pointer-events-none absolute left-3 size-4 text-ink-subtle transition-colors group-focus-within:text-brand-oncanvas" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setSuggestOpen(true)
                    }}
                    onFocus={() => setSuggestOpen(true)}
                    placeholder="Search laptops, monitors, keyboards…"
                    aria-label="Search products"
                    className="w-full bg-transparent py-2.5 pr-24 pl-9 text-sm text-ink outline-none placeholder:text-ink-subtle"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 my-0.5 rounded-lg bg-surface-inset px-3 py-1.5 text-xs font-semibold text-body transition hover:bg-brand-600 hover:text-ink"
                  >
                    Search
                  </button>
                </div>
              </form>

              <AnimatePresence>
                {suggestOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="panel absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden p-1.5"
                  >
                    <p className="px-3 py-1.5 text-[10px] font-semibold tracking-[0.16em] text-ink-subtle uppercase">
                      Popular searches
                    </p>
                    {suggestions.map((term) => (
                      <button
                        key={term}
                        onClick={() => goToSuggestion(term)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-body transition hover:bg-surface-inset hover:text-ink"
                      >
                        <Icon.Search className="size-3.5 text-ink-subtle" />
                        {term}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
              <Link
                to="/account"
                className="btn-ghost btn-sm hidden lg:inline-flex"
                aria-label="Your account"
              >
                <Icon.User className="size-4" />
                <span className="hidden xl:inline">Account</span>
              </Link>

              <button
                onClick={() => setCartOpen(true)}
                className="btn-ghost btn-sm relative"
                aria-label={`Cart, ${itemCount} items`}
              >
                <span className="relative">
                  <Icon.Cart className="size-4" />
                  <AnimatePresence>
                    {itemCount > 0 && (
                      <motion.span
                        key={itemCount}
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.4, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 520, damping: 20 }}
                        className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-linear-to-br from-brand-500 to-accent-500 px-1 text-[10px] font-bold text-ink-onbrand tabular-nums ring-2 ring-canvas"
                      >
                        {itemCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <span className="hidden sm:inline">Cart</span>
              </button>

              <ThemeToggle className="size-9" />

              <button
                onClick={() => setMenuOpen(true)}
                className="btn-ghost btn-sm sm:hidden"
                aria-label="Open menu"
              >
                <Icon.Menu className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop nav */}
        <nav
          className={`hidden border-t border-line-faint transition-all duration-500 sm:block ${
            scrolled ? 'opacity-100' : 'opacity-90'
          }`}
        >
          <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 sm:px-6 lg:px-8">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `relative px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive ? 'text-ink' : 'text-ink-muted hover:text-ink'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-linear-to-r from-brand-400 to-accent-400"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}

            <span className="ml-auto hidden items-center gap-1.5 text-xs text-ink-subtle lg:flex">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
              </span>
              4,812 orders shipped this week
            </span>
          </div>
        </nav>
      </motion.header>

      {/* Mobile menu */}
      <Drawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Menu"
        footer={
          <Link to="/shop" className="btn-primary w-full">
            <Icon.Grid className="size-4" />
            Browse the shop
          </Link>
        }
      >
        <nav className="space-y-1">
          {NAV.map((item, i) => (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.06 + i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-xl px-4 py-3 text-base font-semibold transition ${
                    isActive
                      ? 'bg-brand-500/15 text-ink ring-1 ring-brand-400/40'
                      : 'text-body hover:bg-surface-inset'
                  }`
                }
              >
                {item.label}
                <Icon.ChevronRight className="size-4 text-ink-subtle" />
              </NavLink>
            </motion.div>
          ))}
        </nav>

        <form
          onSubmit={submitSearch}
          className="mt-5 md:hidden"
        >
          <div className="relative">
            <Icon.Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              aria-label="Search products"
              className="input pl-9"
            />
          </div>
        </form>

        <div className="mt-5 space-y-1 border-t border-line-faint pt-4">
          {[
            { to: '/account', label: 'Your account', icon: Icon.User },
            { to: '/cart', label: 'Shopping cart', icon: Icon.Cart },
            { to: '/support', label: 'Help & support', icon: Icon.Info },
          ].map(({ to, label, icon: I }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-body transition hover:bg-surface-inset hover:text-ink"
            >
              <I className="size-4" />
              {label}
            </Link>
          ))}
        </div>
      </Drawer>

      {/* Mini cart */}
      <Drawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        title={`Your cart (${itemCount})`}
        footer={
          cartProducts.length === 0 ? undefined : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-muted">Subtotal</span>
                <span className="font-display text-lg font-extrabold text-ink">
                  {moneyExact(subtotal)}
                </span>
              </div>
              <Link
                to="/checkout"
                onClick={() => setCartOpen(false)}
                className="btn-primary sheen w-full"
              >
                Checkout
                <Icon.ArrowRight className="size-4" />
              </Link>
              <Link
                to="/cart"
                onClick={() => setCartOpen(false)}
                className="btn-quiet w-full text-xs"
              >
                View full cart
              </Link>
            </div>
          )
        }
      >
        {cartProducts.length === 0 ? (
          <div className="py-10 text-center">
            <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-line bg-surface-inset text-ink-subtle">
              <Icon.Cart className="size-6" />
            </span>
            <p className="text-sm text-ink-muted">Nothing in here yet.</p>
            <Link
              to="/shop"
              onClick={() => setCartOpen(false)}
              className="btn-ghost btn-sm mt-4"
            >
              Find something good
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {cartProducts.map(({ product, quantity }) => (
                <motion.li
                  key={product.id}
                  layout
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="flex gap-3 rounded-xl border border-line-faint bg-surface-inset p-2.5"
                >
                  <Link
                    to={`/product/${product.slug}`}
                    onClick={() => setCartOpen(false)}
                    className="size-14 shrink-0 overflow-hidden rounded-lg bg-ink"
                  >
                    <ProductThumb product={product} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/product/${product.slug}`}
                      onClick={() => setCartOpen(false)}
                      className="line-clamp-2 text-sm font-semibold text-ink transition hover:text-brand-oncanvas"
                    >
                      {product.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-subtle">Qty {quantity}</p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-ink">
                    {moneyExact(product.price * quantity)}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Drawer>

      {/* Nudge that appears once there is something worth checking out */}
      <CartNudge
        visible={itemCount > 0 && scrolled}
        count={itemCount}
        subtotal={subtotal}
        onOpen={() => setCartOpen(true)}
        onViewCart={() => {
          setCartOpen(false)
          navigate('/cart')
        }}
      />
    </>
  )
}

/* -------------------------------------------------------------------------- */

function CartNudge({
  visible,
  count,
  subtotal,
  onOpen,
  onViewCart,
}: {
  visible: boolean
  count: number
  subtotal: number
  onOpen: () => void
  onViewCart: () => void
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          className="panel fixed bottom-5 left-5 z-40 hidden items-center gap-3 px-4 py-3 md:flex"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-500/20 text-brand-oncanvas">
            <Icon.Cart className="size-4" />
          </span>
          <button onClick={onOpen} className="text-left">
            <span className="block text-xs text-ink-muted">
              {count} {count === 1 ? 'item' : 'items'} reserved
            </span>
            <span className="block font-display text-base font-extrabold text-ink">
              {moneyExact(subtotal)}
            </span>
          </button>
          <button onClick={onViewCart} className="btn-primary btn-sm ml-1">
            View cart
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
