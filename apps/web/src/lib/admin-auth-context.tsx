import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { apiRequest, ApiError } from './api-client'

const STORAGE_KEY = 'billionare_admin_auth'

export interface AdminUser {
  id: string
  firstName: string
  lastName: string
  email: string
  role: 'CUSTOMER' | 'ADMIN'
}

interface StoredAuth {
  accessToken: string
  user: AdminUser
}

interface AdminAuthContextValue {
  token: string | null
  user: AdminUser | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as StoredAuth) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (auth) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [auth])

  const login = async (email: string, password: string) => {
    const result = await apiRequest<StoredAuth>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })

    if (result.user.role !== 'ADMIN') {
      throw new ApiError('This account does not have admin access', 403)
    }

    setAuth(result)
  }

  const logout = () => setAuth(null)

  return (
    <AdminAuthContext.Provider
      value={{ token: auth?.accessToken ?? null, user: auth?.user ?? null, login, logout }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  return ctx
}
