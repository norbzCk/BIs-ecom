import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminAuth } from '../../lib/admin-auth-context'
import { apiRequest, ApiError } from '../../lib/api-client'
import { money } from '../../lib/money'

interface AdminProductSummary {
  id: string
  sku: string
  name: string
  category: string
  price: number
  status: 'ACTIVE' | 'OUT_OF_STOCK' | 'DISCONTINUED'
  stockQuantity: number
  updatedAt: string
}

interface AdminProductsResponse {
  items: AdminProductSummary[]
  total: number
}

const STATUS_STYLES: Record<AdminProductSummary['status'], string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  OUT_OF_STOCK: 'bg-amber-100 text-amber-700',
  DISCONTINUED: 'bg-surface-inset text-ink-muted',
}

export function AdminProductsPage() {
  const { token } = useAdminAuth()
  const [data, setData] = useState<AdminProductsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  // Bumping this re-runs the fetch effect (e.g. after discontinuing a product).
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    // Guards against setting state after unmount / after a newer request started.
    let cancelled = false

    apiRequest<AdminProductsResponse>('/admin/products', { token })
      .then((res) => {
        if (cancelled) return
        setData(res)
        setError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Failed to load products')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, reloadKey])

  const handleArchive = async (id: string) => {
    if (!confirm('Discontinue this product? It will be hidden from the storefront.')) return
    setBusyId(id)
    try {
      await apiRequest(`/admin/products/${id}`, { method: 'DELETE', token })
      setReloadKey((key) => key + 1)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to update product')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Product Catalog Workspace</h1>
          <p className="mt-1 text-sm text-ink-subtle">
            Create, edit, and manage system catalog components.
          </p>
        </div>
        <Link
          to="/admin/products/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + Add New Product
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-500/12 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      <div className="mt-5 overflow-hidden rounded-xl border border-line-faint bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line-faint bg-canvas text-xs uppercase text-ink-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Product</th>
              <th className="px-4 py-3 font-semibold">SKU</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Stock</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line-faint">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-subtle">
                  Loading products…
                </td>
              </tr>
            )}
            {!loading && data?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-subtle">
                  No products yet. Add your first one.
                </td>
              </tr>
            )}
            {data?.items.map((product) => (
              <tr key={product.id}>
                <td className="px-4 py-3 font-medium text-ink">{product.name}</td>
                <td className="px-4 py-3 text-ink-subtle">{product.sku}</td>
                <td className="px-4 py-3 text-ink-subtle">{product.category}</td>
                <td className="px-4 py-3 text-ink">{money(product.price)}</td>
                <td className="px-4 py-3 text-ink-subtle">{product.stockQuantity} units</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[product.status]}`}
                  >
                    {product.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {product.status !== 'DISCONTINUED' && (
                    <button
                      onClick={() => handleArchive(product.id)}
                      disabled={busyId === product.id}
                      className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-50"
                    >
                      Discontinue
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && (
        <p className="mt-3 text-xs text-ink-subtle">Showing 1–{data.items.length} of {data.total} items</p>
      )}
    </div>
  )
}
