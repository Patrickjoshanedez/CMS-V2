import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const OTP_TYPES = ['verification', 'password_reset'];

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'OTP code is required'],
    },
    type: {
      type: String,
      required: [true, 'OTP type is required'],
      enum: {
        values: OTP_TYPES,
        message: 'Type must be one of: ' + OTP_TYPES.join(', '),
      },
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// --- Indexes ---
// TTL index: MongoDB auto-deletes documents once expiresAt has passed
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ email: 1, type: 1 });

// --- Pre-save hook: hash OTP code before storage ---
otpSchema.pre('save', async function (next) {
  if (!this.isModified('code')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.code = await bcrypt.hash(this.code, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Compare a candidate plaintext OTP against the stored hash.
 * @param {string} candidateCode - The 6-digit OTP to compare
 * @returns {Promise<boolean>}
 */
otpSchema.methods.compareCode = async function (candidateCode) {
  return bcrypt.compare(candidateCode, this.code);
};

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;
