import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  /** Dev server + `vite preview`: forward API paths to this host (not the SPA root — that may 404). */
  const apiTarget = (
    env.VITE_API_PROXY_TARGET ||
    env.VITE_API_ORIGIN ||
    'http://localhost:5000'
  ).replace(/\/$/, '')

  const proxy = {
    '/apimobile': { target: apiTarget, changeOrigin: true, secure: true },
    '/api': { target: apiTarget, changeOrigin: true, secure: true },
    /** Socket.IO (rider trip tracking `subscribe-ride` + `driver-location-for-ride`) */
    '/socket.io': { target: apiTarget, changeOrigin: true, secure: true, ws: true },
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5180,
      proxy,
    },
    /** Without this, `vite preview` has no proxy and `/apimobile/*` 404s on the preview origin. */
    preview: {
      port: 4173,
      proxy,
    },
  }
})
