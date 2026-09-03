import express from 'express';
import http from 'http';
import net from 'net';
import path from 'path';
import { spawn } from 'child_process';
import { createReadStream, promises as fs } from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';

import { aosTelemetry } from './local-ai-provider.js';

const TELEMETRY_PORT = 4000;
const DASHBOARD_PORT = 3000;
const DASHBOARD_URL = `http://localhost:${DASHBOARD_PORT}`;
const TELEMETRY_URL = `http://localhost:${TELEMETRY_PORT}`;

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(MODULE_DIR, '..');
const DASHBOARD_DIR = path.join(ROOT_DIR, 'dashboard-ui');
const LESSONS_DIR = path.join(ROOT_DIR, 'memories', 'repo', 'lessons');
const STATE_CANDIDATES = [
  path.join(ROOT_DIR, '.github', 'hooks', 'state', 'decision_coherence_report.json'),
  path.join(ROOT_DIR, '.github', 'hooks', 'state', 'agent_prefetch_registry.json'),
  path.join(ROOT_DIR, '.github', 'hooks', 'state', 'agent_communication_dag.json'),
  path.join(ROOT_DIR, '.github', 'hooks', 'state', 'decision_coherence_report.log'),
  path.join(ROOT_DIR, '.github', 'hooks', 'state', 'telemetry.log'),
  path.join(ROOT_DIR, 'orchestrator', 'state', 'decision_coherence_report.json'),
  path.join(ROOT_DIR, 'orchestrator', 'state', 'telemetry.log'),
];

let ioInstance = null;
let startPromise = null;
let requestStreamAttached = false;

function toRelativeDisplay(filePath) {
  return path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
}

async function isPortOpen(port) {
  return await new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });

    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.once('error', () => {
      resolve(false);
    });

    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForPort(port, timeoutMs = 20000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isPortOpen(port)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return false;
}

async function openDashboard(url) {
  if (process.env.AOS_CONTROL_PLANE_NO_BROWSER === 'true') {
    return;
  }

  try {
    const openModule = await import('open');
    const open = openModule.default ?? openModule;
    await open(url);
    return;
  } catch {
    // Fall back to native launcher when the optional package is absent.
  }

  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
    return;
  }

  if (process.platform === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    return;
  }

  spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
}

async function resolveLatestStateFile() {
  for (const candidate of STATE_CANDIDATES) {
    try {
      const stats = await fs.stat(candidate);
      if (stats.isFile()) {
        return candidate;
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function readLastLines(filePath, maxLines = 100) {
  const ring = [];
  const stream = createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    ring.push(line);
    if (ring.length > maxLines) {
      ring.shift();
    }
  }

  return ring;
}

function summarizeMarkdown(content) {
  const normalized = String(content ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\r/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized.length <= 220) {
    return normalized;
  }

  return `${normalized.slice(0, 217)}...`;
}

async function collectLessons() {
  const items = [];

  try {
    const entries = await fs.readdir(LESSONS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) {
        continue;
      }

      const filePath = path.join(LESSONS_DIR, entry.name);
      const content = await fs.readFile(filePath, 'utf8');
      items.push({
        filename: entry.name,
        snippet: summarizeMarkdown(content),
      });
    }
  } catch {
    // No lessons directory yet; return an empty list.
  }

  return items;
}

function broadcastTelemetry(eventName, payload) {
  if (!ioInstance) {
    return;
  }

  ioInstance.emit(eventName, payload);
}

function attachTelemetryStreams() {
  if (requestStreamAttached) {
    return;
  }

  aosTelemetry.on('llm_stream', (payload) => {
    broadcastTelemetry('llm_stream', {
      ...payload,
      timestamp: payload?.timestamp ?? Date.now(),
    });
  });

  aosTelemetry.on('system_alert', (payload) => {
    broadcastTelemetry('system_alert', {
      ...payload,
      timestamp: payload?.timestamp ?? Date.now(),
    });
  });

  requestStreamAttached = true;
}

async function ensureDashboardRunning() {
  if (process.env.AOS_CONTROL_PLANE_SKIP_DASHBOARD_BOOTSTRAP === 'true') {
    return { started: false, ready: true, skipped: true };
  }

  if (await isPortOpen(DASHBOARD_PORT)) {
    await openDashboard(DASHBOARD_URL);
    return { started: false, ready: true };
  }

  if (process.env.AOS_CONTROL_PLANE_EXTERNAL_DASHBOARD === 'true') {
    const ready = await waitForPort(DASHBOARD_PORT, 30000);
    if (!ready) {
      throw new Error('Dashboard UI failed to boot on port 3000.');
    }

    await openDashboard(DASHBOARD_URL);
    return { started: false, ready: true, external: true };
  }

  const child =
    process.platform === 'win32'
      ? spawn('cmd.exe', ['/d', '/s', '/c', 'npm.cmd run dev'], {
          cwd: DASHBOARD_DIR,
          stdio: 'inherit',
        })
      : spawn('npm', ['run', 'dev'], {
          cwd: DASHBOARD_DIR,
          stdio: 'inherit',
        });

  child.on('error', (error) => {
    console.error('[AOS Telemetry] Dashboard launch failed.', error);
  });

  const ready = await waitForPort(DASHBOARD_PORT, 30000);
  if (!ready) {
    throw new Error('Dashboard UI failed to boot on port 3000.');
  }

  await openDashboard(DASHBOARD_URL);
  return { started: true, ready: true };
}

export async function startTelemetryServer() {
  if (startPromise) {
    return await startPromise;
  }

  startPromise = (async () => {
    const app = express();
    const server = http.createServer(app);
    const io = new SocketIOServer(server, {
      cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
      perMessageDeflate: false,
    });

    ioInstance = io;
    attachTelemetryStreams();

    app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
      res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Vary', 'Origin');

      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }

      next();
    });

    app.get('/health', (_req, res) => {
      res.json({
        ok: true,
        service: 'aos-telemetry',
        telemetryPort: TELEMETRY_PORT,
        dashboardPort: DASHBOARD_PORT,
      });
    });

    app.get('/api/logs', async (_req, res) => {
      try {
        const filePath = await resolveLatestStateFile();
        if (!filePath) {
          res.json({ file: null, count: 0, lines: [] });
          return;
        }

        const lines = await readLastLines(filePath, 100);
        res.json({
          file: toRelativeDisplay(filePath),
          count: lines.length,
          lines,
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to read telemetry logs.',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });

    app.get('/api/memories', async (_req, res) => {
      try {
        const memories = await collectLessons();
        res.json({ count: memories.length, items: memories });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to scan repository memories.',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });

    io.on('connection', (socket) => {
      socket.emit('system_alert', {
        level: 'warning',
        agent: 'telemetry-server',
        message: 'Connected to AOS control plane.',
        feedback: 'Live stream initialized.',
        timestamp: Date.now(),
      });
    });

    await new Promise((resolve) => {
      server.listen(TELEMETRY_PORT, '127.0.0.1', resolve);
    });

    // eslint-disable-next-line no-console
    console.log(`[AOS Telemetry] listening on ${TELEMETRY_URL}`);

    const dashboardState = await ensureDashboardRunning();
    return {
      telemetryUrl: TELEMETRY_URL,
      dashboardUrl: DASHBOARD_URL,
      dashboardState,
    };
  })();

  return await startPromise;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  startTelemetryServer().catch((error) => {
    console.error('[AOS Telemetry] Failed to start telemetry control plane.', error);
    process.exitCode = 1;
  });
}
