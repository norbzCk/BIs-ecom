import { Global, type INestApplication, Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service.js';
import { configureApp } from '../bootstrap.js';
import { AdminModule } from './admin.module.js';
import { ProductsModule } from '../products/products.module.js';

// AuthModule reads JWT_SECRET while the module graph is being loaded, so it
// has to exist before any of the imports above are evaluated.
vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-secret-for-admin-http-spec';
});

function decimal(value: number) {
  return { toNumber: () => value };
}

function buildProductRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1n,
    sku: 'NB-APEX15-PRO',
    name: 'Billionare Apex-15 Pro',
    slug: 'billionare-apex-15-pro',
    brand: 'Billionare',
    model: 'Apex-15 Pro',
    description: 'A workstation laptop.',
    price: decimal(1699),
    compareAtPrice: null,
    rating: null,
    reviewCount: 0,
    badge: null,
    featured: false,
    releasedAt: null,
    highlights: [],
    status: 'ACTIVE',
    category: { id: 2n, name: 'Computers & Laptops' },
    images: [{ imageUrl: 'https://example.com/1.jpg', isPrimary: true }],
    specifications: [{ name: 'CPU', value: 'Intel Core i9' }],
    reviews: [],
    inventory: { quantity: 10, reserved: 0 },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

const validBody = {
  name: 'Billionare Apex-15 Pro',
  sku: 'NB-APEX15-PRO',
  categoryId: '2',
  price: 1699,
  brand: 'Billionare',
  model: 'Apex-15 Pro',
  description: 'A workstation laptop.',
  images: [{ url: 'https://example.com/1.jpg', isPrimary: true }],
  specifications: [{ name: 'CPU', value: 'Intel Core i9' }],
  inventory: { quantity: 10 },
};

