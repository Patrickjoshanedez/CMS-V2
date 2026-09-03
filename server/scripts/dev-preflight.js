import net from 'node:net';
import process from 'node:process';
import { spawnSync, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const composeFilePath = path.resolve(__dirname, '..', '..', 'docker-compose.yml');
const memoryMongoScript = path.resolve(__dirname, 'start-memory-mongo.js');

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
  const isLocalHost = ['127.0.0.1', 'localhost', '0.0.0.0', '::1'].includes(host);

  if (await canConnect(host, port)) {
    return;
  }

  // If targeting localhost and Docker is available, attempt to start Docker container first
  if (isLocalHost) {
    const dockerComposeAvailable =
      spawnSync('docker', ['compose', 'version'], {
        stdio: 'ignore',
      }).status === 0;

    if (dockerComposeAvailable) {
      console.warn(
        '[dev-preflight] MongoDB is not reachable. Attempting to start docker compose service: mongodb',
      );

      const composeUp = spawnSync(
        'docker',
        ['compose', '-f', composeFilePath, 'up', '-d', 'mongodb'],
        {
          cwd: process.cwd(),
          stdio: 'ignore',
        },
      );

      if (composeUp.status === 0) {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          await wait(1000);
          if (await canConnect(host, port)) {
            console.warn('[dev-preflight] ✅ MongoDB container is ready for local dev.');
            return;
          }
        }
      }
    }

    // Zero-Docker fallback: Automatically start embedded in-memory MongoDB
    console.warn(
      `[dev-preflight] Docker MongoDB is not active. Auto-starting embedded in-memory MongoDB on port ${port}...`,
    );

    const memoryChild = spawn(process.execPath, [memoryMongoScript], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    memoryChild.unref();

    for (let attempt = 0; attempt < 12; attempt += 1) {
      await wait(1000);
      if (await canConnect(host, port)) {
        console.warn(`[dev-preflight] ✅ Embedded in-memory MongoDB is ready on port ${port}.`);
        return;
      }
    }
  }

  console.error('[dev-preflight] Unable to connect to MongoDB for local dev.');
  console.error('[dev-preflight] Start MongoDB with one of these options and re-run:');
  console.error(
    '[dev-preflight]   1) Zero-Docker in-memory DB: npm run dev:standalone (or npm run dev:memory-db)',
  );
  console.error(
    '[dev-preflight]   2) Docker container: docker compose -f ../docker-compose.yml up -d mongodb',
  );
  console.error(
    '[dev-preflight]   3) Native service / MongoDB Atlas: set MONGODB_URI in server/.env',
  );
  process.exit(1);
};

await run();
