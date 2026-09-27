const items = [
  {
    title: 'Trust Verified',
    body: '100% authentic tech and direct manufacturer warranties',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3l7 3v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z"
      />
    ),
  },
  {
    title: 'Express Dispatch',
    body: 'Same day packaging with global express couriers',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7h11v8H3zM14 10h4l3 3v2h-7zM6.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
      />
    ),
  },
  {
    title: '24/7 Expert Support',
    body: 'Get tech advising from experienced system builders',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 19a7 7 0 100-14 7 7 0 000 14zM12 8v4l3 2"
      />
    ),
  },
  {
    title: 'Hassle-Free Returns',
    body: '30-day money-back guarantee with zero restocking fee',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 4v5h5M4 9a8 8 0 1 1 2.3 5.7"
      />
    ),
  },
]

export function TrustBar() {
  return (
    <div className="border-y border-slate-100 bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-6 sm:grid-cols-4 sm:gap-4">
        {items.map((item) => (
          <div key={item.title} className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                className="size-5"
              >
                {item.icon}
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="text-xs leading-snug text-slate-500">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
