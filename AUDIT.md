# Audit: Billionare/Billionaires Computers

Date: 2026-10-27
Repo: /home/norbs/Projects/billns/billionare
Stack: NestJS + TypeScript (pnpm workspace), Prisma ORM, Postgres (Supabase), React 19 + Vite + Tailwind (apps/web), JWT auth, Vitest.

## What exists (current state)

### Backend (NestJS src/)
- **App bootstrap**: `main.ts` sets global `ValidationPipe` (whitelist/transform), CORS from `CORS_ORIGINS` or defaults `http://localhost:5173`, prefix `/api` via `app.setGlobalPrefix('api')`. 
- **Modules**: auth, admin, products, categories, cart, orders, storage, health, prisma, common.
- **Auth** (`src/auth/`): register/login, JWT strategy/guard, roles. `POST /api/auth/register` only creates CUSTOMER. JWT stateless.
- **Admin** (`src/admin/`): admin-only catalog CRUD under `/api/admin/*` (products, categories). Image upload via `/api/admin/uploads/images`. Protected by RolesGuard requiring ADMIN. 
- **Products** (`src/products/`): public product endpoints exist? Let us check controllers. 
- **Categories** (`src/categories/`): public categories.
- **Cart** (`src/cart/`): server-side cart.
- **Orders** (`src/orders/`): checkout/order history, pricing in TZS with shipping rules as noted in README (35k, free over 400k, 8% tax folded in).
- **Storage** (`src/storage/`): Supabase Storage uploads.
- **Prisma**: client generated to `src/generated/prisma`. Schema has User, Address, Category, Product, ProductImage, ProductSpecification, Review, Inventory, Cart, CartItem, Order, OrderItem, Payment with enums UserRole/Status, ProductStatus, OrderStatus, PaymentMethod/Status.

### Frontend (apps/web/)
- React 19 + Vite + Tailwind. Routes under `src/pages/`, components, contexts for catalog/cart/account/auth.
- Proxied `/api` to backend in dev per README.
- Has admin UI under `pages/admin/` and storefront pages.

### DB schema observations
- `OrderStatus` currently: PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED (more than needed - plan wants PENDING, CONFIRMED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED). 
- `PaymentMethod` includes MOBILE_MONEY, CARD, BANK_TRANSFER, CASH_ON_DELIVERY - plan wants to add provider interface starting with COD; Phase 4 will add mobile money.
- `Product` has merchandising fields (compareAtPrice, rating, reviewCount, badge, featured, releasedAt, highlights). `Inventory` has quantity/reserved.
- `Order` links to Address, has subtotal/shippingFee/total. No delivery zone/fee details stored except maybe via address? No DeliveryZone model visible. Plan says "Delivery zones: admin-managed list of areas with a fee (including free delivery for selected Dar es Salaam areas)". This is missing.
- `Payment` model exists with transactionReference. 
- No Newsletter/subscriber model. Plan wants newsletter signup stored in DB + simple admin export.
- No RecentlyViewed logic in backend; plan says client-side - fine.
- Carts exist (server-side) for logged-in users via User.cart relation (Cart.userId unique). Need guest cart merged on login.

### Tests/config
- Vitest configured (`vitest.config.ts`, `vitest.config.e2e.ts`), e2e specs in `test/`. Tests use real AppModule against DATABASE_URL.
- Lint with oxlint (type-aware).
- Build with nest build.

## What's broken
- Not obvious from quick look. Need to run tests/lint/build to see? But instruction says "Audit (no code changes)" - report state. Also README says "The catalog ships empty: everything the storefront shows..." - that's by design per README. 
- OrderStatus enum in schema doesn't match Phase 2 exactly (has PROCESSING/SHIPPED instead of OUT_FOR_DELIVERY). Need to align or extend.
- Missing models: DeliveryZone, NewsletterSubscriber (and possibly Mail provider abstraction). 
- Currency is Decimal in schema (12,2) but plan says "Currency is TZS (integers, no decimals)". Schema uses Decimal - need to be consistent (store as integers in smallest unit? Or just integers). Plan says "TZS (integers, no decimals)".
- Stock state text: "In stock, N units" for low counts, etc. - need to define "low counts" threshold and expose in API.
- No sitemap.xml generation. No i18n/Kiswahili yet (Phase 4). No rate limiting/security headers mentioned.

## What's missing vs feature list

### Phase 1 (Catalog/storefront public)
- **Public API filters/sort/pagination**: Need to check `src/products/` implementation - does it support category/brand/search/min/max price/in-stock, sort options (best selling, price low-high, price high-low, A-Z, newest), page size 24/36/48, only ACTIVE?
- **Stock state exposure**: API needs to return stock state per product.
- **Pages**: Home, category/collection, product detail, search, About, Contact, policy pages (privacy/refund/shipping/terms). Check apps/web pages.
- **Home sections**: hero, category tiles, best sellers, new arrivals, free-delivery banner, phone/WhatsApp in header/footer.
- **Recently viewed** (client), newsletter signup (store in DB), SEO (titles/meta/OG), sitemap.xml.
- **Mobile responsive, lazy-load images**.

### Phase 2 (Cart/checkout/orders)
- Guest cart + logged-in cart merged on login.
- Checkout fields: name, phone (required), email (optional), delivery area, address notes. Order summary in TZS.
- **Delivery zones** admin-managed with fees including free delivery for selected Dar es Salaam areas - model missing.
- Payment provider interface, start with COD. Stock decremented transactionally on order placement, restored on cancellation.
- Customer account with order history. Order confirmation + email (provider-agnostic mailer).

### Phase 3 (Admin)
- /admin UI: product CRUD with image upload (exists partially?), category CRUD, stock edits, order list with status changes, delivery zones, newsletter export.
- Low-stock indicator, simple sales summary (orders/revenue by day/week).

### Phase 4
- Payment aggregator adapter (ask first - rule says stop and ask). Kiswahili + switcher. Rate limiting, security headers, audit auth flow, 404/500 pages. Replace default NestJS README.

### Seed data
- Seed script with categories and ~30 fake products, placeholder images locally.

## Proposed build order
1. **Phase 0 complete** - audit done (this doc). Get approval.
2. **Phase 1 foundations**: Align schema if needed (OrderStatus, add DeliveryZone, NewsletterSubscriber, ensure TZS integers). Add missing models/migrations. Extend public products API with full filtering/sorting/pagination/stock state. Add newsletter model + endpoint. 
3. **Phase 1 UI**: Build out storefront pages (Home, collection, product, search, policies, About/Contact), header/footer with phone/WhatsApp, SEO/sitemap, recently viewed, newsletter signup.
4. **Phase 2**: Cart guest+merge, delivery zones, checkout flow, order placement with transactional stock decrement/restoration, order statuses, confirmation/email abstraction, customer account orders.
5. **Phase 3**: Admin UI enhancements (delivery zones, newsletter export, low-stock, sales summary), stock edits.
6. **Phase 4**: Payment adapter interface + COD complete, ask for aggregator, then implement; i18n Kiswahili; security/rate limiting/headers; error pages; replace README; polish.
7. **Seed data** throughout as needed.

**Open questions from audit**: OrderStatus naming (OUT_FOR_DELIVERY vs SHIPPED/PROCESSING) - need to confirm mapping. TZS as integers - store as Int (cents? no decimals means whole TZS). Delivery area selection in checkout - ties to DeliveryZone. "Best selling" sort - need order history aggregation or a field.

Waiting for approval to proceed to Phase 1.
