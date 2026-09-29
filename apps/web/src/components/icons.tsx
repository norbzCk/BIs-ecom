import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function base(props: IconProps) {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...props,
    className: `size-5 ${props.className ?? ''}`,
  }
}

export const Icon = {
  Sun: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  Moon: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    </svg>
  ),
  Laptop: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="4" y="4" width="16" height="11" rx="2" />
      <path d="M2 19h20M9 19l.6-2.4M15 19l-.6-2.4" />
    </svg>
  ),
  Monitor: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M9 20h6M12 16v4" />
    </svg>
  ),
  Keyboard: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12" />
    </svg>
  ),
  Mouse: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="6" y="2.5" width="12" height="19" rx="6" />
      <path d="M12 7v4" />
    </svg>
  ),
  Headset: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="2.5" y="13.5" width="4.5" height="7" rx="2" />
      <rect x="17" y="13.5" width="4.5" height="7" rx="2" />
    </svg>
  ),
  Dock: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="2.5" y="8" width="19" height="9" rx="2.5" />
      <path d="M7 12.5h.01M11 12.5h.01M15 12.5h.01" />
    </svg>
  ),
  Cpu: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </svg>
  ),
  Cart: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M2.5 3h2l2.3 11.5a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.7L20 7.5H5.5" />
      <circle cx="9" cy="20" r="1.3" />
      <circle cx="17" cy="20" r="1.3" />
    </svg>
  ),
  User: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </svg>
  ),
  Search: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.6-4.6" />
    </svg>
  ),
  Heart: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 20s-7.5-4.7-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.3-7.5 10-7.5 10Z" />
    </svg>
  ),
  HeartFilled: (p: IconProps) => (
    <svg {...base(p)} fill="currentColor" stroke="none">
      <path d="M12 20.5s-8-5-8-10.4A4.6 4.6 0 0 1 12 7.4a4.6 4.6 0 0 1 8 2.7c0 5.4-8 10.4-8 10.4Z" />
    </svg>
  ),
  Bolt: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M13.5 2 4 13.5h6L10.5 22 20 10.5h-6L13.5 2Z" />
    </svg>
  ),
  Shield: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 2.5 4.5 5.5v5.2c0 4.6 3 8.2 7.5 9.3 4.5-1.1 7.5-4.7 7.5-9.3V5.5L12 2.5Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  Truck: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M2.5 6.5h11v10h-11zM13.5 10h4l3 3v3.5h-7z" />
      <circle cx="7" cy="18.5" r="1.7" />
      <circle cx="17" cy="18.5" r="1.7" />
    </svg>
  ),
  Clock: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  ),
  Refresh: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3.5 9A8.5 8.5 0 0 1 17.5 6.5M20.5 15A8.5 8.5 0 0 1 6.5 17.5" />
      <path d="M3.5 4.5V9H8M20.5 19.5V15H16" />
    </svg>
  ),
  Sparkle: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 3.5 13.6 9 19 10.6 13.6 12.2 12 17.7 10.4 12.2 5 10.6 10.4 9 12 3.5Z" />
      <path d="M18.5 16.5 19.2 18.6 21.3 19.3 19.2 20 18.5 22.1 17.8 20 15.7 19.3 17.8 18.6 18.5 16.5Z" />
    </svg>
  ),
  Star: (p: IconProps) => (
    <svg {...base(p)} fill="currentColor" stroke="none">
      <path d="M12 3.2 14.6 8.6l5.9.9-4.3 4.2 1 5.9L12 16.8 6.8 19.6l1-5.9L3.5 9.5l5.9-.9L12 3.2Z" />
    </svg>
  ),
  Check: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  ),
  X: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  Menu: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />
    </svg>
  ),
  ChevronRight: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  ),
  ChevronLeft: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="m15 6-6 6 6 6" />
    </svg>
  ),
  ArrowRight: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  ),
  Scale: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 4v16M7 20h10" />
      <path d="M4 9h6l-3 5.5L4 9ZM14 9h6l-3 5.5L14 9Z" />
      <path d="M4 9 12 6l8 3" />
    </svg>
  ),
  Tag: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 11.5V4.5A1.5 1.5 0 0 1 4.5 3h7l9 9-8 8-9-9Z" />
      <circle cx="7.8" cy="7.8" r="1.3" />
    </svg>
  ),
  Pin: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 21.5s7-6.9 7-12A7 7 0 0 0 5 9.5c0 5.1 7 12 7 12Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  ),
  Card: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19M6 15h3" />
    </svg>
  ),
  Mail: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="m3 6.5 9 6.5 9-6.5" />
    </svg>
  ),
  Phone: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M6.5 3.5h3l1.5 4-2 1.4a12 12 0 0 0 6.1 6.1l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z" />
    </svg>
  ),
  LogOut: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M9.5 4.5H5.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h4M16 8l4 4-4 4M20 12H9" />
    </svg>
  ),
  Package: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M20.5 7.5 12 3 3.5 7.5v9L12 21l8.5-4.5v-9Z" />
      <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
    </svg>
  ),
  Settings: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.2 7l1.9 1.1M17.9 15.9l1.9 1.1M4.2 17l1.9-1.1M17.9 8.1l1.9-1.1" />
    </svg>
  ),
  Plus: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Trash: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13M10 11v6M14 11v6" />
    </svg>
  ),
  Edit: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 20h4L20 8l-4-4L4 16v4Z" />
      <path d="m14 6 4 4" />
    </svg>
  ),
  Filter: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 5.5h18l-7 8v5.5l-4 2v-7.5l-7-8Z" />
    </svg>
  ),
  Grid: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  ),
  Copy: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  ),
  Info: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8v.01" />
    </svg>
  ),
  Alert: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 4 2.5 20h19L12 4Z" />
      <path d="M12 10v4M12 17v.01" />
    </svg>
  ),
  Leaf: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 20c0-9 6-14 16-15 0 10-5 15-12 15-2.5 0-4-1-4-1Z" />
      <path d="M9 15c2-3 5-5 8-6" />
    </svg>
  ),
  Award: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="9" r="5.5" />
      <path d="m8.5 13.8-1 7.2 4.5-2.5 4.5 2.5-1-7.2" />
    </svg>
  ),
  Compass: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </svg>
  ),
  Headphones: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
      <rect x="2.5" y="14" width="4" height="7" rx="2" />
      <rect x="17.5" y="14" width="4" height="7" rx="2" />
    </svg>
  ),
}

export type IconName = keyof typeof Icon
