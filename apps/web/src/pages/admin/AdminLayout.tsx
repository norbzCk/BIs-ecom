import { Link, NavLink, Navigate, Outlet } from 'react-router-dom'
import { Icon } from '../../components/icons'
import { ThemeToggle } from '../../components/ThemeToggle'
import { useAdminAuth } from '../../lib/admin-auth-context'

const navItems = [
  { label: 'Dashboard', to: '/admin', icon: 'Grid' },
  { label: 'Products', to: '/admin/products', icon: 'Package' },
  { label: 'Categories', to: '/admin/categories', icon: 'Tag' },
] as const

export function AdminLayout() {
  const { token, user, logout } = useAdminAuth()

  if (!token || !user) {
    return <Navigate to="/admin/login" replace />
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="flex w-56 shrink-0 flex-col bg-canvas-raised text-ink">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl">
            <img src="/logo.png" alt="" width={28} height={28} className="size-7 rounded-lg object-contain" />
          </span>
          <div>
            <p className="text-sm font-extrabold leading-none">Billionare</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-400">
              Admin
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const IconNav = Icon[item.icon]
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin'}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-600 text-ink-onbrand'
                      : 'text-body hover:bg-surface-inset hover:text-ink'
                  }`
                }
              >
                <IconNav className="size-4" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="border-t border-line p-4">
          <p className="text-sm font-semibold">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-ink-muted">Connected as Admin</p>
          <button
            onClick={logout}
            className="mt-3 w-full rounded-lg border border-line-strong py-1.5 text-xs font-semibold text-ink hover:bg-surface-inset"
          >
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-line-faint bg-surface px-6 py-3">
          <Link to="/" className="text-xs font-medium text-ink-muted hover:text-ink">
            ← Back to storefront
          </Link>
          <ThemeToggle className="size-9" />
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
