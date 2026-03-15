import { Router } from 'express';
import * as academicController from './academic.controller.js';
import authenticate from '../../middleware/authenticate.js';
import authorize from '../../middleware/authorize.js';
import validate from '../../middleware/validate.js';
import { ROLES } from '@cms/shared';
import {
  createAcademicYearSchema,
  createCourseSchema,
  createSectionSchema,
  listSectionsQuerySchema,
  hierarchyQuerySchema,
} from './academic.validation.js';

const router = Router();

router.use(authenticate);

router.get('/courses', academicController.listCourses);
router.get(
  '/sections',
  validate(listSectionsQuerySchema, 'query'),
  academicController.listSections,
);
router.get('/academic-years', academicController.listAcademicYears);

router.post(
  '/academic-years',
  authorize(ROLES.INSTRUCTOR),
  validate(createAcademicYearSchema),
  academicController.createAcademicYear,
);

router.post(
  '/courses',
  authorize(ROLES.INSTRUCTOR),
  validate(createCourseSchema),
  academicController.createCourse,
);

router.post(
  '/sections',
  authorize(ROLES.INSTRUCTOR),
  validate(createSectionSchema),
  academicController.createSection,
);

router.get(
  '/hierarchy',
  authorize(ROLES.INSTRUCTOR),
  validate(hierarchyQuerySchema, 'query'),
  academicController.getHierarchy,
);

export default router;
