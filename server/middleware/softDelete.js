/**
 * Mongoose plugin for soft-delete functionality.
 *
 * Adds `isDeleted` and `deletedAt` fields to the schema.
 * Automatically filters out soft-deleted documents from `find`, `findOne`,
 * `findOneAndUpdate`, `countDocuments`, etc., unless explicitly overridden
 * via `includeDeleted()` query helper or `{ isDeleted: true }` in filter.
 *
 * Intercepts `deleteOne`, `deleteMany`, and `findOneAndDelete` queries to
 * soft-delete documents instead of removing them from the database.
 */

export function softDeletePlugin(schema) {
  schema.add({
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  });

  const queryMethods = [
    'find',
    'findOne',
    'findOneAndUpdate',
    'updateMany',
    'countDocuments',
    'estimatedDocumentCount',
  ];

  // Auto-exclude soft-deleted documents in standard queries
  queryMethods.forEach((method) => {
    schema.pre(method, function () {
      if (this.getOptions()?.includeDeleted) {
        return;
      }
      const query = this.getQuery();
      if (query && query.isDeleted === undefined) {
        this.where({ isDeleted: { $ne: true } });
      }
    });
  });

  // Query helper to include soft-deleted documents
  schema.query.includeDeleted = function () {
    return this.setOptions({ includeDeleted: true });
  };

  // Instance method to soft delete
  schema.methods.softDelete = async function (deletedBy = null) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    if (deletedBy && this.schema.path('deletedBy')) {
      this.deletedBy = deletedBy;
    }
    return this.save();
  };

  // Instance method to restore
  schema.methods.restore = async function () {
    this.isDeleted = false;
    this.deletedAt = null;
    return this.save();
  };

  // Intercept query-level deleteOne / deleteMany / findOneAndDelete
  schema.pre('deleteOne', { document: false, query: true }, async function () {
    if (this.getOptions()?.hardDelete) {
      return;
    }
    this.set({ isDeleted: true, deletedAt: new Date() });
    await this.model.updateMany(this.getQuery(), {
      $set: { isDeleted: true, deletedAt: new Date() },
    });
  });

  schema.pre('deleteMany', { document: false, query: true }, async function () {
    if (this.getOptions()?.hardDelete) {
      return;
    }
    await this.model.updateMany(this.getQuery(), {
      $set: { isDeleted: true, deletedAt: new Date() },
    });
  });

  schema.pre('findOneAndDelete', async function () {
    if (this.getOptions()?.hardDelete) {
      return;
    }
    this.setUpdate({
      $set: { isDeleted: true, deletedAt: new Date() },
    });
  });
}

export default softDeletePlugin;
