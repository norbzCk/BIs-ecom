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
  },
});
