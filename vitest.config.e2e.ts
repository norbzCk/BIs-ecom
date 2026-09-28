import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Loads .env so PrismaService can read DATABASE_URL outside main.ts.
    setupFiles: ['./test/setup.ts'],
    // These specs boot the real AppModule and hit DATABASE_URL, which is a
    // remote pooler — a cold pool pays full TLS + auth over the internet and
    // easily exceeds vitest's 5s default.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
