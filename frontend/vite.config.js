import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8000'
  const wsTarget = env.VITE_WS_PROXY_TARGET || apiTarget.replace(/^http/i, 'ws')

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 3001,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
        '/ws': {
          target: wsTarget,
          ws: true,
          changeOrigin: true,
          secure: false,
        }
      },
      allowedHosts: true,
    },
    build: {
      assetsDir: 'static'
    }
  }
})
