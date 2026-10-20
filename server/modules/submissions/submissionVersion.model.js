import mongoose from 'mongoose';

const submissionVersionSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    version: { type: Number, required: true, min: 0 },
    revisionRound: { type: Number, required: true, min: -1 },
  },
  { versionKey: false },
);

export default mongoose.model('SubmissionVersionCounter', submissionVersionSchema);
