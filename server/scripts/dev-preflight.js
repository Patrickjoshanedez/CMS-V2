import net from 'node:net';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const parseMongoTarget = (mongoUri) => {
  try {
    const parsed = new URL(mongoUri);
    const host = parsed.hostname || '127.0.0.1';
    const port = Number(parsed.port || 27017);
    return { host, port };
  } catch {
    return { host: '127.0.0.1', port: 27017 };
  }
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const canConnect = (host, port, timeoutMs = 1200) =>
  new Promise((resolve) => {
    const socket = net.createConnection({ host, port });

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    const onFail = () => {
      socket.destroy();
      resolve(false);
    };

    socket.on('timeout', onFail);
    socket.on('error', onFail);
  });

const run = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cms_v2';
  const { host, port } = parseMongoTarget(mongoUri);

  if (await canConnect(host, port)) {
    return;
  }

  const dockerComposeAvailable = spawnSync('docker', ['compose', 'version'], {
    stdio: 'ignore',
  }).status === 0;

  if (dockerComposeAvailable) {
    console.warn('[dev-preflight] MongoDB is not reachable. Attempting to start docker compose service: mongodb');

    const composeUp = spawnSync('docker', ['compose', '-f', '../docker-compose.yml', 'up', '-d', 'mongodb'], {
      cwd: process.cwd(),
      stdio: 'inherit',
    });

    if (composeUp.status === 0) {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        await wait(1000);
        if (await canConnect(host, port)) {
          console.warn('[dev-preflight] MongoDB is ready for local dev.');
          return;
        }
      }
    }
  }

  console.error('[dev-preflight] Unable to connect to MongoDB for local dev.');
  console.error('[dev-preflight] Start MongoDB with one of these options and re-run npm run dev:');
  console.error('[dev-preflight]   1) docker compose -f ../docker-compose.yml up -d mongodb');
  console.error('[dev-preflight]   2) Start a local mongod service and set MONGODB_URI in server/.env');
  process.exit(1);
};

await run();
