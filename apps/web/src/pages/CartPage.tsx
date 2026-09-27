import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SiteLayout } from '../components/SiteLayout'
import { TrustBar } from '../components/TrustBar'
import { useCart } from '../lib/cart-context'

const SHIPPING_THRESHOLD = 150
const TAX_RATE = 0.08

export function CartPage() {
  const { cartProducts, setQuantity, removeItem, subtotal } = useCart()
  const [promo, setPromo] = useState('')

  const shipping = subtotal > SHIPPING_THRESHOLD || subtotal === 0 ? 0 : 14.99
  const tax = subtotal * TAX_RATE
  const grandTotal = subtotal + shipping + tax

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Your Workspace Basket</h1>

        {cartProducts.length === 0 ? (
          <div className="mt-10 rounded-xl border border-slate-100 p-10 text-center">
            <p className="text-sm text-slate-500">Your basket is empty.</p>
            <Link
              to="/shop"
              className="mt-4 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              {cartProducts.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="flex gap-4 rounded-xl border border-slate-100 p-3"
                >
                  <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-slate-900">
                    <img
                      src={product.images[0]?.url}
                      alt={product.images[0]?.alt ?? product.name}
                      className="size-full object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        to={`/product/${product.slug}`}
                        className="text-sm font-semibold text-slate-900 hover:text-brand-600"
                      >
                        {product.name}
                      </Link>
                      <span className="text-sm font-bold text-slate-900">
                        ${(product.price * quantity).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center rounded-lg border border-slate-200">
                        <button
                          onClick={() => setQuantity(product.id, quantity - 1)}
                          className="px-2.5 py-1 text-slate-500 hover:text-slate-900"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="w-7 text-center text-sm font-semibold">{quantity}</span>
                        <button
                          onClick={() => setQuantity(product.id, quantity + 1)}
                          className="px-2.5 py-1 text-slate-500 hover:text-slate-900"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <div className="flex gap-3 text-xs">
                        <button className="text-slate-400 hover:text-slate-600">Save for later</button>
                        <button
                          onClick={() => removeItem(product.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-2 pt-2">
                <input
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                  placeholder="Have a Promotional Coupon? Tap directly to your retail account manager"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 placeholder:text-slate-400"
                />
                <button className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                  Apply
                </button>
              </div>
            </div>

            <aside className="h-fit rounded-xl border border-slate-100 p-5">
              <h2 className="text-sm font-bold text-slate-900">Order Pricing Summary</h2>
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between text-slate-500">
                  <dt>Subtotal ({cartProducts.length} items)</dt>
                  <dd className="text-slate-900">${subtotal.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between text-slate-500">
                  <dt>Est. Fast Shipping</dt>
                  <dd className={shipping === 0 ? 'font-semibold text-emerald-600' : 'text-slate-900'}>
                    {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
                  </dd>
                </div>
                <div className="flex justify-between text-slate-500">
                  <dt>Estimated Sales Tax (8%)</dt>
                  <dd className="text-slate-900">${tax.toFixed(2)}</dd>
                </div>
              </dl>
              <div className="mt-4 flex justify-between border-t border-slate-100 pt-4 text-base font-bold text-slate-900">
                <span>Grand Total</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
              <Link
                to="/checkout"
                className="mt-4 block rounded-lg bg-brand-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-700"
              >
                Proceed to Checkout
              </Link>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" />
                </svg>
                Safe, Secure Checkout. Direct Warranties Verified.
              </p>
            </aside>
          </div>
        )}
      </div>

      <TrustBar />
    </SiteLayout>
  )
}
