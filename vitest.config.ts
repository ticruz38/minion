import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/redis-subscriber.spec.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    // Ensure .js extensions are properly resolved for ESM imports
    alias: {
      '$lib': './src/lib',
    },
  },
});
