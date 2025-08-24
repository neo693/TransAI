import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    name: 'cross-browser',
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/test/cross-browser-simple.test.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/utils/browser-detection.ts'],
      exclude: ['src/test/**']
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
  },
})