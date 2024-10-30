import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  // Copy WASM files to dist
  async onSuccess() {
    const { copyFile, mkdir } = require('fs/promises')
    const { join } = require('path')
    
    try {
      await mkdir(join(__dirname, 'dist/wasm/pkg'), { recursive: true })
      await copyFile(
        join(__dirname, 'wasm/pkg/index_bg.wasm'),
        join(__dirname, 'dist/wasm/pkg/index_bg.wasm')
      )
    } catch (err) {
      console.error('Error copying WASM files:', err)
    }
  }
})
