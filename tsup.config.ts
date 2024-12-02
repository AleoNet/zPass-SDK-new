import { defineConfig } from 'tsup'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'esnext',
})
