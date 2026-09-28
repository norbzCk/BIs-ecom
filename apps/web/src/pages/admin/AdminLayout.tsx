import { Link, NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAdminAuth } from '../../lib/admin-auth-context'

const navItems = [
  { label: 'Dashboard', to: '/admin' },
  { label: 'Products', to: '/admin/products' },
]

export function AdminLayout() {
  const { token, user, logout } = useAdminAuth()

  if (!token || !user) {
    return <Navigate to="/admin/login" replace />
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-56 shrink-0 flex-col bg-navy-900 text-white">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="flex size-7 items-center justify-center rounded-md bg-brand-600 text-sm font-extrabold">
            B
          </span>
          <div>
            <p className="text-sm font-extrabold leading-none">Billionare</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-400">
              Admin
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-white/5'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <p className="text-sm font-semibold">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-slate-400">Connected as Admin</p>
          <button
            onClick={logout}
            className="mt-3 w-full rounded-lg border border-white/20 py-1.5 text-xs font-semibold text-white hover:bg-white/5"
          >
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <Link to="/" className="text-xs font-medium text-slate-400 hover:text-slate-600">
            ← Back to storefront
          </Link>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
