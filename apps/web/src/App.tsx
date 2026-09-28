import { Routes, Route } from 'react-router-dom'
import { CartProvider } from './lib/cart-context'
import { AdminAuthProvider } from './lib/admin-auth-context'
import { HomePage } from './pages/HomePage'
import { ShopPage } from './pages/ShopPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { AccountPage } from './pages/AccountPage'
import { AdminLoginPage } from './pages/admin/AdminLoginPage'
import { AdminLayout } from './pages/admin/AdminLayout'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminProductsPage } from './pages/admin/AdminProductsPage'
import { AdminProductEditorPage } from './pages/admin/AdminProductEditorPage'

export default function App() {
  return (
    <AdminAuthProvider>
      <CartProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/product/:slug" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/account" element={<AccountPage />} />

          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="products/new" element={<AdminProductEditorPage />} />
          </Route>
        </Routes>
      </CartProvider>
    </AdminAuthProvider>
  )
}
