import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SiteLayout } from '../components/SiteLayout'
import { TrustBar } from '../components/TrustBar'
import { Icon } from '../components/icons'
import { Breadcrumbs, EmptyState, PriceTag, ProgressMeter, QuantityStepper } from '../components/ui'
import { ProductCard } from '../components/ProductCard'
import { ProductThumb } from '../components/ProductVisual'
import { FLAT_SHIPPING, SHIPPING_THRESHOLD, TAX_RATE, useCart } from '../lib/cart-context'
import { Magnetic } from '../lib/motion/interactive'
import { useToast } from '../lib/motion/toast'
import { useCatalog } from '../lib/catalog'
import { money, moneyExact } from '../lib/money'

export function CartPage() {
  const {
    cartProducts,
    savedProducts,
    subtotal,
    shipping,
    tax,
    total,
    itemCount,
    syncing,
    setQuantity,
    removeItem,
    moveToSaved,
    moveToCart,
    removeSaved,
  } = useCart()

  const { push } = useToast()

  const toFreeShipping = Math.max(0, SHIPPING_THRESHOLD - subtotal)
  const progress = Math.min(1, subtotal / SHIPPING_THRESHOLD)

  const { featuredProducts } = useCatalog()
  const suggestions = featuredProducts()
    .filter((p) => !cartProducts.some((c) => c.product.id === p.id))
    .slice(0, 4)

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Cart' }]} />

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">Your cart</h1>
            <p className="mt-2 text-sm text-ink-muted">
              {itemCount === 0
                ? 'Nothing here yet.'
                : `${itemCount} ${itemCount === 1 ? 'item' : 'items'} reserved for the next 30 minutes.`}
            </p>
          </div>

          {cartProducts.length > 0 && (
            <Link to="/shop" className="btn-ghost btn-sm">
              <Icon.ArrowRight className="size-3.5 rotate-180" />
              Keep shopping
            </Link>
          )}
        </div>

        {cartProducts.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon={<Icon.Cart className="size-6" />}
              title="Your cart is empty"
              body="Nothing checked out yet. Browse the catalog and add anything that catches your eye — nothing here needs an account."
              action={{ label: 'Start shopping', to: '/shop' }}
            />

            {suggestions.length > 0 && (
              <div className="mt-14">
                <h2 className="text-lg font-bold text-ink">Popular right now</h2>
                <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {suggestions.map((product, i) => (
                    <ProductCard key={product.id} product={product} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
            {/* --------------------------------------------------- */}
            {/*  Lines                                               */}
            {/* --------------------------------------------------- */}
            <div>
              {/* Free shipping meter */}
              <div className="panel p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                    <Icon.Truck className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">
                      {toFreeShipping > 0 ? (
                        <>
                          Add <span className="text-emerald-300">${toFreeShipping.toFixed(2)}</span>{' '}
                          more for free insured shipping
                        </>
                      ) : (
                        <span className="text-emerald-300">
                          You have unlocked free insured shipping
                        </span>
                      )}
                    </p>
                    <ProgressMeter value={progress} tone={toFreeShipping > 0 ? 'brand' : 'emerald'} className="mt-2" />
                  </div>
                </div>
              </div>

              <ul className="mt-4 space-y-3">
                <AnimatePresence initial={false}>
                  {cartProducts.map(({ product, quantity }) => (
                    <motion.li
                      key={product.id}
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -60, height: 0, marginBottom: 0, filter: 'blur(6px)' }}
                      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                      className="panel ring-gradient relative overflow-hidden p-3"
                    >
                      <div className="flex gap-4">
                        <Link
                          to={`/product/${product.slug}`}
                          className="size-24 shrink-0 overflow-hidden rounded-xl bg-ink sm:size-28"
                        >
                          <ProductThumb product={product} />
                        </Link>

                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <Link
                                to={`/product/${product.slug}`}
                                className="line-clamp-2 text-sm font-bold text-ink transition hover:text-brand-oncanvas"
                              >
                                {product.name}
                              </Link>
                              <p className="mt-1 text-[11px] text-ink-subtle">
                                {product.brand} · {product.category}
                              </p>
                            </div>
                            <PriceTag
                              price={product.price * quantity}
                              size="sm"
                              className="shrink-0"
                            />
                          </div>

                          <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-xs text-ink-subtle">
                              {money(product.price)} each
                            </span>
                            {product.compareAtPrice && (
                              <span className="text-[11px] text-emerald-400">
                                saving {money((product.compareAtPrice - product.price) * quantity)}
                              </span>
                            )}
                          </div>

                          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                            <QuantityStepper
                              value={quantity}
                              onChange={(q) => setQuantity(product.id, q)}
                              size="sm"
                            />
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  moveToSaved(product.id)
                                  push({
                                    title: 'Saved for later',
                                    description: product.name,
                                    action: { label: 'View saved', to: '/account?tab=saved' },
                                  })
                                }}
                                className="btn-quiet btn-sm text-[11px]"
                              >
                                <Icon.Heart className="size-3.5" />
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  removeItem(product.id)
                                  push({ title: 'Removed', description: product.name })
                                }}
                                className="btn-quiet btn-sm text-[11px] hover:text-rose-300"
                              >
                                <Icon.Trash className="size-3.5" />
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>

              {/* Saved for later */}
              {savedProducts.length > 0 && (
                <div className="mt-8">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                    <Icon.Heart className="size-4 text-rose-400" />
                    Saved for later
                    <span className="rounded-md bg-surface-inset px-1.5 py-0.5 text-[11px] text-body">
                      {savedProducts.length}
                    </span>
                  </h2>
                  <ul className="mt-3 space-y-2">
                    <AnimatePresence initial={false}>
                      {savedProducts.map(({ product, quantity }) => (
                        <motion.li
                          key={product.id}
                          layout
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 40, height: 0, marginBottom: 0 }}
                          transition={{ duration: 0.35 }}
                          className="panel flex items-center gap-3 p-3"
                        >
                          <span className="size-14 shrink-0 overflow-hidden rounded-lg bg-ink">
                            <ProductThumb product={product} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <Link
                              to={`/product/${product.slug}`}
                              className="line-clamp-1 text-sm font-semibold text-ink hover:text-brand-oncanvas"
                            >
                              {product.name}
                            </Link>
                            <p className="text-xs text-ink-subtle">
                              {money(product.price)} · qty {quantity}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              onClick={() => moveToCart(product.id)}
                              className="btn-ghost btn-sm"
                            >
                              <Icon.Cart className="size-3.5" />
                              Move
                            </button>
                            <button
                              onClick={() => removeSaved(product.id)}
                              aria-label={`Remove ${product.name} from saved items`}
                              className="btn-quiet btn-sm hover:text-rose-300"
                            >
                              <Icon.Trash className="size-3.5" />
                            </button>
                          </div>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </div>
              )}
            </div>

            {/* --------------------------------------------------- */}
            {/*  Summary                                             */}
            {/* --------------------------------------------------- */}
            <aside className="lg:sticky lg:top-32 lg:self-start">
              <div className="panel p-5">
                <h2 className="text-sm font-bold text-ink">Order summary</h2>

                <dl className="mt-4 space-y-2.5 text-sm">
                  <Row label={`Subtotal (${itemCount} ${itemCount === 1 ? 'item' : 'items'})`}>
                    {moneyExact(subtotal)}
                  </Row>

                  <Row
                    label="Insured shipping"
                    tone={shipping === 0 ? 'emerald' : undefined}
                  >
                    {shipping === 0 ? 'FREE' : moneyExact(shipping)}
                  </Row>

                  <Row label={`Sales tax (${(TAX_RATE * 100).toFixed(0)}%)`}>
                    ${tax.toFixed(2)}
                  </Row>
                </dl>

                <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
                  <span className="text-sm font-semibold text-body">Total</span>
                  <motion.span
                    key={total}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="font-display text-2xl font-extrabold text-ink"
                  >
                    ${total.toFixed(2)}
                  </motion.span>
                </div>

                <Magnetic strength={0.18} className="mt-5 w-full">
                  <Link
                    to="/checkout"
                    aria-busy={syncing}
                    className="btn-primary sheen w-full px-6 py-3.5 text-base"
                  >
                    <Icon.Shield className="size-4" />
                    {syncing ? 'Syncing cart…' : 'Proceed to checkout'}
                  </Link>
                </Magnetic>

                <p className="mt-3 text-center text-[11px] text-ink-subtle">
                  {shipping > 0
                    ? `Shipping is ${moneyExact(FLAT_SHIPPING)} — free over ${money(SHIPPING_THRESHOLD)}.`
                    : 'Free insured shipping applied.'}
                </p>
              </div>

              <div className="panel mt-3 flex items-start gap-3 p-4">
                <Icon.Info className="mt-0.5 size-4 shrink-0 text-brand-oncanvas" />
                <p className="text-xs leading-relaxed text-ink-muted">
                  Shipping, tax and the final total are recalculated by the server when you place
                  the order, so the figures above are an estimate until then.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>

      <TrustBar />
    </SiteLayout>
  )
}

/* -------------------------------------------------------------------------- */

function Row({
  label,
  children,
  tone,
}: {
  label: string
  children: ReactNode
  tone?: 'emerald'
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-subtle">{label}</dt>
      <dd
        className={`font-semibold ${
          tone === 'emerald' ? 'text-emerald-400' : 'text-body tabular-nums'
        }`}
      >
        {children}
      </dd>
    </div>
  )
}
