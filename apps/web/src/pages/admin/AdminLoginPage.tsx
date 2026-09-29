import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../lib/admin-auth-context'
import { ApiError } from '../../lib/api-client'

export function AdminLoginPage() {
  const { token, login } = useAdminAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (token) return <Navigate to="/admin/products" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate('/admin/products')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas-raised px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-xl"
      >
        <div className="flex items-center gap-2">
          <span className="flex size-10 items-center justify-center overflow-hidden rounded-xl">
            <img src="/logo.png" alt="" width={28} height={28} className="size-7 rounded-lg object-contain" />
          </span>
          <span className="text-base font-extrabold text-ink">Billionare Admin</span>
        </div>

        <p className="mt-4 text-sm text-ink-subtle">
          Sign in with an admin account to manage the product catalog.
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-500/12 px-3 py-2 text-sm text-red-400">{error}</p>
        )}

        <label className="mt-5 block text-xs font-medium text-ink-subtle">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line-faint bg-canvas-raised px-3 py-2 text-sm outline-none focus:border-brand-500"
            placeholder="admin@billionare.com"
          />
        </label>

        <label className="mt-4 block text-xs font-medium text-ink-subtle">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line-faint bg-canvas-raised px-3 py-2 text-sm outline-none focus:border-brand-500"
            placeholder="••••••••"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-ink-onbrand hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
