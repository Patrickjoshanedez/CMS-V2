import User from './user.model.js';
import AppError from '../../utils/AppError.js';
import { ROLES } from '@cms/shared';
import storageService from '../../services/storage.service.js';

/**
 * UserService — Business logic for user management (CRUD).
 * Instructor-only operations (list, create, edit, deactivate, role change, soft delete).
 * Profile operations for any authenticated user (get me, update me).
 */
class UserService {
  /**
   * Get the currently authenticated user's profile.
   * @param {string} userId
   * @returns {Object} { user }
   */
  async getMe(userId) {
    const userDoc = await User.findById(userId)
      .populate('teamId', 'name isLocked')
      .populate({
        path: 'sectionId',
        select: 'name academicYear code',
        populate: { path: 'courseId', select: 'name code' },
      })
      .populate('instructorId', 'firstName middleName lastName email');
    if (!userDoc) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    const user = userDoc.toObject();
    if (user.profilePicture) {
      try {
        user.avatarUrl = await storageService.getSignedUrl(user.profilePicture, 7200);
      } catch {
        user.avatarUrl = null;
      }
    }

    return { user };
  }

  /**
   * Update the currently authenticated user's own profile.
   * Only firstName, middleName, lastName, and profilePicture can be self-updated.
   * @param {string} userId
   * @param {Object} data - { firstName?, middleName?, lastName?, profilePicture? }
   * @returns {Object} { user }
   */
  async updateMe(userId, data) {
    const allowedFields = [
      'firstName',
      'middleName',
      'lastName',
      'profilePicture',
      'sectionId',
      'instructorId',
    ];
    const updateData = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    const user = await User.findByIdAndUpdate(userId, updateData, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    return { user };
  }

  /**
   * List all users (Instructor-only, paginated, filterable).
   * @param {Object} query - { page, limit, role?, search?, isActive? }
   * @returns {Object} { users, pagination }
   */
  async listUsers(query) {
    const { page = 1, limit = 20, role, search, isActive } = query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { middleName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('teamId', 'name'),
      User.countDocuments(filter),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a new user account (Instructor-only).
   * The created user is pre-verified (no OTP needed when created by Instructor).
   * @param {Object} data - { name, email, password, role }
   * @returns {Object} { user }
   */
  async createUser(data) {
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new AppError('An account with this email already exists.', 409, 'DUPLICATE_EMAIL');
    }

    const user = await User.create({
      ...data,
      isVerified: true, // Instructor-created users skip verification
    });

    return { user };
  }

  /**
   * Update a user's profile (Instructor-only).
   * Can update name, role, and active status.
   * @param {string} userId
   * @param {Object} data - { name?, role?, isActive? }
   * @returns {Object} { user }
   */
  async updateUser(userId, data) {
    const user = await User.findByIdAndUpdate(userId, data, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    return { user };
  }

  /**
   * Change a user's role (Instructor-only).
   * @param {string} userId
   * @param {string} role
   * @returns {Object} { user }
   */
  async changeRole(userId, role) {
    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { returnDocument: 'after', runValidators: true },
    );

    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    return { user };
  }

  /**
   * List all active instructors (any authenticated user can call this).
   * Used by students to select their instructor in profile settings.
   * @returns {Object} { instructors }
   */
  async listInstructors() {
    const instructors = await User.find({ role: ROLES.INSTRUCTOR, isActive: true })
      .select('firstName middleName lastName email')
      .sort({ firstName: 1 });
    return { instructors };
  }

  /**
   * Upload a profile picture to S3 and save the key to the user's profilePicture field.
   * @param {string} userId
   * @param {Buffer} buffer
   * @param {string} mimeType
   * @returns {Object} { user }
   */
  async uploadAvatar(userId, buffer, mimeType) {
    const key = storageService.buildAvatarKey(userId);
    await storageService.uploadFile(buffer, key, mimeType, { userId: userId.toString() });

    const userDoc = await User.findByIdAndUpdate(
      userId,
      { profilePicture: key },
      { returnDocument: 'after' },
    );
    if (!userDoc) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    const user = userDoc.toObject();
    try {
      user.avatarUrl = await storageService.getSignedUrl(key, 7200);
    } catch {
      user.avatarUrl = null;
    }

    return { user };
  }

  /**
   * Soft-delete a user (Instructor-only).
   * Sets isActive to false rather than removing the document.
   * @param {string} userId
   * @returns {Object} { user }
   */
  async deleteUser(userId) {
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { returnDocument: 'after' },
    );

    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    return { user };
  }

  /**
   * Import students from a CSV buffer.
   * @param {Buffer} buffer
   * @param {string} sectionId
   */
  async importStudents(buffer, sectionId) {
    const csvString = buffer.toString('utf8');
    const lines = csvString.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) throw new AppError('CSV is empty', 400);

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const firstNameIdx = headers.indexOf('firstname');
    const lastNameIdx = headers.indexOf('lastname');
    const emailIdx = headers.indexOf('email');
    const schoolIdIdx = headers.indexOf('schoolid');

    if (firstNameIdx === -1 || lastNameIdx === -1 || emailIdx === -1) {
      throw new AppError('CSV must contain firstName, lastName, and email columns.', 400);
    }

    let created = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim());
      if (parts.length < headers.length) continue;

      const firstName = parts[firstNameIdx];
      const lastName = parts[lastNameIdx];
      const email = parts[emailIdx];
      const schoolId = schoolIdIdx !== -1 ? parts[schoolIdIdx] : undefined;

      if (!email || !firstName || !lastName) {
        skipped++;
        continue;
      }

      try {
        const existing = await User.findOne({ email });
        if (existing) {
          // Update existing user with sectionId
          if (!existing.sectionId || existing.sectionId.toString() !== sectionId) {
            existing.sectionId = sectionId;
            await existing.save();
          }
          skipped++;
        } else {
          await User.create({
            firstName,
            lastName,
            email,
            schoolId,
            password: 'Password123!', // default password
            role: ROLES.STUDENT,
            sectionId,
            isVerified: true,
          });
          created++;
        }
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err.message}`);
        skipped++;
      }
    }

    return { created, skipped, errors };
  }
}

export default new UserService();
