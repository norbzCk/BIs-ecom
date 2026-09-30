import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json. Vite handles this
  // natively, so the vite-tsconfig-paths plugin is no longer needed.
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // Tool worktrees hold stale copies of src/ that would otherwise be
      // collected as if they were the project's own specs.
      '**/.kilo/**',
      '**/.opencode/**',
    ],
    // bcryptjs is pure JS: 12 rounds costs ~7s per hash and blows the 5s
    // default timeout. Production still uses 12 (see auth.service.ts).
    env: { SALT_ROUNDS: '4' },
  },
});
