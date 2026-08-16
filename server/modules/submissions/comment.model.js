import mongoose from 'mongoose';

const { Schema } = mongoose;

const commentSchema = new Schema({
  submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', required: true },
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true },
  pageNumber: { type: Number, required: true },
  coordinates: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  highlightText: { type: String, required: true },
  commentText: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Fast lookups when loading PDF overlays in the DocumentViewer
commentSchema.index({ submissionId: 1, pageNumber: 1 });

const Comment = mongoose.model('Comment', commentSchema);

export default Comment;
