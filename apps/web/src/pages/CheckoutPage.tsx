import { useState } from 'react'
import { useCart } from '../lib/cart-context'
import { SiteLayout } from '../components/SiteLayout'
import { TrustBar } from '../components/TrustBar'

type DeliverySpeed = 'express' | 'standard'

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-100 p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <span className="flex size-6 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          {icon}
        </span>
        {title}
      </h2>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-xs font-medium text-slate-500">
      {label}
      <input
        {...props}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-500"
      />
    </label>
  )
}

export function CheckoutPage() {
  const { cartProducts, subtotal } = useCart()
  const [speed, setSpeed] = useState<DeliverySpeed>('express')
  const [placed, setPlaced] = useState(false)

  const shipping = 0
  const tax = subtotal * 0.08
  const grandTotal = subtotal + shipping + tax

  if (placed) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mt-5 text-xl font-bold text-slate-900">Your Order is Confirmed!</h1>
          <p className="mt-2 text-sm text-slate-500">
            Thank you for purchasing from Billionare. Your system config is now in queue for
            express direct packaging.
          </p>
        </div>
        <TrustBar />
      </SiteLayout>
    )
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
          <span className="flex items-center gap-1.5 text-brand-600">
            <span className="flex size-5 items-center justify-center rounded-full bg-brand-600 text-[10px] text-white">
              1
            </span>
            Review Cart
          </span>
          <span className="h-px flex-1 bg-slate-200" />
          <span className="flex items-center gap-1.5">
            <span className="flex size-5 items-center justify-center rounded-full bg-slate-200 text-[10px] text-slate-500">
              2
            </span>
            Secure Checkout
          </span>
          <span className="h-px flex-1 bg-slate-200" />
          <span>Order Placed</span>
        </div>

        <form
          className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]"
          onSubmit={(e) => {
            e.preventDefault()
            setPlaced(true)
          }}
        >
          <div className="space-y-5">
            <Section
              title="Contact Information"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v16H4zM4 6l8 6 8-6" />
                </svg>
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Email Address" type="email" required placeholder="you@company.com" />
                <Field label="Mobile Phone (for tracking updates)" type="tel" placeholder="+1 (555) 000-0000" />
              </div>
            </Section>

            <Section
              title="Shipping & Billing Address"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-6.5 7-11.5A7 7 0 105 9.5C5 14.5 12 21 12 21z" />
                  <circle cx="12" cy="9.5" r="2.2" />
                </svg>
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="First Name" required />
                <Field label="Last Name" required />
              </div>
              <Field label="Street Address" required />
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="City" required />
                <Field label="State / Region" required />
                <Field label="Zip Code" required />
              </div>
            </Section>

            <Section
              title="Select Delivery Speed"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" />
                </svg>
              }
            >
              {(
                [
                  {
                    id: 'express' as const,
                    title: 'Premium Express Courier (Next Business Day)',
                    body: 'Insured with signature required verification',
                  },
                  {
                    id: 'standard' as const,
                    title: 'Standard Insured Ground Freight (2-4 Days)',
                    body: 'Carefully tracked in unison with external logistics',
                  },
                ] satisfies { id: DeliverySpeed; title: string; body: string }[]
              ).map((option) => (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-start justify-between gap-3 rounded-lg border p-3 text-sm ${
                    speed === option.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="speed"
                      checked={speed === option.id}
                      onChange={() => setSpeed(option.id)}
                      className="mt-0.5 accent-brand-600"
                    />
                    <div>
                      <p className="font-semibold text-slate-900">{option.title}</p>
                      <p className="text-xs text-slate-500">{option.body}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-emerald-600">FREE</span>
                </label>
              ))}
            </Section>

            <Section
              title="Secure Payment Details"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-3.5">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path strokeLinecap="round" d="M3 10h18" />
                </svg>
              }
            >
              <Field label="Credit Card Number" required placeholder="•••• •••• •••• 4812" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Expiration Date" required placeholder="08 / 29" />
                <Field label="CVC (Secure Code)" required placeholder="•••" />
              </div>
            </Section>

            <Section
              title="Order Notes or Delivery Instructions"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
                </svg>
              }
            >
              <textarea
                placeholder="e.g. Gate code #4832, please drop off at front door reception..."
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-500"
              />
            </Section>
          </div>

          <aside className="h-fit space-y-5">
            <div className="rounded-xl border border-slate-100 p-5">
              <h2 className="text-sm font-bold text-slate-900">Compact Item Summary</h2>
              <div className="mt-4 space-y-3">
                {cartProducts.map(({ product, quantity }) => (
                  <div key={product.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-slate-800">{product.name}</p>
                      <p className="text-xs text-slate-400">Qty: {quantity}</p>
                    </div>
                    <span className="font-semibold text-slate-900">
                      ${(product.price * quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
                <div className="flex justify-between text-slate-500">
                  <dt>Subtotal</dt>
                  <dd className="text-slate-900">${subtotal.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between text-slate-500">
                  <dt>Insured Express Shipping</dt>
                  <dd className="font-semibold text-emerald-600">FREE</dd>
                </div>
                <div className="flex justify-between text-slate-500">
                  <dt>Estimated Sales Tax (8%)</dt>
                  <dd className="text-slate-900">${tax.toFixed(2)}</dd>
                </div>
              </dl>
              <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-base font-bold text-slate-900">
                <span>Grand Total</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
              <button
                type="submit"
                disabled={cartProducts.length === 0}
                className="mt-4 w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Complete Secure Payment
              </button>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" />
                </svg>
                256-bit SSL Encrypted. Real Warranties Applied.
              </p>
            </div>
          </aside>
        </form>
      </div>

      <TrustBar />
    </SiteLayout>
  )
}
