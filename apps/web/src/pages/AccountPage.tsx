import { SiteLayout } from '../components/SiteLayout'
import { TrustBar } from '../components/TrustBar'
import { currentAccount, accountShipments } from '../data/account'

const navItems = [
  { label: 'Account Overview', icon: 'user', active: true },
  { label: 'My Workspace Orders', icon: 'box' },
  { label: 'Registered Addresses', icon: 'pin' },
  { label: 'Secure Payments', icon: 'card' },
  { label: 'Billionare Rewards Points', icon: 'star' },
]

function StatusPill({ status }: { status: 'SHIPPED' | 'DELIVERED' }) {
  const styles =
    status === 'DELIVERED'
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-blue-100 text-blue-700'

  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${styles}`}>
      {status === 'DELIVERED' ? 'DELIVERED' : 'SHIPPED'}
    </span>
  )
}

export function AccountPage() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Hello, {currentAccount.firstName}!
        </h1>

        <div className="mt-6 grid gap-8 lg:grid-cols-[220px_1fr]">
          <aside className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium ${
                  item.active
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="size-1.5 rounded-full bg-current opacity-60" />
                {item.label}
              </button>
            ))}
            <button className="mt-4 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-500 hover:bg-red-50">
              <span className="size-1.5 rounded-full bg-current opacity-60" />
              Sign Out Session
            </button>
          </aside>

          <div className="space-y-6">
            {/* Tier status */}
            <div className="flex items-center justify-between rounded-xl bg-navy-900 p-5 text-white">
              <div>
                <p className="text-sm font-semibold">
                  {currentAccount.firstName}&rsquo;s {currentAccount.tier} Tier Status
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  Your workstation build history earned you: Gold Level
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-extrabold">
                  {currentAccount.tierPoints.toLocaleString()} pts
                </p>
                <p className="text-xs text-slate-300">{currentAccount.tierNote}</p>
                <button className="mt-2 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold hover:bg-brand-700">
                  Redeem
                </button>
              </div>
            </div>

            {/* Shipments */}
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Workspace Shipments</h2>
              <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100">
                {accountShipments.map((shipment) => (
                  <div key={shipment.id} className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <StatusPill status={shipment.status} />
                        <span className="text-sm font-semibold text-slate-900">
                          #{shipment.orderCode}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{shipment.summary}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-slate-900">
                        ${shipment.total.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-400">Placed on {shipment.placedOn}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Address + payment */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 p-4">
                <p className="text-sm font-bold text-slate-900">
                  {currentAccount.primaryAddress.label}
                </p>
                <p className="mt-2 text-sm text-slate-600">{currentAccount.primaryAddress.name}</p>
                <p className="text-sm text-slate-500">{currentAccount.primaryAddress.street}</p>
                <p className="text-sm text-slate-500">{currentAccount.primaryAddress.cityLine}</p>
                <button className="mt-3 text-xs font-semibold text-brand-600 hover:underline">
                  Edit Address
                </button>
              </div>
              <div className="rounded-xl border border-slate-100 p-4">
                <p className="text-sm font-bold text-slate-900">{currentAccount.payment.label}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {currentAccount.payment.cardBrand} ending in {currentAccount.payment.last4}
                </p>
                <p className="text-sm text-slate-500">Expires {currentAccount.payment.expiry}</p>
                <button className="mt-3 text-xs font-semibold text-brand-600 hover:underline">
                  Manage Cards
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TrustBar />
    </SiteLayout>
  )
}
