import mongoose from 'mongoose';

const { Schema } = mongoose;

const rectSchema = new Schema(
  {
    x1: { type: Number, required: true },
    y1: { type: Number, required: true },
    x2: { type: Number, required: true },
    y2: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    pageNumber: { type: Number },
  },
  { _id: false },
);

const replySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    authorRole: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const commentSchema = new Schema(
  {
    submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    authorRole: {
      type: String,
      enum: [
        'adviser',
        'chair',
        'member',
        'secretary',
        'student',
        'faculty',
        'instructor',
        'panelist',
      ],
      default: 'adviser',
    },
    pageNumber: { type: Number, required: true },
    // Multi-line ScaledPosition coordinate schema (react-pdf-highlighter-plus)
    position: {
      boundingRect: rectSchema,
      rects: [rectSchema],
    },
    // Legacy single-box coordinate schema for 100% backward compatibility
    coordinates: {
      x: { type: Number },
      y: { type: Number },
      width: { type: Number },
      height: { type: Number },
    },
    highlightText: { type: String, default: '' },
    highlightedText: { type: String, default: '' },
    commentText: { type: String, default: '' },
    text: { type: String, default: '' },
    category: {
      type: String,
      enum: ['Correction', 'Literature', 'Methodology', 'General'],
      default: 'General',
    },
    status: { type: String, enum: ['open', 'resolved'], default: 'open' },
    replies: [replySchema],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Mongoose 9 promise-style dual-write sync hook across validation and saving
commentSchema.pre(['validate', 'save'], async function () {
  if (this.position?.boundingRect) {
    this.coordinates = {
      x: this.position.boundingRect.x1,
      y: this.position.boundingRect.y1,
      width: this.position.boundingRect.width,
      height: this.position.boundingRect.height,
    };
  } else if (this.coordinates?.x !== undefined && !this.position?.boundingRect) {
    const { x, y, width, height } = this.coordinates;
    const rect = {
      x1: x,
      y1: y,
      x2: x + width,
      y2: y + height,
      width,
      height,
      pageNumber: this.pageNumber,
    };
    this.position = { boundingRect: rect, rects: [rect] };
  }

  // Synchronize text aliases
  if (!this.commentText && this.text) {
    this.commentText = this.text;
  } else if (!this.text && this.commentText) {
    this.text = this.commentText;
  }

  if (!this.highlightText && this.highlightedText) {
    this.highlightText = this.highlightedText;
  } else if (!this.highlightedText && this.highlightText) {
    this.highlightedText = this.highlightText;
  }
});

// Fast lookups when loading PDF overlays in the DocumentViewer
commentSchema.index({ submissionId: 1, pageNumber: 1 });
commentSchema.index(
  { submissionId: 1, pageNumber: 1, createdAt: -1 },
  { background: true, name: 'idx_comments_pagination' },
);

const Comment = mongoose.model('Comment', commentSchema);

export default Comment;
