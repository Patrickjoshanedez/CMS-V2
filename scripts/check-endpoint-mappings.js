const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SERVER_APP_PATH = path.join(ROOT, 'server', 'app.js');
const CLIENT_SRC_PATH = path.join(ROOT, 'client', 'src');
const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);

function toPosix(input) {
  return input.split(path.sep).join('/');
}

function toRelative(filePath) {
  return toPosix(path.relative(ROOT, filePath));
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function normalizePath(rawPath, options = {}) {
  if (!rawPath || typeof rawPath !== 'string') {
    return null;
  }

  const { isClientApiCall = false } = options;

  let normalized = rawPath.trim();
  if (!normalized) {
    return null;
  }

  normalized = normalized.replace(/\$\{[^}]+\}/g, ':param');

  if (/^https?:\/\//i.test(normalized)) {
    try {
      normalized = new URL(normalized).pathname;
    } catch {
      return null;
    }
  }

  normalized = normalized.split('?')[0].split('#')[0];

  if (isClientApiCall) {
    if (!normalized.startsWith('/api')) {
      if (normalized.startsWith('/')) {
        normalized = `/api${normalized}`;
      } else {
        normalized = `/api/${normalized}`;
      }
    }
  }

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  normalized = normalized.replace(/\/{2,}/g, '/');

  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

function joinPaths(basePath, routePath) {
  const base = normalizePath(basePath);
  const route = normalizePath(routePath);

  if (!base || !route) {
    return null;
  }

  if (route === '/') {
    return base;
  }

  return normalizePath(`${base.replace(/\/$/, '')}/${route.replace(/^\//, '')}`);
}

function listFilesRecursive(dirPath, extensions) {
  const files = [];

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath, extensions));
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (extensions.has(ext)) {
      files.push(fullPath);
    }
  }

  return files;
}

