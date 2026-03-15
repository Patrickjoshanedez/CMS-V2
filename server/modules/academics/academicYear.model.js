import mongoose from 'mongoose';

const academicYearSchema = new mongoose.Schema(
  {
    year: {
      type: String,
      required: [true, 'Academic year is required'],
      unique: true,
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

const AcademicYear = mongoose.model('AcademicYear', academicYearSchema);

export default AcademicYear;
