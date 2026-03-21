import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import http from 'http';

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:5001';
const nonKeepAliveHttpAgent = new http.Agent({ keepAlive: false });
const allowedHosts = [
  'localhost',
  '127.0.0.1',
  'unfactious-wen-nonsweating.ngrok-free.dev',
  '.ngrok-free.dev',
];

const createProxyErrorHandler = (label) => (err, req, res) => {
  console.warn(`[vite] ${label} proxy error:`, err.message, 'target=', apiProxyTarget);

  if (!res || res.headersSent) {
    return;
  }

  res.writeHead(503, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      success: false,
      error: {
        code: 'BACKEND_UNAVAILABLE',
        message: `Cannot reach backend at ${apiProxyTarget}. Ensure server is running.`,
      },
    }),
  );
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    allowedHosts,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        agent: nonKeepAliveHttpAgent,
        timeout: 15000,
        proxyTimeout: 15000,
        configure: (proxy) => {
          proxy.on('error', createProxyErrorHandler('api'));
        },
      },
      '/socket.io': {
        target: apiProxyTarget,
        changeOrigin: true,
        ws: true,
        agent: nonKeepAliveHttpAgent,
        timeout: 15000,
        proxyTimeout: 15000,
        configure: (proxy) => {
          proxy.on('error', createProxyErrorHandler('ws'));
        },
      },
    },
  },
});
