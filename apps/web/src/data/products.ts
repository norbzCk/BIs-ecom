import type { Product, Review } from '../types'

export const products: Product[] = [
  {
    id: 'p-apex-15-pro',
    slug: 'billionare-apex-15-pro',
    name: 'Billionare Apex-15 Pro',
    brand: 'Billionare',
    category: 'Computers & Laptops',
    price: 1699,
    compareAtPrice: 1899,
    rating: 4.8,
    reviewCount: 124,
    badge: 'Top-tier selection',
    stockLabel: 'Only 3 left',
    description:
      'A high-refresh workstation laptop built for engineers and creators who need serious sustained performance without leaving the desk.',
    images: [
      { url: 'https://placehold.co/800x600/0b1220/ffffff?text=Apex-15+Pro', alt: 'Billionare Apex-15 Pro laptop, open, glowing keyboard' },
      { url: 'https://placehold.co/800x600/111a2e/ffffff?text=Side+Profile', alt: 'Apex-15 Pro side profile' },
      { url: 'https://placehold.co/800x600/182238/ffffff?text=Ports', alt: 'Apex-15 Pro ports detail' },
      { url: 'https://placehold.co/800x600/0b1220/ffffff?text=Keyboard', alt: 'Apex-15 Pro keyboard close-up' },
    ],
    specs: [
      { label: 'Processor & Architecture', value: 'Intel Core i9-13900H (14 Cores, 20 Threads, up to 5.4GHz turbo frequency)' },
      { label: 'Graphics Subsystem', value: 'NVIDIA GeForce RTX 4070 Laptop GPU (8GB GDDR6 dedicated, G-SYNC)' },
      { label: 'Installed RAM & Drive', value: '32GB dual-channel DDR5 5200MHz Hyper / 1TB NVMe Gen4 SSD' },
      { label: 'Display Attributes', value: '15.6" QHD (2560 x 1440) high-density IPS display, anti-glare, 100% DCI-P3' },
      { label: 'Connectivity Ports', value: '1x Thunderbolt 4, 2x USB-A 3.2 Gen2, 1x HDMI 2.1, SD Card Reader, RJ-45' },
      { label: 'Warranty Coverage', value: '3-Year Direct Billionare Warranty with direct shipping-label dispatch/replacement' },
    ],
  },
  {
    id: 'p-mech-pro-keyboard',
    slug: 'billionare-type-mechanical-pro-keyboard',
    name: 'BillionareType Mechanical Pro Keyboard',
    brand: 'Billionare',
    category: 'Mechanical Keyboards',
    price: 129,
    compareAtPrice: 159,
    rating: 4.6,
    reviewCount: 309,
    badge: 'Save $30',
    images: [
      { url: 'https://placehold.co/800x600/1d4ed8/ffffff?text=Mech+Pro+Keyboard', alt: 'BillionareType mechanical keyboard, RGB lit' },
    ],
    specs: [
      { label: 'Layout', value: '75% Layout, Gasket-Mount, Hot-swap RGB' },
      { label: 'Switches', value: 'Tactile Brown, 5-pin hot-swap sockets' },
      { label: 'Connectivity', value: 'Bluetooth 5.1, 2.4GHz dongle, USB-C wired' },
    ],
  },
  {
    id: 'p-apex-slim',
    slug: 'billionare-apex-14-slim',
    name: 'Billionare Apex-14 Slim',
    brand: 'Billionare',
    category: 'Computers & Laptops',
    price: 1699,
    compareAtPrice: 1899,
    rating: 4.8,
    reviewCount: 124,
    badge: 'Save $200',
    stockLabel: 'Only 2 left',
    images: [{ url: 'https://placehold.co/800x600/0b1220/ffffff?text=Apex-14+Slim', alt: 'Billionare Apex-14 Slim laptop' }],
    specs: [
      { label: 'Processor', value: 'Intel Core i7 - 12GB RAM - 1TB SSD - RTX 4070' },
    ],
  },
  {
    id: 'p-workspace-monitor-27',
    slug: 'billionare-view-27-workspace-monitor',
    name: 'BillionareView 27" Workspace Monitor',
    brand: 'Billionare',
    category: 'Monitors & Screens',
    price: 349,
    compareAtPrice: 399,
    rating: 4.9,
    reviewCount: 210,
    badge: 'Save $50',
    stockLabel: 'In Stock',
    images: [{ url: 'https://placehold.co/800x600/111a2e/ffffff?text=27in+Monitor', alt: 'BillionareView 27 inch monitor' }],
    specs: [{ label: 'Panel', value: '3440 x 1440, IPS, 144Hz, USB-C Power' }],
  },
  {
    id: 'p-curved-34',
    slug: 'billionare-view-34-ultrawide-curved-monitor',
    name: 'BillionareView 34" UltraWide Curved Monitor',
    brand: 'Billionare',
    category: 'Monitors & Screens',
    price: 549,
    compareAtPrice: 649,
    rating: 4.7,
    reviewCount: 156,
    badge: 'Save $100',
    stockLabel: 'In Stock',
    images: [{ url: 'https://placehold.co/800x600/182238/ffffff?text=34in+Curved', alt: 'BillionareView 34 inch curved monitor' }],
    specs: [{ label: 'Panel', value: '3440 x 1440, IPS, 144Hz, USB-C Power' }],
  },
  {
    id: 'p-glide-x-wireless-mouse',
    slug: 'billionare-glide-x-wireless-mouse',
    name: 'BillionareGlide X Wireless Mouse',
    brand: 'Billionare',
    category: 'Mice',
    price: 79,
    compareAtPrice: 99,
    rating: 4.6,
    reviewCount: 88,
    badge: 'Save $20',
    stockLabel: 'In Stock',
    images: [{ url: 'https://placehold.co/800x600/1e40af/ffffff?text=Glide+X+Mouse', alt: 'BillionareGlide X wireless mouse' }],
    specs: [{ label: 'Battery', value: '26x4 Mode, 60hr Battery, 63g' }],
  },
]

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug)
}

export const reviews: Review[] = [
  {
    id: 'r1',
    author: 'Marcus Vance',
    role: 'CTO, ArchTech Labs',
    rating: 5,
    quote:
      'Billionare completely solved our remote team workstation procurement. Laptops and monitors arrive fully configured, safely wrapped, and lighting fast.',
    product: 'Apex-15 Pro Workstation',
  },
  {
    id: 'r2',
    author: 'Elena Rostova',
    role: 'UI Designer',
    rating: 5,
    quote:
      'The mechanical keyboard selection is pristine. Direct warranty registration with Billionare works flawlessly. Customer care is incredibly responsive.',
    product: 'BillionareType Mechanical Pro',
  },
  {
    id: 'r3',
    author: 'Devon Carter',
    role: 'Software Engineer',
    rating: 5,
    quote:
      'I compared curved monitor prices everywhere and Billionare won on price and delivered it safely boxed within 24 hours. Phenomenal retail service.',
    product: 'BillionareView 34" UltraWide',
  },
]
