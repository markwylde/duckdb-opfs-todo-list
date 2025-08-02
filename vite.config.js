import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
  server: {
    https: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  build: {
    target: 'esnext'
  },
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm']
  },
  plugins: [
    mkcert()
  ]
});