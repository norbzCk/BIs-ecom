<p align="center">
  <strong>Billionare</strong> — workspace-fit hardware storefront
</p>

## Description

Billionare is a pnpm monorepo with two halves:

| Path | Stack | Role |
| --- | --- | --- |
| `src/` (repo root) | NestJS 11 + Prisma | HTTP API. Owns auth, catalog, cart, orders and image uploads. All routes are prefixed `/api`. |
| `apps/web` | React 19 + Vite + Tailwind | Storefront and admin UI. Talks to the API over `/api` (proxied to the backend in dev). |

Data lives in **Supabase Postgres** (via Prisma), and admin product images live in
**Supabase Storage**. The catalog ships empty: everything the storefront shows —
products, categories, images, specs, reviews, orders — is read from the API at
runtime, so there is no mock or seeded fallback anywhere in `apps/web`.

## Layout

```
.
├── prisma/                  # schema + migrations (Supabase Postgres)
├── src/                     # NestJS API
│   ├── auth/                # register / login, JWT strategy + guard
│   ├── admin/               # admin-only catalog CRUD, roles guard
│   ├── storage/             # Supabase Storage uploads (admin-only)
│   ├── products/            # public catalog, facets, reviews
│   ├── categories/          # public categories
│   ├── cart/                # server-side cart
│   └── orders/              # checkout, order history
├── apps/web/                # React storefront + admin UI
│   └── src/
│       ├── components/      # UI kit and product visuals
│       ├── lib/             # catalog / cart / account / auth contexts
│       └── pages/           # storefront pages + pages/admin/
└── test/                    # e2e specs (real AppModule, real DATABASE_URL)
```

## Project setup

```bash
$ pnpm install
$ cp .env.example .env    # then fill it in
```

Both halves share the same `.env` at the repo root.

| Variable | Used by | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | API | Prisma connection string (Supabase pooler works) |
| `DIRECT_URL` | API, scripts | Direct Postgres connection, used by migrations |
| `JWT_SECRET` | API | Signs the custom access tokens this app issues itself |
| `JWT_EXPIRES_IN` | API | Access token lifetime |
| `SUPABASE_URL` | API | Supabase project URL, for the Storage client |
| `SUPABASE_SERVICE_ROLE_KEY` | API | Storage writes. **Server only** — never prefix it with `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SUPABASE_URL` | web | Supabase URL for browser-side reads, if needed |

`SUPABASE_SERVICE_ROLE_KEY` is optional: without it every upload endpoint
returns `503 Storage is not configured`, and the rest of the app keeps working.
Add it when you want image uploads to work.

Then apply the schema and start both processes:

```bash
$ pnpm exec prisma migrate deploy    # apply prisma/migrations to Supabase
$ pnpm run start:dev                 # API on :3000
$ pnpm --filter web run dev          # storefront on :5173, /api proxied to :3000
```

## Compile and run the project

```bash
# API
$ pnpm run start          # production
$ pnpm run start:dev      # watch mode
$ pnpm run start:prod     # compiled dist/

# web
$ pnpm --filter web run dev
$ pnpm --filter web run build
```

## Run tests

```bash
# API unit tests
$ pnpm run test

# API e2e tests (boots the real AppModule against DATABASE_URL)
$ pnpm run test:e2e

# coverage
$ pnpm run test:cov

# web typecheck + lint + build
$ pnpm --filter web run build
$ pnpm --filter web run lint
```

e2e specs talk to a remote pooler, so a cold pool is slow on first use — the
config already raises the timeouts accordingly.

## Admin and catalog management

Admins manage the catalog through `/api/admin/*` (or the admin UI in `apps/web` at
`/admin/login`). Every admin route requires a bearer token whose role is `ADMIN`
(no token: `401`, customer token: `403`).

### Creating the first admin

`POST /api/auth/register` only ever creates `CUSTOMER` accounts, on purpose: there is no
endpoint that grants admin, so nobody can promote themselves. Bootstrap the first admin
from the database instead:

1. Register normally: `POST /api/auth/register` with your name, email and password.
2. Promote that account (Supabase SQL editor, `psql`, or Prisma Studio):

   ```sql
   UPDATE users SET role = 'ADMIN' WHERE email = 'you@example.com';
   ```

3. Sign in at `/admin/login` with the same credentials. Role is read from the JWT, so
   sign in *after* promoting (a token issued earlier still says `CUSTOMER`).

### Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/admin/products` | List all products, any status (`status`, `search`, `category`, `brand`, `page`, `pageSize`) |
| `GET` | `/api/admin/products/:id` | Full product for editing |
| `POST` | `/api/admin/products` | Create a product |
| `PATCH` | `/api/admin/products/:id` | Update; `images` / `specifications`, if sent, fully replace the existing ones |
| `DELETE` | `/api/admin/products/:id` | Discontinue (soft delete), see below |
| `POST` | `/api/admin/categories` | Create a category |
| `PATCH` | `/api/admin/categories/:id` | Rename / re-describe |
| `DELETE` | `/api/admin/categories/:id` | Delete (refused while products use it) |
| `POST` | `/api/admin/uploads/images` | Upload product images (multipart `files[]`) |
| `DELETE` | `/api/admin/uploads/images` | Delete stored images by URL |

The public `GET /api/categories` and `GET /api/products` are unchanged and only ever
show `ACTIVE` products.

### What a product requires

| Field | Rule |
| --- | --- |
| `name` | required, 1-200 chars |
| `sku` | required, unique |
| `categoryId` | required, must exist (create categories first) |
| `price` | required, greater than 0 |
| `images` | required, `[{ url, isPrimary? }]`, at least one entry. Exactly one is stored as primary: the first one marked `isPrimary`, otherwise the first image |
| `inventory.quantity` | required, integer >= 0 (starting stock) |
| `slug` | optional, unique; derived from `name` (`-2`, `-3` on collision) when omitted |
| `brand`, `model`, `description`, `specifications[]`, `status` | optional (`status` defaults to `ACTIVE`) |

Validation failures return `400` with one message per problem, and unknown fields are
rejected. Duplicate `sku` / `slug` / category name return `409`.

### Product images

Uploading from disk is a two-step flow, handled by `apps/web/src/lib/api-client.ts`:

1. `POST /api/admin/uploads/images` with one or more files as `files[]`. The
   response is `{ urls: string[] }` of public Storage URLs.
2. Send those URLs in the product's `images` array on create/update.

Limits and behaviour: 5 MiB per file, `png` / `jpg` / `webp` / `avif` / `gif`
only, up to 10 files per request. Every file is stored under a generated UUID
sharded by its first two hex characters so names never collide, and the bucket
is created public on first use if it is missing. A rejected file type does not
stop the others in the batch from being stored.

Responses worth knowing: `201` with one `{ url, path }` per accepted file, `400`
when nothing was attached or a type is not allowed, `413` when the request
exceeds the size limit (Multer rejects it before the handler runs), and `503`
when `SUPABASE_SERVICE_ROLE_KEY` is absent.

Deleting is best-effort cleanup: `DELETE /api/admin/uploads/images` with
`{ urls: [...] }` removes each object that lives in our bucket and ignores URLs
pointing anywhere else. Replacing a product's `images` array also drops the
Storage objects that are no longer referenced, so old files do not accumulate.

### Notes

- **Deleting a product discontinues it** (`status = DISCONTINUED`) instead of removing the
  row. Past orders reference products with no cascade, so a hard delete would fail for
  any product that was ever ordered. Discontinued products disappear from the storefront
  but stay in order history.
- **Strict input types.** `ValidationPipe` runs without `enableImplicitConversion`, which
  used to turn an object sent for a string field into the text `"[object Object]"`. Fields
  that need a string-to-number conversion (query params, form prices) declare an explicit
  `@Type(() => Number)`.
- **Admin sessions are stateless JWTs.** Demoting or disabling an admin does not revoke a
  token already issued; it stays valid until `JWT_EXPIRES_IN`. Keep that short if it matters.

## Pricing rules

Checkout totals are computed on the server in `src/orders/orders.service.ts`:

| Rule | Value | Notes |
| --- | --- | --- |
| Standard delivery | TSh 35,000 | Charged when the subtotal is not over the threshold |
| Free delivery | over TSh 400,000 | Applied server-side, not requested by the client |
| Tax | 8% of subtotal | Folded into `Order.total`; there is no `tax` column on `Order` yet |

The storefront quotes the same figures before you submit, from
`SHIPPING_THRESHOLD` and `FLAT_SHIPPING` in `apps/web/src/lib/cart-context.tsx`.
They are duplicated rather than shared, so **change both** — if they drift, the
customer sees one total and the server records another. The client copy is only
an estimate: the response to `POST /api/orders` is authoritative, and the
confirmation screen shows the server's figures, not the ones it predicted.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

This project is already instrumented. Create a free account at [observe.nestjs.com](https://observe.nestjs.com), add an application, and paste the generated app key and secret into the `ObserveModule.forRoot()` call in `src/app.module.ts`.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
