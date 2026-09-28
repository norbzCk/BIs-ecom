import { Link } from 'react-router-dom'
import { useAdminAuth } from '../../lib/admin-auth-context'

export function AdminDashboardPage() {
  const { user } = useAdminAuth()

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Operations Overview</h1>
      <p className="mt-1 text-sm text-slate-500">
        Welcome back, {user?.firstName}. Product catalog management is ready to use.
      </p>

      <Link
        to="/admin/products"
        className="mt-6 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Go to Product Catalog →
      </Link>

      <p className="mt-4 text-xs text-slate-400">
        Order management, support, and full dashboard metrics aren't built yet — this pass
        focuses on product catalog CRUD.
      </p>
    </div>
  )
}
