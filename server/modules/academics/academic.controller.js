import academicService from './academic.service.js';
import catchAsync from '../../utils/catchAsync.js';
import { HTTP_STATUS } from '@cms/shared';

export const createCourse = catchAsync(async (req, res) => {
  const { course } = await academicService.createCourse(req.user._id, req.body);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Course created successfully.',
    data: { course },
  });
});

export const listCourses = catchAsync(async (_req, res) => {
  const { courses } = await academicService.listCourses();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { courses },
  });
});

export const createSection = catchAsync(async (req, res) => {
  const { section } = await academicService.createSection(req.user._id, req.body);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Section created successfully.',
    data: { section },
  });
});

export const listSections = catchAsync(async (req, res) => {
  const { sections } = await academicService.listSections(req.query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { sections },
  });
});

export const listAcademicYears = catchAsync(async (_req, res) => {
  const { academicYears } = await academicService.listAcademicYears();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { academicYears },
  });
});

export const getHierarchy = catchAsync(async (req, res) => {
  const { hierarchy } = await academicService.getHierarchy(req.query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { hierarchy },
  });
});
