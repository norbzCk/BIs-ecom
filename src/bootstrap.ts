import type { INestApplication } from '@nestjs/common';
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

  return app;
}
