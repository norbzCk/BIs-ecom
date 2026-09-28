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

## Screens implemented

Storefront (mock data for now, see `src/data/`):

- Home
- Shop / search results (category, price, brand filters + product grid)
- Product detail (gallery, buy box, spec table)
- Cart
- Checkout (contact, address, delivery speed, payment, order summary, confirmation)
- Account (tier status, recent shipments, primary address, payment method)

Admin (wired to the real API, see the backend README's "Admin and catalog management"):

- `/admin/login`: sign in; non-admin accounts are refused
- `/admin/products`: product list with stock/status, and Discontinue
- `/admin/products/new`: create a product with every required field (name, SKU, category,
  price, images, starting stock) plus brand, model, description, status and specifications.
  On a fresh install with no categories, the category creator opens automatically.

Run the backend (`pnpm start:dev` in the repo root) alongside `pnpm --filter web dev`; the
dev server proxies `/api` to it. The admin token is kept in `localStorage` under
`billionare_admin_auth`.

## Not yet implemented

Deals, Comparison, Order Tracking, Wishlist, Help, Messages, admin Overview / Orders /
Order detail / Support, editing an existing product from the UI (the `PATCH` endpoint
exists), and wiring the storefront pages and Account to the real API.
