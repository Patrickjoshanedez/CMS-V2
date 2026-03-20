import catchAsync from '../../utils/catchAsync.js';
import AppError from '../../utils/AppError.js';
import agentRuntimeConfigService from '../../services/agentRuntimeConfig.service.js';

export const getRuntimeProfile = catchAsync(async (req, res) => {
  const profile = await agentRuntimeConfigService.getCurrentProfile();
  const status = await agentRuntimeConfigService.getRuntimeStatus();

  res.status(200).json({
    success: true,
    data: {
      profile,
      status,
    },
  });
});

export const reloadRuntimeProfile = catchAsync(async (req, res) => {
  const profile = await agentRuntimeConfigService.reload();
  const status = await agentRuntimeConfigService.getRuntimeStatus();

  res.status(200).json({
    success: true,
    message: 'Runtime profile reloaded successfully.',
    data: {
      profile,
      status,
    },
  });
});

export const activateRuntimeProfile = catchAsync(async (req, res) => {
  const profileKey = req.body?.profileKey;

  if (typeof profileKey !== 'string' || !profileKey.trim()) {
    throw new AppError('profileKey is required.', 400, 'PROFILE_KEY_REQUIRED');
  }

  const profile = await agentRuntimeConfigService.activateProfile(profileKey);
  const status = await agentRuntimeConfigService.getRuntimeStatus();

  res.status(200).json({
    success: true,
    message: `Runtime profile activated: ${profileKey}`,
    data: {
      profile,
      status,
    },
  });
});

export const rollbackRuntimeProfile = catchAsync(async (req, res) => {
  const profile = await agentRuntimeConfigService.rollbackProfile();
  const status = await agentRuntimeConfigService.getRuntimeStatus();

  res.status(200).json({
    success: true,
    message: 'Runtime profile rollback completed.',
    data: {
      profile,
      status,
    },
  });
});
