import { defineConfig } from 'tsup'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'esnext',
  loader: {
    '.wasm': 'copy'
  },
  async onSuccess() {
    const wasmDir = path.join(process.cwd(), 'wasm', 'pkg')
    const distDir = path.join(process.cwd(), 'dist')
    
    if (fs.existsSync(wasmDir)) {
      const wasmFiles = fs.readdirSync(wasmDir).filter(file => file.endsWith('.wasm'))
      
      for (const file of wasmFiles) {
        fs.copyFileSync(
          path.join(wasmDir, file),
          path.join(distDir, file)
        )
      }
    }
  }
})
