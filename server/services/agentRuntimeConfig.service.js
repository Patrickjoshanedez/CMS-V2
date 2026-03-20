import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import env from '../config/env.js';
import AppError from '../utils/AppError.js';
import { assertValidRuntimeProfile } from '../config/agent-runtime/runtimeProfileValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RUNTIME_ROOT = path.resolve(__dirname, '../config/agent-runtime');
const PROFILES_DIR = path.join(RUNTIME_ROOT, 'profiles');
const STATE_FILE = path.join(RUNTIME_ROOT, 'state.json');

class AgentRuntimeConfigService {
  constructor() {
    this.cache = null;
    this.lastKnownGood = null;
  }

  get cacheTtlMs() {
    return env.AGENT_RUNTIME_CACHE_TTL_MS;
  }

  isCacheFresh() {
    if (!this.cache) {
      return false;
    }

    return Date.now() < this.cache.expiresAt;
  }

  async getRuntimeStatus() {
    const state = await this.readState();

    return {
      activeProfile: await this.getActiveProfileKey(),
      previousActiveProfile: state?.previousActiveProfile || null,
      cache: {
        loadedAt: this.cache?.loadedAt || null,
        expiresAt: this.cache?.expiresAt || null,
        isFresh: this.isCacheFresh(),
      },
      lastKnownGoodProfileId: this.lastKnownGood?.id || null,
      availableProfiles: await this.listAvailableProfiles(),
    };
  }

  async getCurrentProfile(options = {}) {
    const { forceReload = false } = options;

    if (!forceReload && this.isCacheFresh()) {
      return this.cache.profile;
    }

    return this.reload();
  }

  async reload() {
    const profileKey = await this.getActiveProfileKey();

    try {
      const profile = await this.loadProfile(profileKey);
      this.updateCache(profile);
      this.lastKnownGood = profile;
      return profile;
    } catch (error) {
      if (this.lastKnownGood && !env.AGENT_RUNTIME_STRICT_MODE) {
        this.updateCache(this.lastKnownGood);
        return this.lastKnownGood;
      }

      throw error;
    }
  }

  async activateProfile(profileKey) {
    if (!profileKey || typeof profileKey !== 'string') {
      throw new AppError('profileKey is required.', 400, 'PROFILE_KEY_REQUIRED');
    }

    const normalizedProfileKey = profileKey.trim();

    if (!normalizedProfileKey) {
      throw new AppError('profileKey cannot be empty.', 400, 'PROFILE_KEY_REQUIRED');
    }

    const currentProfileKey = await this.getActiveProfileKey();
    const profile = await this.loadProfile(normalizedProfileKey);

    await this.writeState({
      activeProfile: normalizedProfileKey,
      previousActiveProfile: currentProfileKey,
      updatedAt: new Date().toISOString(),
    });

    this.updateCache(profile);
    this.lastKnownGood = profile;

    return profile;
  }

  async rollbackProfile() {
    const state = await this.readState();

    if (!state?.previousActiveProfile) {
      throw new AppError(
        'No previous runtime profile available to rollback.',
        409,
        'RUNTIME_ROLLBACK_NOT_AVAILABLE',
      );
    }

    const rollbackTarget = state.previousActiveProfile;
    const currentProfile = state.activeProfile || (await this.getActiveProfileKey());
    const profile = await this.loadProfile(rollbackTarget);

    await this.writeState({
      activeProfile: rollbackTarget,
      previousActiveProfile: currentProfile,
      updatedAt: new Date().toISOString(),
    });

    this.updateCache(profile);
    this.lastKnownGood = profile;

    return profile;
  }

  async listAvailableProfiles() {
    const entries = await fs.readdir(PROFILES_DIR, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => entry.name.replace(/\.json$/, ''))
      .sort();
  }

  async getActiveProfileKey() {
    const state = await this.readState();

    if (state?.activeProfile && typeof state.activeProfile === 'string') {
      return state.activeProfile;
    }

    return env.AGENT_RUNTIME_ACTIVE_PROFILE;
  }

  async loadProfile(profileKey) {
    const profilePath = path.join(PROFILES_DIR, `${profileKey}.json`);

    let fileContent;
    try {
      fileContent = await fs.readFile(profilePath, 'utf-8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new AppError(
          `Runtime profile not found: ${profileKey}`,
          404,
          'RUNTIME_PROFILE_NOT_FOUND',
        );
      }

      throw new AppError(
        `Unable to read runtime profile: ${profileKey}`,
        500,
        'RUNTIME_PROFILE_READ_FAILED',
      );
    }

    let profile;
    try {
      profile = JSON.parse(fileContent);
    } catch {
      throw new AppError(
        `Runtime profile JSON is malformed: ${profileKey}`,
        500,
        'RUNTIME_PROFILE_INVALID_JSON',
      );
    }

    assertValidRuntimeProfile(profile, `runtime profile ${profileKey}`);

