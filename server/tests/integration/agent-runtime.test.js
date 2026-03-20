import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createAuthenticatedUserWithRole, request } from '../helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runtimeRoot = path.resolve(__dirname, '../../config/agent-runtime');
const profilesDir = path.join(runtimeRoot, 'profiles');
const stateFile = path.join(runtimeRoot, 'state.json');

let originalState = null;
let originalStateExisted = false;

const tempProfileKeys = new Set();

const writeJson = async (filePath, payload) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
};

const writeProfile = async (key, profile) => {
  const filePath = path.join(profilesDir, `${key}.json`);
  await writeJson(filePath, profile);
  tempProfileKeys.add(key);
};

const cleanupProfiles = async () => {
  for (const key of tempProfileKeys) {
    const filePath = path.join(profilesDir, `${key}.json`);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
  tempProfileKeys.clear();
};

describe('Agent Runtime API — /api/agent-runtime', () => {
  beforeAll(async () => {
    try {
      originalState = await fs.readFile(stateFile, 'utf-8');
      originalStateExisted = true;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      originalStateExisted = false;
      originalState = null;
    }
  });

  afterEach(async () => {
    await cleanupProfiles();
  });

  afterAll(async () => {
    if (originalStateExisted) {
      await fs.writeFile(stateFile, originalState, 'utf-8');
    } else {
      try {
        await fs.unlink(stateFile);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    }
  });

  it('rejects unauthenticated access with 401', async () => {
    const res = await request.get('/api/agent-runtime');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects student access with 403', async () => {
    const { agent } = await createAuthenticatedUserWithRole('student', {
      email: `runtime-student-${Date.now()}@test.com`,
    });

    const res = await agent.get('/api/agent-runtime');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('allows instructor to read runtime profile and status', async () => {
    const { agent } = await createAuthenticatedUserWithRole('instructor', {
      email: `runtime-instructor-${Date.now()}@test.com`,
    });

    const res = await agent.get('/api/agent-runtime');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile.id).toBeTypeOf('string');
    expect(res.body.data.status.activeProfile).toBeTypeOf('string');
  });

  it('validates required profileKey on activation', async () => {
    const { agent } = await createAuthenticatedUserWithRole('instructor', {
      email: `runtime-activate-required-${Date.now()}@test.com`,
    });

    const res = await agent.post('/api/agent-runtime/activate').send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('PROFILE_KEY_REQUIRED');
  });

  it('rejects activation when profile schema is malformed', async () => {
    const key = `runtime-malformed-${Date.now()}`;
    await writeProfile(key, {
      id: 'runtime-malformed',
      version: '1.0.0',
      status: 'active',
    });

    const { agent } = await createAuthenticatedUserWithRole('instructor', {
      email: `runtime-activate-malformed-${Date.now()}@test.com`,
    });

    const res = await agent.post('/api/agent-runtime/activate').send({ profileKey: key });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_RUNTIME_PROFILE');
  });
});
