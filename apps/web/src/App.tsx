import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { AdminAuthProvider } from './lib/admin-auth-context';
import { AccountProvider } from './lib/account-context';
import { CatalogProvider } from './lib/catalog';
import { CartProvider } from './lib/cart-context';
import { ToastProvider } from './lib/motion/toast';
import {
  PageTransition,
  ScrollProgress,
  ScrollRestoration,
} from './lib/motion/page-transition';
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { CartPage } from './pages/CartPage';

// Everything below the fold of a first visit is loaded on demand, which keeps
// the landing chunk small for the majority of visitors.
const DealsPage = lazy(() =>
  import('./pages/DealsPage').then((m) => ({ default: m.DealsPage })),
);
const ComparePage = lazy(() =>
  import('./pages/ComparePage').then((m) => ({ default: m.ComparePage })),
);
const SupportPage = lazy(() =>
  import('./pages/SupportPage').then((m) => ({ default: m.SupportPage })),
);
const ProductDetailPage = lazy(() =>
  import('./pages/ProductDetailPage').then((m) => ({
    default: m.ProductDetailPage,
  })),
);
const CheckoutPage = lazy(() =>
  import('./pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })),
);
const AccountPage = lazy(() =>
  import('./pages/AccountPage').then((m) => ({ default: m.AccountPage })),
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);

const AdminLoginPage = lazy(() =>
  import('./pages/admin/AdminLoginPage').then((m) => ({
    default: m.AdminLoginPage,
  })),
);
const AdminLayout = lazy(() =>
  import('./pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })),
);
const AdminDashboardPage = lazy(() =>
  import('./pages/admin/AdminDashboardPage').then((m) => ({
    default: m.AdminDashboardPage,
  })),
);
const AdminProductsPage = lazy(() =>
  import('./pages/admin/AdminProductsPage').then((m) => ({
    default: m.AdminProductsPage,
  })),
);
const AdminCategoriesPage = lazy(() =>
  import('./pages/admin/AdminCategoriesPage').then((m) => ({
    default: m.AdminCategoriesPage,
  })),
);
const AdminProductEditorPage = lazy(() =>
  import('./pages/admin/AdminProductEditorPage').then((m) => ({
    default: m.AdminProductEditorPage,
  })),
);

function RouteFallback() {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <span className="size-8 animate-spin rounded-full border-2 border-line border-t-brand-400" />
      <span className="sr-only">Loading page</span>
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <AdminAuthProvider>
          <AccountProvider>
            <CatalogProvider>
              <CartProvider>
                <ScrollProgress />
                <ScrollRestoration />
                <PageTransition>
                  <Suspense fallback={<RouteFallback />}>
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/shop" element={<ShopPage />} />
                      <Route path="/deals" element={<DealsPage />} />
                      <Route path="/compare" element={<ComparePage />} />
                      <Route path="/support" element={<SupportPage />} />
                      <Route
                        path="/product/:slug"
                        element={<ProductDetailPage />}
                      />
                      <Route path="/cart" element={<CartPage />} />
                      <Route path="/checkout" element={<CheckoutPage />} />
                      <Route path="/account" element={<AccountPage />} />

                      <Route path="/admin/login" element={<AdminLoginPage />} />
                      <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<AdminDashboardPage />} />
                        <Route
                          path="products"
                          element={<AdminProductsPage />}
                        />
                        <Route
                          path="products/new"
                          element={<AdminProductEditorPage />}
                        />
                        <Route
                          path="products/:id"
                          element={<AdminProductEditorPage />}
                        />
                        <Route
                          path="categories"
                          element={<AdminCategoriesPage />}
                        />
                      </Route>

                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </Suspense>
                </PageTransition>
              </CartProvider>
            </CatalogProvider>
          </AccountProvider>
        </AdminAuthProvider>
      </ToastProvider>
    </MotionConfig>
  );
}
