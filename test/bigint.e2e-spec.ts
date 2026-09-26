import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from '../src/bootstrap.js';

@Controller('bigint-probe')
class BigIntProbeController {
  @Get()
  find() {
    return {
      id: 9007199254740993n,
      user: { id: 7n, email: 'probe@example.com' },
      ids: [1n, 2n],
      price: '19.99',
      active: true,
      missing: null,
    };
  }
}

describe('BigInt JSON serialization (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [BigIntProbeController],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  it('serializes BigInt values instead of throwing', async () => {
    const response = await request(app.getHttpServer())
      .get('/bigint-probe')
      .expect(200);

    expect(response.body).toEqual({
      id: '9007199254740993',
      user: { id: '7', email: 'probe@example.com' },
      ids: ['1', '2'],
      price: '19.99',
      active: true,
      missing: null,
    });
  });

  it('would have thrown without the replacer', () => {
    expect(() => JSON.stringify({ id: 1n })).toThrow(
      /Do not know how to serialize a BigInt/,
    );
  });

  afterAll(async () => {
    await app.close();
  });
});
