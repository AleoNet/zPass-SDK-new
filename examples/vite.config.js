import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import commonjs from '@rollup/plugin-commonjs';

export default defineConfig({
  plugins: [react(), commonjs(), wasm({
    strict: false,
    webWorkerPattern: /\.worker\.js$/,
    maxFileSize: 10000000,
  }), topLevelAwait()],
  optimizeDeps: {
    exclude: ["@provablehq/wasm", "@provablehq/sdk", "zpass-sdk"],
    include: [],
    esbuildOptions: {
      mainFields: ['module', 'main'],
      format: 'esm',
      target: 'esnext',
      supported: { 
        bigint: true 
      },
      loader: {
        '.wasm': 'binary'
      }
    }
  },
  resolve: {
    alias: {
      'core-js': 'core-js'
    }
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  }
});
