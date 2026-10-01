import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

/**
 * The admin-create -> customer-see contract, exercised over real HTTP against
 * the real database.
 *
 * The unit specs mock PrismaService, so they can only prove each service calls
 * the queries it intends to. This spec boots the whole app and walks the path a
 * product actually takes: an admin posts it with a category, then a customer
 * finds it on the storefront through the category tile, the category filter and
 * the detail page.
 *
 * Every row it creates is removed again in afterAll. Products are hard-deleted
 * rather than archived because the API deliberately only offers a soft delete.
 */
describe('Admin product visibility (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  const tag = `e2e-vis-${Date.now().toString(36)}`;
  const password = 'e2e-password';
  const adminEmail = `${tag}@example.test`;
  const createdProductIds: string[] = [];
  const createdCategoryNames: string[] = [];

  const agent = () => request(app.getHttpServer());
  const asAdmin = (req: request.Test) =>
    req.set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    // register() always produces a CUSTOMER, so the admin row is written
    // directly. Cost is lowered because this is not testing bcrypt.
    await prisma.user.create({
      data: {
        firstName: 'E2E',
        lastName: 'Visibility',
        email: adminEmail,
        passwordHash: await bcrypt.hash(password, 4),
        role: 'ADMIN',
      },
    });

    const login = await agent()
      .post('/api/auth/login')
      .send({ email: adminEmail, password });
    expect(login.status).toBe(200);
    token = login.body.accessToken as string;
  });

  afterAll(async () => {
    if (prisma) {
      // ON DELETE CASCADE covers images, specs, reviews and inventory; order
      // items would block a hard delete, but this spec never creates an order.
      await prisma.product.deleteMany({
        where: { id: { in: createdProductIds.map(BigInt) } },
      });
      await prisma.category.deleteMany({
        where: { name: { in: createdCategoryNames } },
      });
      await prisma.user.deleteMany({ where: { email: adminEmail } });
    }
    await app?.close();
  });

  /** Creates a category through the admin API so `position` is assigned. */
  async function makeCategory(name: string) {
    createdCategoryNames.push(name);
    const res = await asAdmin(agent().post('/api/admin/categories'))
      .send({ name })
      .expect(201);
    return res.body as { id: string; name: string };
  }

  /** Only the fields these tests read back off the admin response. */
  interface AdminProduct {
    id: string;
    slug: string;
    status: string;
  }

  async function makeProduct(
    categoryId: string,
    overrides: Record<string, unknown> = {},
  ): Promise<AdminProduct> {
    const res = await asAdmin(agent().post('/api/admin/products'))
      .send({
        name: `Fixture ${tag} ${Math.random().toString(36).slice(2, 8)}`,
        sku: `${tag}-${Math.random().toString(36).slice(2, 10)}`,
        categoryId,
        price: 1000,
        brand: 'E2E',
        images: [{ url: 'https://example.com/fixture.jpg', isPrimary: true }],
        inventory: { quantity: 5 },
        ...overrides,
      })
      .expect(201);
    createdProductIds.push(res.body.id);
    return res.body as AdminProduct;
  }

  describe('a product an admin creates is visible to customers', () => {
    it('lands in the category the admin picked', async () => {
      const category = await makeCategory(`${tag} mice`);
      const product = await makeProduct(category.id);

      const list = await agent().get('/api/products?pageSize=100').expect(200);
      const found = list.body.items.find(
        (p: { id: string }) => p.id === product.id,
      );

      expect(found).toBeDefined();
      expect(found.category).toBe(category.name);
    });

    it('defaults to ACTIVE so it is not hidden on creation', async () => {
      const category = await makeCategory(`${tag} defaults`);
      const product = await makeProduct(category.id);

      expect(product.status).toBe('ACTIVE');
    });

    it('is reachable through ?category= on that category only', async () => {
      const mice = await makeCategory(`${tag} routed-mice`);
      const audio = await makeCategory(`${tag} routed-audio`);
      const product = await makeProduct(mice.id);

      const scoped = await agent()
        .get(`/api/products?category=${encodeURIComponent(mice.name)}`)
        .expect(200);
      expect(scoped.body.items.map((p: { id: string }) => p.id)).toContain(
        product.id,
      );

      const other = await agent()
        .get(`/api/products?category=${encodeURIComponent(audio.name)}`)
        .expect(200);
      expect(other.body.items.map((p: { id: string }) => p.id)).not.toContain(
        product.id,
      );
    });

    it('matches the category filter case-insensitively', async () => {
      const category = await makeCategory(`${tag} casing`);
      const product = await makeProduct(category.id);

      // The filter compares the whole name with `equals`, so this is the
      // category name lowercased rather than a substring of it.
      const lower = await agent()
        .get(
          `/api/products?category=${encodeURIComponent(category.name.toLowerCase())}`,
        )
        .expect(200);
      expect(lower.body.items.map((p: { id: string }) => p.id)).toContain(
        product.id,
      );
    });

    it('has a reachable detail page', async () => {
      const category = await makeCategory(`${tag} detail`);
      const product = await makeProduct(category.id, {
        inventory: { quantity: 7 },
      });

      const detail = await agent()
        .get(`/api/products/${product.slug}`)
        .expect(200);

      expect(detail.body.id).toBe(product.id);
      expect(detail.body.stock).toBe(7);
      expect(detail.body.inStock).toBe(true);
      expect(detail.body.stockLabel).toBe('In Stock');
      expect(Array.isArray(detail.body.specs)).toBe(true);
      expect(Array.isArray(detail.body.reviews)).toBe(true);
    });

    it('rejects a categoryId that does not exist', async () => {
      await asAdmin(agent().post('/api/admin/products'))
        .send({
          name: `Bad ${tag}`,
          sku: `${tag}-bad`,
          categoryId: '99999999',
          price: 1,
          images: [{ url: 'https://example.com/bad.jpg', isPrimary: true }],
          inventory: { quantity: 1 },
        })
        .expect(400);
    });
  });

  describe('status controls what a customer can see', () => {
    it('keeps an OUT_OF_STOCK product listed and labels it', async () => {
      const category = await makeCategory(`${tag} soldout`);
      const product = await makeProduct(category.id, {
        status: 'OUT_OF_STOCK',
        inventory: { quantity: 0 },
      });

      const list = await agent()
        .get(`/api/products?category=${encodeURIComponent(category.name)}`)
        .expect(200);
      const found = list.body.items.find(
        (p: { id: string }) => p.id === product.id,
      );

      // OUT_OF_STOCK means "listed but sold out", so it must stay on the
      // storefront carrying an Out of Stock label rather than disappearing.
      expect(found).toBeDefined();
      expect(found.inStock).toBe(false);
      expect(found.stockLabel).toBe('Out of Stock');
    });

    it('hides a DISCONTINUED product from customers', async () => {
      const category = await makeCategory(`${tag} archived`);
      const product = await makeProduct(category.id);

      await asAdmin(agent().delete(`/api/admin/products/${product.id}`)).expect(
        200,
      );

      const list = await agent()
        .get(`/api/products?category=${encodeURIComponent(category.name)}`)
        .expect(200);
      expect(list.body.items.map((p: { id: string }) => p.id)).not.toContain(
        product.id,
      );
    });
  });

  describe('category counts agree with what customers can open', () => {
    it('counts OUT_OF_STOCK but not DISCONTINUED products', async () => {
      const category = await makeCategory(`${tag} counting`);
      const visible = await makeProduct(category.id);
      const soldOut = await makeProduct(category.id, {
        status: 'OUT_OF_STOCK',
        inventory: { quantity: 0 },
      });
      const archived = await makeProduct(category.id);

      await asAdmin(
        agent().delete(`/api/admin/products/${archived.id}`),
      ).expect(200);

      const list = await agent()
        .get(`/api/products?category=${encodeURIComponent(category.name)}`)
        .expect(200);
      const facet = list.body.facets.categories.find(
        (c: { name: string }) => c.name === category.name,
      );
      const listedIds = list.body.items.map((p: { id: string }) => p.id);

      expect(listedIds).toContain(visible.id);
      expect(listedIds).toContain(soldOut.id);
      expect(listedIds).not.toContain(archived.id);
      // The tile figure is what a customer clicks through on, so it has to
      // match the number of products they will actually find.
      expect(facet.productCount).toBe(listedIds.length);
    });

    it('keeps the standalone /api/categories endpoint in step with the facets', async () => {
      const category = await makeCategory(`${tag} both-endpoints`);
      const product = await makeProduct(category.id);

      const standalone = await agent().get('/api/categories').expect(200);
      const fromStandalone = standalone.body.find(
        (c: { name: string }) => c.name === category.name,
      );
      const list = await agent()
        .get(`/api/products?category=${encodeURIComponent(category.name)}`)
        .expect(200);
      const fromFacets = list.body.facets.categories.find(
        (c: { name: string }) => c.name === category.name,
      );

      expect(fromStandalone.productCount).toBe(fromFacets.productCount);
      expect(fromStandalone.productCount).toBe(1);
      expect(list.body.items.map((p: { id: string }) => p.id)).toContain(
        product.id,
      );
    });
  });

  describe('admin-side counts still cover every product', () => {
    it('refuses to delete a category that only archived products point at', async () => {
      const category = await makeCategory(`${tag} guarded`);
      const product = await makeProduct(category.id);

      await asAdmin(agent().delete(`/api/admin/products/${product.id}`)).expect(
        200,
      );

      // The storefront count correctly drops to 0, but the row still has a
      // product referencing it, so the delete guard must still refuse.
      const publicList = await agent().get('/api/categories').expect(200);
      expect(
        publicList.body.find((c: { name: string }) => c.name === category.name)
          .productCount,
      ).toBe(0);

      await asAdmin(
        agent().delete(`/api/admin/categories/${category.id}`),
      ).expect(409);
    });
  });
});
