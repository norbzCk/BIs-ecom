const columns = [
  {
    title: 'Shop Products',
    links: ['Computers & Laptops', 'Monitors & Screens', 'Mechanical Keyboards', 'Ergonomic Mice', 'Audio & Headsets', 'Workstation Accessories'],
  },
  {
    title: 'Trust & Service',
    links: ['Warranty Terms', 'Shipping & Delivery Tracker', '30-Day Easy Returns', 'Customer Protection Policy', 'Enterprise Procurement', 'Affiliate Program'],
  },
]

export function SiteFooter() {
  return (
    <footer className="bg-navy-900 text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-brand-600 text-sm font-extrabold text-white">
              B
            </span>
            <span className="text-base font-extrabold text-white">Billionare</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            At Billionare, we curate high-performance hardware, reliable monitors, and essential
            workflow accessories. Our mission is to deliver pure retail trust, backed by premium
            logistics and verified manufacturer warranties.
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold text-white">{col.title}</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              {col.links.map((link) => (
                <li key={link} className="hover:text-white">
                  {link}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h3 className="text-sm font-semibold text-white">Get Insider Deals</h3>
          <p className="mt-4 text-sm text-slate-400">
            Subscribe to our newsletter to receive direct system building tips, exclusive seasonal
            codes, and direct notifications for flash hardware discounts.
          </p>
          <form
            className="mt-4 flex overflow-hidden rounded-lg border border-slate-700"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
            />
            <button type="submit" className="bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              Join
            </button>
          </form>
        </div>
      </div>

      <div className="border-t border-slate-800 px-4 py-5 text-center text-xs text-slate-500 sm:px-6">
        © {new Date().getFullYear()} Billionare Retail Technologies Inc. All direct rights reserved.
      </div>
    </footer>
  )
}
