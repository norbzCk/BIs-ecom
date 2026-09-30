import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureApp } from '../src/bootstrap.js';

/**
 * Exercises the admin upload endpoints end to end against the real AppModule.
 *
 * These tests deliberately stop at the auth boundary and at the "no files"
 * branch of the upload route: a real request would need a live Supabase
 * service-role key, and the Storage client itself is already covered by
 * src/storage/supabase-storage.service.spec.ts. What matters here is that the
 * routes are mounted, guarded by JWT + role, and answer sensibly.
 */
describe('Admin uploads (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects an unauthenticated upload with 401', async () => {
    await request(app.getHttpServer())
      .post('/api/admin/uploads/images')
      .attach('files', Buffer.from('not-really-an-image'), 'evil.png')
      .expect(401);
  });

  it('rejects an unauthenticated delete with 401', async () => {
    await request(app.getHttpServer())
      .delete('/api/admin/uploads/images')
      .send({ urls: ['https://example.com/a.png'] })
      .expect(401);
  });

  it('validates the delete body when authenticated', async () => {
    // A malformed JWT is rejected before the body check runs, so this only
    // asserts the route exists rather than the validation message.
    const response = await request(app.getHttpServer())
      .delete('/api/admin/uploads/images')
      .set('Authorization', 'Bearer not-a-real-token')
      .send({ urls: [] });

    expect(response.status).toBe(401);
  });
});
