import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    sessionVersion: {
      type: Number,
      default: 0,
      min: 0,
    },
    token: {
      type: String,
      required: [true, 'Token is required'],
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    replacedByToken: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// --- Indexes ---
// Note: token already has unique:true at field level — no need to duplicate
refreshTokenSchema.index({ userId: 1 });
// TTL index: auto-delete expired tokens (cleanup even if not revoked)
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Check if this refresh token is still valid (not expired and not revoked).
 * @returns {boolean}
 */
refreshTokenSchema.methods.isValid = function () {
  return !this.revokedAt && this.expiresAt > new Date();
};

/**
 * Revoke this refresh token.
 * @param {string} [replacementToken] - The hashed token that replaced this one (for rotation chain tracking)
 * @returns {Promise<void>}
 */
refreshTokenSchema.methods.revoke = async function (replacementToken = null) {
  this.revokedAt = new Date();
  if (replacementToken) {
    this.replacedByToken = replacementToken;
  }
  await this.save();
};

/**
 * Revoke all refresh tokens for a given user (used on logout).
 * @param {string} userId
 * @returns {Promise<void>}
 */
refreshTokenSchema.statics.revokeAllForUser = async function (userId) {
  await this.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() });
};

/**
 * Atomically consume one unexpired refresh token during rotation.
 *
 * @param {string} tokenId - Refresh token document ID
 * @param {string} tokenHash - Hash of the presented refresh token
 * @param {string} replacementToken - Hash of the newly persisted successor
 * @param {Date} now - Current time, injectable for deterministic callers/tests
 * @returns {Promise<Object|null>} The claimed token, or null if another request won
 */
refreshTokenSchema.statics.claimForRotation = function (
  tokenId,
  tokenHash,
  replacementToken,
  now = new Date(),
) {
  return this.findOneAndUpdate(
    {
      _id: tokenId,
      token: tokenHash,
      revokedAt: null,
      expiresAt: { $gt: now },
    },
    {
      $set: {
        revokedAt: now,
        replacedByToken: replacementToken,
      },
    },
    { new: true, runValidators: true },
  );
};

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

export default RefreshToken;
