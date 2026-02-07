import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 3010,
    strictPort: true,
    allowedHosts: true
  },
  preview: {
    port: 3011,
    strictPort: true
  }
});