    return profile;
  }

  async readState() {
    try {
      const stateContent = await fs.readFile(STATE_FILE, 'utf-8');
      return JSON.parse(stateContent);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }

      if (error.name === 'SyntaxError') {
        throw new AppError(
          'Runtime state file is malformed JSON.',
          500,
          'RUNTIME_STATE_INVALID_JSON',
        );
      }

      throw new AppError('Unable to read runtime state file.', 500, 'RUNTIME_STATE_READ_FAILED');
    }
  }

  async writeState(state) {
    await fs.mkdir(RUNTIME_ROOT, { recursive: true });

    const tempFile = `${STATE_FILE}.tmp`;
    const payload = `${JSON.stringify(state, null, 2)}\n`;

    await fs.writeFile(tempFile, payload, 'utf-8');
    await fs.rename(tempFile, STATE_FILE);
  }

  updateCache(profile) {
    const loadedAt = Date.now();

    this.cache = {
      profile,
      loadedAt,
      expiresAt: loadedAt + this.cacheTtlMs,
    };
  }

  /**
   * Get active profile with source metadata
   * Implements three-tier fallback: Active → LastKnownGood → Hardcoded
   */
  async getActiveProfile() {
    try {
      if (this.isCacheFresh()) {
        return {
          profile: this.cache.profile,
          source: 'cache',
          metadata: { loadedAt: this.cache.loadedAt },
        };
      }

      const profile = await this.reload();
      return {
        profile,
        source: 'active',
        metadata: { activeProfileKey: await this.getActiveProfileKey() },
      };
    } catch (error) {
      if (this.lastKnownGood) {
        return {
          profile: this.lastKnownGood,
          source: 'fallback',
          metadata: { error: error.message, reason: 'Last known good profile' },
        };
      }

      return {
        profile: this._getHardcodedDefaults(),
        source: 'hardcoded',
        metadata: { reason: 'Emergency fallback - all loading failed' },
      };
    }
  }

  /**
   * Get setting using dot-notation path with fallback default
   * Example: getSetting('features.course_creation.enabled', true)
   */
  async getSetting(dotPath, defaultValue = undefined) {
    try {
      const { profile } = await this.getActiveProfile();
      const value = this._getNestedValue(profile, dotPath);
      return value !== undefined ? value : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  }

  /**
   * Check if a feature is enabled
   */
  async isFeatureEnabled(featureName) {
    try {
      const { profile } = await this.getActiveProfile();
      return profile?.settings?.features?.[featureName]?.enabled === true;
    } catch {
      return false;
    }
  }

  /**
   * Get feature configuration object
   */
  async getFeatureConfig(featureName) {
    try {
      const { profile } = await this.getActiveProfile();
      const feature = profile?.settings?.features?.[featureName] || {};
      return {
        enabled: feature.enabled !== false,
        allowedRoles: feature.allowedRoles || [],
        rolloutPercentage: feature.rolloutPercentage || 0,
        description: feature.description || '',
      };
    } catch {
      return { enabled: false, allowedRoles: [], rolloutPercentage: 0 };
    }
  }

  /**
   * Get confidence threshold for decision type
   */
  async getConfidenceThreshold(decisionType, defaultValue = 0.7) {
    try {
      const { profile } = await this.getActiveProfile();
      const threshold =
        profile?.settings?.thresholds?.confidence?.[decisionType] ||
        profile?.settings?.thresholds?.confidence?.default ||
        defaultValue;

      if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
        return defaultValue;
      }

      return threshold;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Get log level setting
   */
  async getLogLevel() {
    try {
      const { profile } = await this.getActiveProfile();
      const level = profile?.settings?.logging?.level || 'info';
      return ['debug', 'info', 'warn', 'error'].includes(level) ? level : 'info';
    } catch {
      return 'info';
    }
  }

  /**
   * Check if decision source logging is enabled
   */
  async isDecisionSourceLoggingEnabled() {
    try {
      const { profile } = await this.getActiveProfile();
      return profile?.settings?.logging?.logDecisionSource !== false;
    } catch {
      return false;
    }
  }

  /**
   * Validate active profile against schema
   */
  async validateActiveProfile() {
    try {
      const { profile } = await this.getActiveProfile();
      const result = this._validateProfile(profile);
      return result;
    } catch (error) {
      return {
        valid: false,
        errors: [error.message],
      };
    }
  }

  /**
   * Get effective configuration (merged with overrides)
   */
  async getEffectiveConfig(overrides = {}) {
    try {
      const { profile } = await this.getActiveProfile();
      return this._deepMerge(profile, overrides);
    } catch (error) {
      return this._getHardcodedDefaults();
    }
  }

  // ===== Private Helpers =====

  _getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  _getHardcodedDefaults() {
    return {
      id: 'hardcoded-defaults',
      version: '1.0.0',
      status: 'active',
      settings: {
        features: {
          course_creation: { enabled: true, allowedRoles: ['instructor', 'admin'] },
          assessments: { enabled: true, allowedRoles: ['instructor', 'admin'] },
          certificates: { enabled: true, allowedRoles: ['student', 'instructor', 'admin'] },
          dynamic_runtime_config: { enabled: false },
        },
        policies: {
          library_auto_trigger: {
            enabledLibraries: ['react', 'mongoose', 'express', 'react-query', 'zustand'],
          },
        },
        thresholds: {
          confidence: {
            library_trigger: 0.7,
            default: 0.7,
          },
        },
        logging: {
          level: 'info',
          logDecisionSource: false,
        },
      },
    };
  }

  _validateProfile(profile) {
    const errors = [];

    if (!profile.id || typeof profile.id !== 'string') {
      errors.push('Missing or invalid "id" field');
    }

    if (!profile.settings || typeof profile.settings !== 'object') {
      errors.push('Missing or invalid "settings" object');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  _deepMerge(base, override) {
    const merged = { ...base };

    for (const [key, value] of Object.entries(override)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        merged[key] = this._deepMerge(merged[key] || {}, value);
      } else {
        merged[key] = value;
      }
    }

    return merged;
  }
}

const agentRuntimeConfigService = new AgentRuntimeConfigService();

export default agentRuntimeConfigService;
