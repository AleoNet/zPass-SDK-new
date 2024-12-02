import { defineConfig } from 'vitest/config'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig({
  plugins: [wasm(), topLevelAwait()],
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**'
    ],
    deps: {
      inline: [/\.wasm/],
    },
    environment: 'node',
    browser: {
      enabled: true,
      name: 'chrome'
    }
  },
}) 