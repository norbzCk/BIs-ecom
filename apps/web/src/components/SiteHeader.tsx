import { NavLink, Link } from 'react-router-dom'
import { useCart } from '../lib/cart-context'

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'Deals', to: '/deals' },
  { label: 'Comparison', to: '/compare' },
  { label: 'Cart', to: '/cart' },
]

export function SiteHeader() {
  const { itemCount } = useCart()

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white">
      <div className="flex items-center justify-between gap-6 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-brand-600 text-sm font-extrabold text-white">
            B
          </span>
          <span className="text-base font-extrabold tracking-tight text-slate-900">
            Billionare
          </span>
        </Link>

        <form
          className="hidden flex-1 max-w-xl items-center gap-2 md:flex"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="flex w-full items-center overflow-hidden rounded-lg border border-slate-200">
            <input
              type="search"
              placeholder="Search for laptops, monitors, accessories..."
              className="w-full px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Search
            </button>
          </div>
        </form>

        <div className="flex items-center gap-5 text-sm text-slate-600">
          <Link to="/account" className="hidden items-center gap-1.5 sm:flex hover:text-slate-900">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-4.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 0116 0" />
            </svg>
            Account
          </Link>
          <Link to="/cart" className="flex items-center gap-1.5 hover:text-slate-900">
            <span className="relative">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-4.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h2l2.4 12.2a2 2 0 002 1.8h7.6a2 2 0 002-1.7L20 8H6" />
                <circle cx="9" cy="20" r="1" />
                <circle cx="17" cy="20" r="1" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -right-2 -top-2 flex size-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                  {itemCount}
                </span>
              )}
            </span>
            Cart
          </Link>
        </div>
      </div>

      <nav className="flex items-center gap-6 border-t border-slate-100 px-4 py-2 text-sm font-medium text-slate-500 sm:px-6">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              isActive ? 'text-brand-600' : 'hover:text-slate-900'
            }
          >
            {item.label}
          </NavLink>
        ))}
        <span className="ml-auto hidden items-center gap-1.5 text-xs text-slate-400 sm:flex">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-3.5">
            <rect x="3" y="7" width="18" height="13" rx="2" />
            <path strokeLinecap="round" d="M8 7V5a4 4 0 018 0v2" />
          </svg>
          Free premium shipping on orders over $150
        </span>
      </nav>
    </header>
  )
}
