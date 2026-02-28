import User from './user.model.js';
import AppError from '../../utils/AppError.js';

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
    const user = await User.findById(userId).populate('teamId', 'name isLocked');
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }
    return { user };
  }

  /**
   * Update the currently authenticated user's own profile.
   * Only name and profilePicture can be self-updated.
   * @param {string} userId
   * @param {Object} data - { name?, profilePicture? }
   * @returns {Object} { user }
   */
  async updateMe(userId, data) {
    const allowedFields = ['name', 'profilePicture'];
    const updateData = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
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
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('teamId', 'name'),
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
      new: true,
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
      { new: true, runValidators: true },
    );

    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
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
      { new: true },
    );

    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    return { user };
  }
}

export default new UserService();
