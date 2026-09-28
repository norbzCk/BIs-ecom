import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { bigintJsonReplacer } from './common/serialization/bigint-json-replacer.js';

interface ReplacerCapableAdapter {
  set?(key: string, value: unknown): void;
}

/**
 * Applies app-wide settings that must also be present in tests. Keep this in
 * one place so a test boots the exact same app configuration as production.
 */
export function configureApp(app: INestApplication): INestApplication {
  const adapter = app.getHttpAdapter().getInstance() as ReplacerCapableAdapter;

  if (typeof adapter.set === 'function') {
    adapter.set('json replacer', bigintJsonReplacer);
  }

  // Every route lives under /api so the apps/web dev proxy can forward /api/*
  // straight through without a rewrite.
  app.setGlobalPrefix('api');

  // No `enableImplicitConversion` on purpose: it coerces by the TypeScript
  // type, so an object sent for a string field becomes the text
  // "[object Object]" and passes @IsString(). Fields that legitimately arrive
  // as strings but need a number (query params, form prices) opt in with an
  // explicit @Type(() => Number) instead.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({ origin: corsOrigins, credentials: true });

  return app;
}
