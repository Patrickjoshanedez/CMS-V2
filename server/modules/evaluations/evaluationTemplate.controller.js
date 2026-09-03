/**
 * EvaluationTemplate controller — CRUD for instructor-managed grading rubric templates.
 */
import EvaluationTemplate from './evaluationTemplate.model.js';
import AppError from '../../utils/AppError.js';
import catchAsync from '../../utils/catchAsync.js';
import { HTTP_STATUS } from '@cms/shared';

/** GET /api/evaluation-templates — List all templates (optionally filter by defenseType) */
export const listTemplates = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.defenseType) filter.defenseType = req.query.defenseType;
  const templates = await EvaluationTemplate.find(filter).sort({
    defenseType: 1,
    isDefault: -1,
    createdAt: -1,
  });
  res.status(HTTP_STATUS.OK).json({ success: true, data: { templates } });
});

/** GET /api/evaluation-templates/:id */
export const getTemplate = catchAsync(async (req, res) => {
  const template = await EvaluationTemplate.findById(req.params.id);
  if (!template) throw new AppError('Template not found', 404, 'TEMPLATE_NOT_FOUND');
  res.status(HTTP_STATUS.OK).json({ success: true, data: { template } });
});

/** POST /api/evaluation-templates */
export const createTemplate = catchAsync(async (req, res) => {
  const { name, description, defenseType, criteria, isDefault } = req.body;

  // If marking as default, unset existing defaults for this defenseType
  if (isDefault) {
    await EvaluationTemplate.updateMany(
      { defenseType, isDefault: true },
      { $set: { isDefault: false } },
    );
  }

  const template = await EvaluationTemplate.create({
    name,
    description,
    defenseType,
    criteria,
    isDefault: !!isDefault,
    createdBy: req.user._id,
  });

  res.status(HTTP_STATUS.CREATED).json({ success: true, data: { template } });
});

/** PATCH /api/evaluation-templates/:id */
export const updateTemplate = catchAsync(async (req, res) => {
  const { name, description, criteria, isDefault } = req.body;
  const template = await EvaluationTemplate.findById(req.params.id);
  if (!template) throw new AppError('Template not found', 404, 'TEMPLATE_NOT_FOUND');

  if (isDefault && !template.isDefault) {
    await EvaluationTemplate.updateMany(
      { defenseType: template.defenseType, isDefault: true },
      { $set: { isDefault: false } },
    );
  }

  if (name !== undefined) template.name = name;
  if (description !== undefined) template.description = description;
  if (criteria !== undefined) template.criteria = criteria;
  if (isDefault !== undefined) template.isDefault = isDefault;
  await template.save();

  res.status(HTTP_STATUS.OK).json({ success: true, data: { template } });
});

/** DELETE /api/evaluation-templates/:id — soft-delete */
export const deleteTemplate = catchAsync(async (req, res) => {
  const template = await EvaluationTemplate.findById(req.params.id);
  if (!template) throw new AppError('Template not found', 404, 'TEMPLATE_NOT_FOUND');
  await template.softDelete(req.user._id);
  res.status(HTTP_STATUS.OK).json({ success: true, message: 'Template archived.' });
});

/** GET /api/evaluation-templates/default/:defenseType — fetch the default template */
export const getDefaultTemplate = catchAsync(async (req, res) => {
  const template = await EvaluationTemplate.findOne({
    defenseType: req.params.defenseType,
    isDefault: true,
  });
  res.status(HTTP_STATUS.OK).json({ success: true, data: { template: template || null } });
});
