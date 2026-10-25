import mongoose from 'mongoose';
import { ACADEMIC_TERM_VALUES, CAPSTONE_COURSE_VALUES } from '@cms/shared';

const sectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Section name is required'],
      trim: true,
      minlength: [2, 'Section name must be at least 2 characters'],
      maxlength: [40, 'Section name must not exceed 40 characters'],
    },
    code: {
      type: String,
      required: [true, 'Section code is required'],
      trim: true,
      uppercase: true,
      minlength: [2, 'Section code must be at least 2 characters'],
      maxlength: [20, 'Section code must not exceed 20 characters'],
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      match: [/^\d{4}-\d{4}$/, 'Academic year must follow YYYY-YYYY format'],
    },
    academicTerm: {
      type: String,
      enum: [...ACADEMIC_TERM_VALUES, null],
      default: '1st Semester',
    },
    capstoneCourse: {
      type: Number,
      enum: [...CAPSTONE_COURSE_VALUES, null],
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

sectionSchema.index(
  { courseId: 1, academicYear: 1, academicTerm: 1, name: 1, code: 1 },
  { unique: true },
);
sectionSchema.index({ academicYear: 1, academicTerm: 1, isActive: 1 });

const Section = mongoose.model('Section', sectionSchema);

export default Section;