function parseRouterEndpoints(routerFilePath, mountPath) {
  const content = readText(routerFilePath);
  const source = toRelative(routerFilePath);
  const endpoints = [];
  const routeRegex = /router\.(get|post|put|patch|delete|options|head)\s*\(\s*(["'`])([^"'`]+)\2/gi;

  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const routePath = match[3];
    const fullPath = joinPaths(mountPath, routePath);

    if (!fullPath) {
      continue;
    }

    endpoints.push({ method, path: fullPath, source });
  }

  return endpoints;
}

function parseServerEndpoints() {
  const appContent = readText(SERVER_APP_PATH);
  const appDir = path.dirname(SERVER_APP_PATH);
  const importMap = new Map();
  const endpoints = [];

  const importRegex = /import\s+([A-Za-z_$][\w$]*)\s+from\s+['"](.+?)['"];/g;
  let importMatch;
  while ((importMatch = importRegex.exec(appContent)) !== null) {
    const variableName = importMatch[1];
    const importPath = importMatch[2];
    if (!importPath.includes('.routes')) {
      continue;
    }

    const absolutePath = path.resolve(appDir, importPath);
    importMap.set(variableName, absolutePath);
  }

  const appRouteRegex = /app\.(get|post|put|patch|delete|options|head)\s*\(\s*(["'`])([^"'`]+)\2/gi;
  let appRouteMatch;
  while ((appRouteMatch = appRouteRegex.exec(appContent)) !== null) {
    const method = appRouteMatch[1].toUpperCase();
    const fullPath = normalizePath(appRouteMatch[3]);

    if (!fullPath || !fullPath.startsWith('/api')) {
      continue;
    }

    endpoints.push({
      method,
      path: fullPath,
      source: toRelative(SERVER_APP_PATH),
    });
  }

  const mountRegex = /app\.use\s*\(\s*(["'`])([^"'`]+)\1\s*,\s*([A-Za-z_$][\w$]*)\s*\)/g;
  let mountMatch;
  while ((mountMatch = mountRegex.exec(appContent)) !== null) {
    const mountPath = normalizePath(mountMatch[2]);
    const routerVar = mountMatch[3];
    const routerPath = importMap.get(routerVar);

    if (!mountPath || !mountPath.startsWith('/api') || !routerPath || !fs.existsSync(routerPath)) {
      continue;
    }

    endpoints.push(...parseRouterEndpoints(routerPath, mountPath));
  }

  return dedupe(endpoints, (entry) => `${entry.method} ${entry.path}`);
}

function inferFetchMethod(sourceSnippet) {
  const methodMatch = /method\s*:\s*(?:`([^`]+)`|'([^']+)'|"([^"]+)")/i.exec(sourceSnippet);
  const rawMethod = methodMatch ? methodMatch[1] || methodMatch[2] || methodMatch[3] : 'GET';
  const method = String(rawMethod || 'GET').toUpperCase();
  return HTTP_METHODS.has(method) ? method : 'GET';
}

function parseClientEndpoints() {
  const extensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
  const files = listFilesRecursive(CLIENT_SRC_PATH, extensions);
  const endpoints = [];

  const apiRegex = /\bapi\.(get|post|put|patch|delete)\s*\(\s*(?:`([^`]+)`|'([^']+)'|"([^"]+)")/gi;
  const fetchRegex = /\bfetch\s*\(\s*(?:`([^`]+)`|'([^']+)'|"([^"]+)")/gi;

  for (const filePath of files) {
    const content = readText(filePath);
    const source = toRelative(filePath);

    let apiMatch;
    while ((apiMatch = apiRegex.exec(content)) !== null) {
      const method = apiMatch[1].toUpperCase();
      const rawPath = apiMatch[2] || apiMatch[3] || apiMatch[4];
      const fullPath = normalizePath(rawPath, { isClientApiCall: true });

      if (!fullPath) {
        continue;
      }

      endpoints.push({ method, path: fullPath, source });
    }

    let fetchMatch;
    while ((fetchMatch = fetchRegex.exec(content)) !== null) {
      const rawPath = fetchMatch[1] || fetchMatch[2] || fetchMatch[3];
      const fullPath = normalizePath(rawPath);

      if (!fullPath || !fullPath.startsWith('/api')) {
        continue;
      }

      const snippet = content.slice(fetchMatch.index, fetchMatch.index + 600);
      const method = inferFetchMethod(snippet);
      endpoints.push({ method, path: fullPath, source });
    }
  }

  return endpoints;
}

function dedupe(items, keyFn) {
  const seen = new Set();
  const deduped = [];

  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

function tokenized(pathValue) {
  return pathValue.split('/').filter(Boolean);
}

function isDynamicSegment(segment) {
  return segment.startsWith(':');
}

function pathsMatch(serverPath, clientPath) {
  const serverParts = tokenized(serverPath);
  const clientParts = tokenized(clientPath);

  if (serverParts.length !== clientParts.length) {
    return false;
  }

  for (let i = 0; i < serverParts.length; i += 1) {
    if (serverParts[i] === clientParts[i]) {
      continue;
    }
    if (isDynamicSegment(serverParts[i]) || isDynamicSegment(clientParts[i])) {
      continue;
    }
    return false;
  }

  return true;
}

function endpointExists(serverEndpoints, clientEndpoint) {
  return serverEndpoints.some(
    (serverEndpoint) =>
      serverEndpoint.method === clientEndpoint.method &&
      pathsMatch(serverEndpoint.path, clientEndpoint.path),
  );
}

function main() {
  const serverEndpoints = parseServerEndpoints();
  const clientEndpoints = parseClientEndpoints();

  const clientUniqueByEndpoint = dedupe(
    clientEndpoints,
    (entry) => `${entry.method} ${entry.path}`,
  );
  const clientEntries = dedupe(
    clientEndpoints,
    (entry) => `${entry.method} ${entry.path} :: ${entry.source}`,
  );

  const unmatched = clientEntries
    .filter((entry) => !endpointExists(serverEndpoints, entry))
    .sort((a, b) => {
      if (a.method !== b.method) return a.method.localeCompare(b.method);
      if (a.path !== b.path) return a.path.localeCompare(b.path);
      return a.source.localeCompare(b.source);
    });

  console.log(`SERVER_ENDPOINT_COUNT=${serverEndpoints.length}`);
  console.log(`CLIENT_ENDPOINT_COUNT=${clientUniqueByEndpoint.length}`);
  console.log(`UNMATCHED_COUNT=${unmatched.length}`);

  for (const entry of unmatched) {
    console.log(`${entry.method} ${entry.path} :: ${entry.source}`);
  }

  process.exitCode = unmatched.length > 0 ? 1 : 0;
}

try {
  main();
} catch (error) {
  console.error('Failed to check endpoint mappings.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
