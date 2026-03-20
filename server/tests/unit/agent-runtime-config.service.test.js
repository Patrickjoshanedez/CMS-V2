import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import agentRuntimeConfigService from '../../services/agentRuntimeConfig.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runtimeRoot = path.resolve(__dirname, '../../config/agent-runtime');
const profilesDir = path.join(runtimeRoot, 'profiles');
const stateFile = path.join(runtimeRoot, 'state.json');
const defaultProfileFile = path.join(profilesDir, 'default.json');

let originalState = null;
let originalStateExisted = false;
let defaultProfileTemplate = null;

const tempProfileKeys = new Set();

const resetServiceCache = () => {
  agentRuntimeConfigService.cache = null;
  agentRuntimeConfigService.lastKnownGood = null;
};

const makeProfile = (key, overrides = {}) => {
  const profile = JSON.parse(JSON.stringify(defaultProfileTemplate));
  profile.id = `test-${key}`;
  profile.checksum = `checksum-${key}`;
  profile.status = 'active';

  return {
    ...profile,
    ...overrides,
  };
};

const writeJson = async (filePath, payload) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
};

const writeState = async (activeProfile = 'default', previousActiveProfile = null) => {
  await writeJson(stateFile, {
    activeProfile,
    previousActiveProfile,
    updatedAt: new Date().toISOString(),
  });
};

const writeProfile = async (key, profile) => {
  const profileFile = path.join(profilesDir, `${key}.json`);
  await writeJson(profileFile, profile);
  tempProfileKeys.add(key);
};

const deleteTempProfiles = async () => {
  for (const key of tempProfileKeys) {
    const profileFile = path.join(profilesDir, `${key}.json`);
    try {
      await fs.unlink(profileFile);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
  tempProfileKeys.clear();
};

describe('AgentRuntimeConfigService', () => {
  beforeAll(async () => {
    defaultProfileTemplate = JSON.parse(await fs.readFile(defaultProfileFile, 'utf-8'));

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

  beforeEach(async () => {
    resetServiceCache();
    await writeState('default', null);
  });

  afterEach(async () => {
    resetServiceCache();
    await deleteTempProfiles();
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

  it('loads a valid active runtime profile', async () => {
    const profile = await agentRuntimeConfigService.getCurrentProfile({ forceReload: true });

    expect(profile.id).toBeTypeOf('string');
    expect(profile.modeProfiles).toBeTypeOf('object');
    expect(profile.confidencePolicy).toBeTypeOf('object');
  });

  it('keeps cached profile until reload invalidates cache', async () => {
    const key = `cache-${Date.now()}`;
    const v1 = makeProfile(`${key}-v1`, {
      id: `test-${key}`,
      checksum: 'cache-v1',
    });
    await writeProfile(key, v1);
    await writeState(key, 'default');

    const firstLoad = await agentRuntimeConfigService.getCurrentProfile({ forceReload: true });
    expect(firstLoad.checksum).toBe('cache-v1');

    const v2 = {
      ...v1,
      checksum: 'cache-v2',
      pluginRegistry: [
        ...(v1.pluginRegistry || []),
        { id: 'extra-plugin', enabled: true, triggers: ['extra'] },
      ],
    };
    await writeProfile(key, v2);

    const stillCached = await agentRuntimeConfigService.getCurrentProfile();
    expect(stillCached.checksum).toBe('cache-v1');

    const afterReload = await agentRuntimeConfigService.reload();
    expect(afterReload.checksum).toBe('cache-v2');
  });

  it('activates another profile and can rollback to previous profile', async () => {
    const keyA = `activate-a-${Date.now()}`;
    const keyB = `activate-b-${Date.now()}`;

    await writeProfile(keyA, makeProfile(keyA));
    await writeProfile(keyB, makeProfile(keyB));

    const activatedA = await agentRuntimeConfigService.activateProfile(keyA);
    expect(activatedA.id).toBe(`test-${keyA}`);

    const activatedB = await agentRuntimeConfigService.activateProfile(keyB);
    expect(activatedB.id).toBe(`test-${keyB}`);

    const rolledBack = await agentRuntimeConfigService.rollbackProfile();
    expect(rolledBack.id).toBe(`test-${keyA}`);

    const status = await agentRuntimeConfigService.getRuntimeStatus();
    expect(status.activeProfile).toBe(keyA);
    expect(status.previousActiveProfile).toBe(keyB);
  });

  it('rejects malformed runtime profiles during activation', async () => {
    const key = `malformed-${Date.now()}`;
    await writeProfile(key, {
      id: 'bad-profile',
      version: '1.0.0',
      status: 'active',
    });

    await expect(agentRuntimeConfigService.activateProfile(key)).rejects.toMatchObject({
      code: 'INVALID_RUNTIME_PROFILE',
      statusCode: 500,
    });
  });
});
