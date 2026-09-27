# Billionare — Web (Storefront)

React + Vite + Tailwind CSS 4 storefront for Billionare, implementing the core shopping flow
from the product Figma file: Home → Shop → Product Detail → Cart → Checkout.

## Stack

- React 19 + React Router 7
- Tailwind CSS 4 (via `@tailwindcss/vite`)
- TypeScript, strict mode

## Getting started

```bash
pnpm install
pnpm --filter web dev
```

The dev server proxies `/api` to `http://localhost:3000` (the NestJS backend in the repo root),
so once the corresponding API routes exist there, product/cart/order data can be swapped in for
the mock data in `src/data/products.ts` and `src/lib/cart-context.tsx` without touching page
components.

## Structure

```
src/
  components/   Shared UI: header, footer, product card, trust bar, star rating
  pages/        One file per route (Home, Shop, ProductDetail, Cart, Checkout)
  lib/          Cart state (React context) — swap for real API calls later
  data/         Mock product catalog — replace with API-backed data fetching
  types/        Shared domain types (Product, CartLine, Review)
```

## Screens implemented in this pass

- Home
- Shop / search results (with category, price, brand filters + product grid)
- Product detail (gallery, buy box, spec table)
- Cart
- Checkout (contact, address, delivery speed, payment, order summary, confirmation)

## Not yet implemented

Deals, Comparison, Order Tracking, Account, Wishlist, Help, Messages, and the full Admin panel
are designed in Figma but not built yet — follow-up commits will add these.
