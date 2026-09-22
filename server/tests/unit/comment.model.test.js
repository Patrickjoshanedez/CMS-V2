import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import Comment from '../../modules/submissions/comment.model.js';

describe('Comment Model Unit Tests', () => {
  const dummySubmissionId = new mongoose.Types.ObjectId();
  const dummyAuthorId = new mongoose.Types.ObjectId();

  it('populates coordinates from position.boundingRect in pre-save hook', async () => {
    const comment = new Comment({
      submissionId: dummySubmissionId,
      authorId: dummyAuthorId,
      authorName: 'Dr. Glaiza Mae Libe',
      authorRole: 'adviser',
      pageNumber: 2,
      position: {
        boundingRect: {
          x1: 50,
          y1: 100,
          x2: 250,
          y2: 130,
          width: 200,
          height: 30,
          pageNumber: 2,
        },
        rects: [
          {
            x1: 50,
            y1: 100,
            x2: 250,
            y2: 130,
            width: 200,
            height: 30,
            pageNumber: 2,
          },
        ],
      },
      commentText: 'Clarify telemetry edge-processing latency.',
    });

    // Validate triggers pre-validate lifecycle hook
    await comment.validate();

    expect(comment.coordinates).toBeDefined();
    expect(comment.coordinates.x).toBe(50);
    expect(comment.coordinates.y).toBe(100);
    expect(comment.coordinates.width).toBe(200);
    expect(comment.coordinates.height).toBe(30);
    expect(comment.text).toBe('Clarify telemetry edge-processing latency.');
  });

  it('populates position from coordinates when position is missing', async () => {
    const comment = new Comment({
      submissionId: dummySubmissionId,
      authorId: dummyAuthorId,
      authorName: 'Louie Labastida',
      authorRole: 'chair',
      pageNumber: 3,
      coordinates: {
        x: 80,
        y: 120,
        width: 150,
        height: 25,
      },
      text: 'Provide hardware circuit diagram.',
    });

    await comment.validate();

    expect(comment.position).toBeDefined();
    expect(comment.position.boundingRect).toBeDefined();
    expect(comment.position.boundingRect.x1).toBe(80);
    expect(comment.position.boundingRect.y1).toBe(120);
    expect(comment.position.boundingRect.x2).toBe(230);
    expect(comment.position.boundingRect.y2).toBe(145);
    expect(comment.position.boundingRect.width).toBe(150);
    expect(comment.position.boundingRect.height).toBe(25);
    expect(comment.commentText).toBe('Provide hardware circuit diagram.');
  });

  it('supports replies and updates status correctly', () => {
    const comment = new Comment({
      submissionId: dummySubmissionId,
      authorId: dummyAuthorId,
      authorName: 'Engr. Raul Lecaros',
      authorRole: 'member',
      pageNumber: 1,
      commentText: 'Check calibration frequency.',
      status: 'open',
    });

    expect(comment.status).toBe('open');
    comment.status = 'resolved';
    expect(comment.status).toBe('resolved');

    const replyUser = new mongoose.Types.ObjectId();
    comment.replies.push({
      userId: replyUser,
      authorName: 'Patrick Josh Añedez',
      authorRole: 'student',
      text: 'Recalibrated at 500ms intervals.',
      createdAt: new Date(),
    });

    expect(comment.replies).toHaveLength(1);
    expect(comment.replies[0].authorRole).toBe('student');
    expect(comment.replies[0].text).toBe('Recalibrated at 500ms intervals.');
  });
});
