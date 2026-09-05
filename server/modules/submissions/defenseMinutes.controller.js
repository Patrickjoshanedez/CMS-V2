import defenseMinutesService from './defenseMinutes.service.js';
import catchAsync from '../../utils/catchAsync.js';
import { HTTP_STATUS } from '@cms/shared';

export const getOrCreateMinutes = catchAsync(async (req, res) => {
  const { projectId, defenseType } = req.params;
  const data = await defenseMinutesService.getOrCreateMinutes(projectId, defenseType, req.user);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data,
  });
});

export const addEntry = catchAsync(async (req, res) => {
  const { projectId, defenseType } = req.params;
  const result = await defenseMinutesService.addEntry(projectId, defenseType, req.body, req.user);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Defense critique item logged.',
    data: result,
  });
});

export const updateEntry = catchAsync(async (req, res) => {
  const { projectId, defenseType, entryId } = req.params;
  const result = await defenseMinutesService.updateEntry(
    projectId,
    defenseType,
    entryId,
    req.body,
    req.user,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Defense critique item updated.',
    data: result,
  });
});

export const deleteEntry = catchAsync(async (req, res) => {
  const { projectId, defenseType, entryId } = req.params;
  const result = await defenseMinutesService.deleteEntry(projectId, defenseType, entryId, req.user);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Defense critique item deleted.',
    data: result,
  });
});

export const finalizeVerdict = catchAsync(async (req, res) => {
  const { projectId, defenseType } = req.params;
  const result = await defenseMinutesService.finalizeVerdict(
    projectId,
    defenseType,
    req.body,
    req.user,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Defense consensus verdict officially recorded.',
    data: result,
  });
});

export const lockCompositeScores = catchAsync(async (req, res) => {
  const { projectId, defenseType } = req.params;
  const result = await defenseMinutesService.lockCompositeScores(
    projectId,
    defenseType,
    req.body,
    req.user,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Composite scores verified and locked.',
    data: result,
  });
});

export const publishToADM = catchAsync(async (req, res) => {
  const { projectId, defenseType } = req.params;
  const result = await defenseMinutesService.publishToADM(projectId, defenseType, req.user);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Defense minutes converted and published to Action Done Matrix.',
    data: result,
  });
});
