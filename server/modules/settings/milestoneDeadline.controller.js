/**
 * MilestoneDeadline Controller
 * Manages CRUD operations for academic milestone submission deadlines.
 */
import MilestoneDeadline from './milestoneDeadline.model.js';
import catchAsync from '../../utils/catchAsync.js';
import AppError from '../../utils/AppError.js';
import { HTTP_STATUS, ROLES } from '@cms/shared';
import { emitToAll } from '../../services/socket.service.js';

/**
 * GET /api/settings/deadlines/milestone
 * Fetch milestone deadlines based on query filters (batchYear, sectionId, stage, targetType).
 */
export const getMilestoneDeadlines = catchAsync(async (req, res) => {
  const { batchYear, sectionId, stage, targetType } = req.query;

  const query = {};
  if (batchYear) query.batchYear = batchYear;
  if (stage) query.stage = stage;
  if (targetType) query.targetType = targetType;

  if (sectionId) {
    // If sectionId provided, get both batch-level and this section's deadlines
    query.$or = [{ targetType: 'batch' }, { targetType: 'section', sectionId }];
  }

  const deadlines = await MilestoneDeadline.find(query)
    .populate('sectionId', 'name code')
    .populate('createdBy', 'firstName lastName')
    .sort({ deadlineDate: 1, stage: 1 });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: deadlines,
  });
});

/**
 * POST /api/settings/deadlines/milestone
 * Upsert a milestone deadline (create or update if already exists for target/deliverable).
 * Restricted to Instructors.
 */
export const upsertMilestoneDeadline = catchAsync(async (req, res) => {
  const {
    batchYear,
    targetType = 'batch',
    sectionId = null,
    stage,
    deliverable,
    title,
    description = '',
    deadlineDate,
    isMandatory = true,
    allowLateSubmission = true,
  } = req.body;

  if (!batchYear || !stage || !deliverable || !title || !deadlineDate) {
    throw new AppError(
      'batchYear, stage, deliverable, title, and deadlineDate are required fields.',
      HTTP_STATUS.BAD_REQUEST,
      'VALIDATION_ERROR',
    );
  }

  const filter = {
    batchYear: String(batchYear).trim(),
    targetType,
    sectionId: targetType === 'section' && sectionId ? sectionId : null,
    deliverable,
  };

  const update = {
    stage,
    title: String(title).trim(),
    description: String(description || '').trim(),
    deadlineDate: new Date(deadlineDate),
    isMandatory: Boolean(isMandatory),
    allowLateSubmission: Boolean(allowLateSubmission),
    createdBy: req.user?._id || null,
  };

  const deadline = await MilestoneDeadline.findOneAndUpdate(
    filter,
    { $set: update },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  ).populate('sectionId', 'name code');

  // Broadcast real-time update to all connected clients
  try {
    emitToAll('milestoneDeadline:updated', {
      deadline,
      batchYear,
      stage,
      deliverable,
    });
  } catch (err) {
    // Non-fatal socket broadcast
  }

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Milestone deadline saved successfully.',
    data: deadline,
  });
});

/**
 * DELETE /api/settings/deadlines/milestone/:id
 * Remove a milestone deadline by ID.
 * Restricted to Instructors.
 */
export const deleteMilestoneDeadline = catchAsync(async (req, res) => {
  const { id } = req.params;

  const deadline = await MilestoneDeadline.findByIdAndDelete(id);
  if (!deadline) {
    throw new AppError(
      'Milestone deadline not found.',
      HTTP_STATUS.NOT_FOUND,
      'DEADLINE_NOT_FOUND',
    );
  }

  try {
    emitToAll('milestoneDeadline:deleted', {
      id,
      batchYear: deadline.batchYear,
      deliverable: deadline.deliverable,
    });
  } catch (err) {
    // Non-fatal
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Milestone deadline deleted successfully.',
    data: { id },
  });
});
