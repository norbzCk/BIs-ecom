import {
  Body,
  Controller,
  Get,
  type INestApplication,
  Post,
  Query,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import request from 'supertest';
import { configureApp } from './bootstrap.js';

class NameDto {
  @IsString()
  name!: string;
}

class PageQueryDto {
  // Query strings are always strings, so numbers must opt in explicitly.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

@Controller('probe')
class ProbeController {
  @Post()
  create(@Body() dto: NameDto) {
    return { name: dto.name };
  }

  @Get()
  list(@Query() query: PageQueryDto) {
    return { page: query.page, type: typeof query.page };
  }
}

describe('configureApp — global ValidationPipe', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves routes under the /api prefix', async () => {
    await request(app.getHttpServer())
      .post('/api/probe')
      .send({ name: 'ok' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/probe')
      .send({ name: 'ok' })
      .expect(404);
  });

  // Regression: with `enableImplicitConversion` these were coerced to the text
  // "[object Object]" / "42" / "true" and passed @IsString().
  it.each([
    ['an object', {}],
    ['an array', ['x']],
    ['a number', 42],
    ['a boolean', true],
    ['null', null],
  ])(
    'rejects %s sent for a string field instead of coercing it',
    async (_label, name) => {
      await request(app.getHttpServer())
        .post('/api/probe')
        .send({ name })
        .expect(400);
    },
  );

  it('rejects unknown properties', async () => {
    await request(app.getHttpServer())
      .post('/api/probe')
      .send({ name: 'ok', extra: 1 })
      .expect(400);
  });

  it('still converts a numeric query string when the field opts in with @Type', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/probe?page=3')
      .expect(200);

    expect(res.body).toEqual({ page: 3, type: 'number' });
  });

  it('rejects a non-numeric value for an opted-in numeric query param', async () => {
    await request(app.getHttpServer()).get('/api/probe?page=abc').expect(400);
  });
});
