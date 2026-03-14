import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
      minlength: [2, 'Course name must be at least 2 characters'],
      maxlength: [120, 'Course name must not exceed 120 characters'],
    },
    code: {
      type: String,
      required: [true, 'Course code is required'],
      trim: true,
      uppercase: true,
      minlength: [2, 'Course code must be at least 2 characters'],
      maxlength: [20, 'Course code must not exceed 20 characters'],
      unique: true,
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

courseSchema.index({ code: 1 }, { unique: true });
courseSchema.index({ name: 1, isActive: 1 });

const Course = mongoose.model('Course', courseSchema);

export default Course;
