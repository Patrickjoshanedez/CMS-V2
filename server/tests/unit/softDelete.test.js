import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import softDeletePlugin from '../../middleware/softDelete.js';

describe('softDeletePlugin', () => {
  it('adds isDeleted and deletedAt to schema', () => {
    const testSchema = new mongoose.Schema({ name: String });
    testSchema.plugin(softDeletePlugin);

    expect(testSchema.path('isDeleted')).toBeDefined();
    expect(testSchema.path('deletedAt')).toBeDefined();
    expect(typeof testSchema.methods.softDelete).toBe('function');
    expect(typeof testSchema.methods.restore).toBe('function');
  });
});
