import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Root-level GitHub Pages site (crackthecircuit.github.io), so base stays '/'.
export default defineConfig({
  plugins: [react()],
  base: '/',
  test: {
    include: ['src/**/*.test.ts'],
  },
});
