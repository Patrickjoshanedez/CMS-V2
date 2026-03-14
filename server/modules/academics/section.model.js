import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Section name is required'],
      trim: true,
      minlength: [2, 'Section name must be at least 2 characters'],
      maxlength: [40, 'Section name must not exceed 40 characters'],
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

sectionSchema.index({ courseId: 1, academicYear: 1, name: 1 }, { unique: true });
sectionSchema.index({ academicYear: 1, isActive: 1 });

const Section = mongoose.model('Section', sectionSchema);

export default Section;