describe('Admin products (HTTP)', () => {
  let app: INestApplication;
  let adminToken: string;
  let customerToken: string;

  const prismaMock = {
    $transaction: vi.fn(),
    product: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
    user: { findUnique: vi.fn(), create: vi.fn() },
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  @Global()
  @Module({
    providers: [{ provide: PrismaService, useValue: prismaMock }],
    exports: [PrismaService],
  })
  class MockPrismaModule {}

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MockPrismaModule, AdminModule, ProductsModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const jwt = app.get(JwtService, { strict: false });
    adminToken = await jwt.signAsync({
      sub: '1',
      email: 'admin@x.com',
      role: 'ADMIN',
    });
    customerToken = await jwt.signAsync({
      sub: '2',
      email: 'cust@x.com',
      role: 'CUSTOMER',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('routing and auth', () => {
    it('serves the admin routes under the global /api prefix only', async () => {
      await request(app.getHttpServer()).get('/admin/products').expect(404);
      await request(app.getHttpServer()).get('/api/admin/products').expect(401);
    });

    it('rejects a request with no token (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/admin/products')
        .send(validBody)
        .expect(401);
    });

    it('rejects a customer token (403)', async () => {
      await request(app.getHttpServer())
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(validBody)
        .expect(403);
      expect(prismaMock.product.create).not.toHaveBeenCalled();
    });

    it('rejects a customer token on the list endpoint too (403)', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('rejects a tampered token (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}x`)
        .expect(401);
    });
  });

  describe('POST /api/admin/products — validation', () => {
    const post = (body: unknown) =>
      request(app.getHttpServer())
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(body as object);

    it('reports every missing required field', async () => {
      const res = await post({}).expect(400);
      const messages: string[] = res.body.message;

      for (const field of [
        'name',
        'sku',
        'categoryId',
        'price',
        'images',
        'inventory',
      ]) {
        expect(messages.some((m) => m.includes(field))).toBe(true);
      }
      expect(prismaMock.product.create).not.toHaveBeenCalled();
    });

    it('requires at least one image', async () => {
      const res = await post({ ...validBody, images: [] }).expect(400);
      expect(res.body.message).toContain(
        'At least one product image is required',
      );
    });

    it('validates nested image URLs', async () => {
      const res = await post({
        ...validBody,
        images: [{ url: 'not a url' }],
      }).expect(400);
      expect(res.body.message.join(' ')).toMatch(/valid URL/);
    });

    it('validates nested specification entries', async () => {
      const res = await post({
        ...validBody,
        specifications: [{ name: '', value: 'x' }],
      }).expect(400);
      expect(res.body.message.join(' ')).toMatch(/specifications/);
    });

    it('rejects a negative starting stock quantity', async () => {
      await post({ ...validBody, inventory: { quantity: -1 } }).expect(400);
    });

    it('returns 400 (not a 500) when inventory is omitted entirely', async () => {
      const { inventory: _omitted, ...withoutInventory } = validBody;

      const res = await post(withoutInventory).expect(400);

      expect(res.body.message.join(' ')).toMatch(/inventory/);
      expect(prismaMock.product.create).not.toHaveBeenCalled();
    });

    it('returns 400 when inventory is not an object', async () => {
      await post({ ...validBody, inventory: 10 }).expect(400);
    });

    it('returns 400 when inventory.quantity is missing', async () => {
      await post({ ...validBody, inventory: {} }).expect(400);
    });

    it('rejects a non-positive price', async () => {
      await post({ ...validBody, price: 0 }).expect(400);
    });

    it('rejects an invalid status value', async () => {
      await post({ ...validBody, status: 'SOLD_OUT' }).expect(400);
    });

    it('rejects unknown fields (forbidNonWhitelisted)', async () => {
      const res = await post({ ...validBody, isAdminOverride: true }).expect(
        400,
      );
      expect(res.body.message.join(' ')).toMatch(/isAdminOverride/);
    });
  });

  describe('POST /api/admin/products — success', () => {
    it('creates a product and returns JSON-safe ids', async () => {
      prismaMock.category.findUnique.mockResolvedValue({
        id: 2n,
        name: 'Computers & Laptops',
      });
      prismaMock.product.findUnique.mockResolvedValue(null);
      prismaMock.product.create.mockResolvedValue(buildProductRow());

      const res = await request(app.getHttpServer())
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validBody)
        .expect(201);

      expect(res.body.id).toBe('1');
      expect(res.body.category).toEqual({
        id: '2',
        name: 'Computers & Laptops',
      });
      expect(res.body.price).toBe(1699);
      expect(res.body.inventory).toEqual({ quantity: 10, reserved: 0 });
      expect(prismaMock.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sku: 'NB-APEX15-PRO',
            slug: 'billionare-apex-15-pro',
            categoryId: 2n,
            status: 'ACTIVE',
            inventory: { create: { quantity: 10 } },
          }),
        }),
      );
    });

    it('coerces a numeric-string price from a form submission', async () => {
      prismaMock.category.findUnique.mockResolvedValue({
        id: 2n,
        name: 'Computers & Laptops',
      });
      prismaMock.product.findUnique.mockResolvedValue(null);
      prismaMock.product.create.mockResolvedValue(buildProductRow());

      await request(app.getHttpServer())
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validBody, price: '1699.00' })
        .expect(201);

      expect(prismaMock.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ price: 1699 }),
        }),
      );
    });

    it('returns 409 when the SKU is already taken', async () => {
      prismaMock.category.findUnique.mockResolvedValue({
        id: 2n,
        name: 'Computers & Laptops',
      });
      prismaMock.product.findUnique.mockResolvedValue(null);
      prismaMock.product.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['sku'] },
      });

      const res = await request(app.getHttpServer())
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validBody)
        .expect(409);

      expect(res.body.message).toMatch(/SKU/);
    });

    it('returns 400 when the category does not exist', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validBody)
        .expect(400);
    });
  });

  describe('admin categories', () => {
    const asAdmin = (req: request.Test) =>
      req.set('Authorization', `Bearer ${adminToken}`);
    const categoryRow = (overrides: Record<string, unknown> = {}) => ({
      id: 3n,
      name: 'Mechanical Keyboards',
      description: null,
      _count: { products: 0 },
      ...overrides,
    });

    beforeEach(() => {
      prismaMock.category.findFirst.mockResolvedValue(null);
    });

    it('requires a token (401) and an admin role (403)', async () => {
      await request(app.getHttpServer())
        .post('/api/admin/categories')
        .send({ name: 'X' })
        .expect(401);
      await request(app.getHttpServer())
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ name: 'X' })
        .expect(403);
      expect(prismaMock.category.create).not.toHaveBeenCalled();
    });

    it('creates a category, trimming surrounding whitespace from the name', async () => {
      prismaMock.category.create.mockResolvedValue(categoryRow());

      const res = await asAdmin(
        request(app.getHttpServer()).post('/api/admin/categories'),
      )
        .send({ name: '  Mechanical Keyboards  ' })
        .expect(201);

      expect(prismaMock.category.create).toHaveBeenCalledWith({
        data: { name: 'Mechanical Keyboards', description: undefined },
      });
      expect(res.body).toEqual({
        id: '3',
        name: 'Mechanical Keyboards',
        description: null,
        productCount: 0,
      });
    });

    it.each([
      ['missing', {}],
      ['empty', { name: '' }],
      ['whitespace-only', { name: '   ' }],
      ['too long', { name: 'x'.repeat(101) }],
      ['not a string', { name: 42 }],
    ])('rejects a %s name (400)', async (_label, body) => {
      await asAdmin(request(app.getHttpServer()).post('/api/admin/categories'))
        .send(body)
        .expect(400);
      expect(prismaMock.category.create).not.toHaveBeenCalled();
    });

    it('rejects unknown fields (400)', async () => {
      await asAdmin(request(app.getHttpServer()).post('/api/admin/categories'))
        .send({ name: 'Audio', slug: 'audio' })
        .expect(400);
    });

    it('returns 409 for a duplicate name', async () => {
      prismaMock.category.findFirst.mockResolvedValue(
        categoryRow({ name: 'Audio' }),
      );

      const res = await asAdmin(
        request(app.getHttpServer()).post('/api/admin/categories'),
      )
        .send({ name: 'audio' })
        .expect(409);

      expect(res.body.message).toMatch(/already exists/);
    });

    it('returns 409 when deleting a category that still has products', async () => {
      prismaMock.category.findUnique.mockResolvedValue(
        categoryRow({ _count: { products: 3 } }),
      );

      const res = await asAdmin(
        request(app.getHttpServer()).delete('/api/admin/categories/3'),
      ).expect(409);

      expect(res.body.message).toMatch(/3 product\(s\) still use it/);
      expect(prismaMock.category.delete).not.toHaveBeenCalled();
    });

    it('deletes an empty category', async () => {
      prismaMock.category.findUnique.mockResolvedValue(categoryRow());
      prismaMock.category.delete.mockResolvedValue(categoryRow());

      await asAdmin(
        request(app.getHttpServer()).delete('/api/admin/categories/3'),
      ).expect(200);
      expect(prismaMock.category.delete).toHaveBeenCalledWith({
        where: { id: 3n },
      });
    });

    it('returns 404 when renaming an unknown category', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await asAdmin(
        request(app.getHttpServer()).patch('/api/admin/categories/99'),
      )
        .send({ name: 'New' })
        .expect(404);
    });
  });

  describe('type strictness (no implicit conversion)', () => {
    it.each([
      ['an object', {}],
      ['an array', ['x']],
      ['a number', 42],
      ['a boolean', true],
    ])(
      'rejects %s sent for the product name instead of coercing it to text',
      async (_l, name) => {
        await request(app.getHttpServer())
          .post('/api/admin/products')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ ...validBody, name })
          .expect(400);
        expect(prismaMock.product.create).not.toHaveBeenCalled();
      },
    );

    it('rejects an object sent for a registration name (auth DTOs are covered too)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          firstName: {},
          lastName: 'Doe',
          email: 'a@b.com',
          password: 'password123',
        })
        .expect(400);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });
  });

  describe('public GET /api/products query parsing', () => {
    beforeEach(() => {
      // findMany batches two queries: a 2-op transaction for the page of
      // products and a 3-op one for the brand/category/price facets. Dispatching
      // on the operation count keeps this working no matter how many requests
      // a test makes, and survives requests rejected before the service runs.
      prismaMock.$transaction.mockReset();
      prismaMock.$transaction.mockImplementation((ops: unknown[]) =>
        Promise.resolve(
          ops.length === 3
            ? [[], [], { _min: { price: null }, _max: { price: null } }]
            : [[], 0],
        ),
      );
    });

    // The product page is the first findMany call; the facets query reuses
    // findMany afterwards, so the last call is not the one under test.
    const pageQueryArgs = () =>
      prismaMock.product.findMany.mock.calls[0]?.[0] as {
        skip: number;
        take: number;
        orderBy: unknown;
        where: { price?: { gte?: number; lte?: number } };
      };

    it('still converts numeric query-string params to numbers', async () => {
      await request(app.getHttpServer())
        .get(
          '/api/products?page=3&pageSize=5&minPrice=10&maxPrice=500&sort=price_asc',
        )
        .expect(200);

      const args = pageQueryArgs();
      expect(args.skip).toBe(10); // (page 3 - 1) * pageSize 5
      expect(args.take).toBe(5);
      expect(args.orderBy).toEqual([{ price: 'asc' }]);
      expect(args.where.price).toEqual({ gte: 10, lte: 500 });
    });

    it('applies defaults when no params are given', async () => {
      await request(app.getHttpServer()).get('/api/products').expect(200);

      const args = pageQueryArgs();
      expect(args.skip).toBe(0);
      expect(args.take).toBe(12);
    });

    it('returns the filter facets alongside the page', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/products')
        .expect(200);

      expect(res.body.facets).toEqual({
        brands: [],
        categories: [],
        priceRange: { min: 0, max: 0 },
      });
    });

    it('only treats featured=true as a featured filter', async () => {
      await request(app.getHttpServer())
        .get('/api/products?featured=true')
        .expect(200);
      expect(pageQueryArgs().where).toMatchObject({ featured: true });

      prismaMock.product.findMany.mockClear();
      await request(app.getHttpServer())
        .get('/api/products?featured=false')
        .expect(200);
      expect(pageQueryArgs().where).toMatchObject({ featured: false });
    });

    it.each([
      'page=abc',
      'page=0',
      'pageSize=101',
      'minPrice=-5',
      'sort=random',
      'featured=maybe',
    ])('rejects invalid query "%s" with 400', async (qs) => {
      await request(app.getHttpServer()).get(`/api/products?${qs}`).expect(400);
    });
  });

  describe('other admin routes', () => {
    it('lists products for an admin', async () => {
      prismaMock.$transaction.mockResolvedValue([[buildProductRow()], 1]);

      const res = await request(app.getHttpServer())
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.total).toBe(1);
      expect(res.body.items[0]).toMatchObject({
        id: '1',
        sku: 'NB-APEX15-PRO',
        stockQuantity: 10,
      });
    });

    it('returns 404 for an unknown product id', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/api/admin/products/999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('returns 400 for a malformed product id', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/products/abc')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('archives (soft-deletes) a product', async () => {
      prismaMock.product.findUnique.mockResolvedValue(buildProductRow());
      prismaMock.product.update.mockResolvedValue(
        buildProductRow({ status: 'DISCONTINUED' }),
      );

      const res = await request(app.getHttpServer())
        .delete('/api/admin/products/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe('DISCONTINUED');
    });
  });
});
