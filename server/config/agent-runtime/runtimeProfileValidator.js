import AppError from '../../utils/AppError.js';

const VALID_STATUSES = new Set(['draft', 'active', 'deprecated']);
const VALID_DECISION_MODES = new Set(['BLOCK', 'WARN', 'LOG']);

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);

const collectErrors = (profile) => {
  const errors = [];

  if (!isObject(profile)) {
    return ['Profile must be a JSON object.'];
  }

  const requiredTopLevel = [
    'id',
    'version',
    'status',
    'modeProfiles',
    'confidencePolicy',
    'verification',
    'triggerPolicies',
  ];

  for (const key of requiredTopLevel) {
    if (!(key in profile)) {
      errors.push(`Missing required field: ${key}`);
    }
  }

  if ('id' in profile && !isNonEmptyString(profile.id)) {
    errors.push('id must be a non-empty string.');
  }

  if ('version' in profile && !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(String(profile.version))) {
    errors.push('version must follow semantic version format (x.y.z).');
  }

  if ('status' in profile && !VALID_STATUSES.has(profile.status)) {
    errors.push('status must be one of: draft, active, deprecated.');
  }

  if ('modeProfiles' in profile) {
    if (!isObject(profile.modeProfiles)) {
      errors.push('modeProfiles must be an object.');
    } else {
      for (const mode of ['execution', 'explainability', 'proactive']) {
        const modeProfile = profile.modeProfiles[mode];
        if (!isObject(modeProfile)) {
          errors.push(`modeProfiles.${mode} must be an object.`);
          continue;
        }

        if (!Array.isArray(modeProfile.useWhen)) {
          errors.push(`modeProfiles.${mode}.useWhen must be an array.`);
        }

        if (!Array.isArray(modeProfile.behaviors)) {
          errors.push(`modeProfiles.${mode}.behaviors must be an array.`);
        }
      }
    }
  }

  if ('confidencePolicy' in profile) {
    if (!isObject(profile.confidencePolicy)) {
      errors.push('confidencePolicy must be an object.');
    } else {
      for (const band of ['high', 'medium', 'low']) {
        const policy = profile.confidencePolicy[band];
        if (!isObject(policy)) {
          errors.push(`confidencePolicy.${band} must be an object.`);
          continue;
        }

        if (!isNumber(policy.min) || !isNumber(policy.max)) {
          errors.push(`confidencePolicy.${band}.min and .max must be numbers.`);
        }

        if (!isNonEmptyString(policy.policy)) {
          errors.push(`confidencePolicy.${band}.policy must be a non-empty string.`);
        }
      }
    }
  }

  if ('verification' in profile) {
    if (!isObject(profile.verification)) {
      errors.push('verification must be an object.');
    } else {
      if (!Array.isArray(profile.verification.autoTrigger)) {
        errors.push('verification.autoTrigger must be an array.');
      }

      if (!Array.isArray(profile.verification.steps)) {
        errors.push('verification.steps must be an array.');
      }
    }
  }

  if ('triggerPolicies' in profile) {
    if (!Array.isArray(profile.triggerPolicies)) {
      errors.push('triggerPolicies must be an array.');
    } else {
      for (const [index, triggerPolicy] of profile.triggerPolicies.entries()) {
        if (!isObject(triggerPolicy)) {
          errors.push(`triggerPolicies[${index}] must be an object.`);
          continue;
        }

        for (const requiredField of ['name', 'when', 'action', 'decisionMode']) {
          if (!(requiredField in triggerPolicy)) {
            errors.push(`triggerPolicies[${index}] missing required field: ${requiredField}.`);
          }
        }

        if (
          'decisionMode' in triggerPolicy &&
          !VALID_DECISION_MODES.has(triggerPolicy.decisionMode)
        ) {
          errors.push(`triggerPolicies[${index}].decisionMode must be one of: BLOCK, WARN, LOG.`);
        }
      }
    }
  }

  return errors;
};

export const validateRuntimeProfile = (profile) => {
  const errors = collectErrors(profile);

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const assertValidRuntimeProfile = (profile, source = 'runtime profile') => {
  const { valid, errors } = validateRuntimeProfile(profile);

  if (!valid) {
    throw new AppError(`Invalid ${source}: ${errors.join(' | ')}`, 500, 'INVALID_RUNTIME_PROFILE');
  }
};
