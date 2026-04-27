import { createLogger, defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import http from 'http';

const nonKeepAliveHttpAgent = new http.Agent({ keepAlive: false });
const backendDefaultProxyTarget = 'http://localhost:43210';
const frontendDefaultPort = 43211;
const proxyTimeoutMs = 120000;
const customViteLogger = createLogger();
const originalViteErrorLogger = customViteLogger.error.bind(customViteLogger);
const allowedHosts = [
  'localhost',
  '127.0.0.1',
  'unfactious-wen-nonsweating.ngrok-free.dev',
  '.ngrok-free.dev',
];

const normalizeProxyTarget = (target) => {
  if (typeof target !== 'string') {
    return '';
  }

  return target
    .trim()
    .replace(/\/api\/?$/i, '')
    .replace(/\/+$/, '');
};

const hasNestedErrorCode = (err, expectedCode) => {
  if (!err || typeof err !== 'object') {
    return false;
  }

  if (err.code === expectedCode) {
    return true;
  }

  if (
    Array.isArray(err.errors) &&
    err.errors.some((nestedErr) => hasNestedErrorCode(nestedErr, expectedCode))
  ) {
    return true;
  }

  return hasNestedErrorCode(err.cause, expectedCode);
};

const shouldSuppressViteProxyError = (msg, error) => {
  if (typeof msg !== 'string' || !msg.includes('http proxy error:')) {
    return false;
  }

  return hasNestedErrorCode(error, 'ECONNREFUSED') || msg.includes('ECONNREFUSED');
};

customViteLogger.error = (msg, options) => {
  if (shouldSuppressViteProxyError(msg, options?.error)) {
    return;
  }

  originalViteErrorLogger(msg, options);
};

const createProxyErrorHandler = (label, apiProxyTarget) => (err, req, res) => {
  // Suppress expected backend-down ECONNREFUSED noise, including AggregateError wrappers.
  if (!hasNestedErrorCode(err, 'ECONNREFUSED')) {
    console.warn(`[vite] ${label} proxy error:`, err.message, 'target=', apiProxyTarget);
  }

  if (
    !res ||
    typeof res.writeHead !== 'function' ||
    typeof res.end !== 'function' ||
    res.headersSent
  ) {
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
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget =
    normalizeProxyTarget(env.VITE_API_PROXY_TARGET) ||
    normalizeProxyTarget(env.VITE_API_URL) ||
    backendDefaultProxyTarget;

  return {
    customLogger: customViteLogger,
    plugins: [
      react({
        jsxRuntime: 'automatic',
        fastRefresh: true,
        // Explicit module detection for better plugin compatibility
        include: /src\/.*\.[jt]sx?$/,
        exclude: /node_modules/,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: frontendDefaultPort,
      strictPort: true,
      allowedHosts,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          agent: nonKeepAliveHttpAgent,
          timeout: proxyTimeoutMs,
          proxyTimeout: proxyTimeoutMs,
          configure: (proxy) => {
            proxy.on('error', createProxyErrorHandler('api', apiProxyTarget));
          },
        },
        '/storage': {
          target: apiProxyTarget,
          changeOrigin: true,
          agent: nonKeepAliveHttpAgent,
          timeout: proxyTimeoutMs,
          proxyTimeout: proxyTimeoutMs,
          configure: (proxy) => {
            proxy.on('error', createProxyErrorHandler('storage', apiProxyTarget));
          },
        },
        '/socket.io': {
          target: apiProxyTarget,
          changeOrigin: true,
          ws: true,
          agent: nonKeepAliveHttpAgent,
          timeout: proxyTimeoutMs,
          proxyTimeout: proxyTimeoutMs,
          configure: (proxy) => {
            proxy.on('error', createProxyErrorHandler('ws', apiProxyTarget));
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.js',
      include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    },
    define: {
      // Ensure moduleType is defined at transform time
      __VITE_MODULE_TYPE__: '"module"',
    },
  };
});
