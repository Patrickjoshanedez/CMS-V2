/**
 * Admin Queues Router — Bull Board integration for BullMQ observability.
 *
 * Mounts the @bull-board/express adapter at /admin/queues, providing a
 * real-time visual dashboard for inspecting active, delayed, completed,
 * and failed jobs across all BullMQ queues.
 *
 * Access Control:
 *   - Requires authentication (JWT cookie).
 *   - Restricted to INSTRUCTOR role only.
 *   - All access attempts are guarded by existing authenticate/authorize middleware.
 *
 * Available queues surfaced in the UI:
 *   - plagiarism-check       : Student submission originality check jobs
 *   - plagiarism-check-dlq   : Dead-Letter Queue for permanently failed plagiarism jobs
 *   - email-dispatch         : Outbound email notification jobs
 *
 * @module modules/admin/adminQueues.routes
 */
import { Router } from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import authenticate from '../../middleware/authenticate.js';
import authorize from '../../middleware/authorize.js';
import { ROLES } from '@cms/shared';
import {
  getPlagiarismQueue,
  getEmailQueue,
  getPlagiarismDlqQueue,
} from '../../jobs/queue.js';
import { isRedisAvailable } from '../../config/redis.js';

const router = Router();

// Guard all routes under /admin/queues
router.use(authenticate, authorize(ROLES.INSTRUCTOR));

/**
 * Lazily initialize the Bull Board adapter only when Redis is available.
 * Returns a 503 response when Redis is offline to prevent startup errors.
 */
router.use((req, res, next) => {
  if (!isRedisAvailable()) {
    return res.status(503).json({
      success: false,
      message: 'Queue dashboard unavailable: Redis connection is offline.',
    });
  }
  next();
});

// Create the Express adapter for Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

// Register all active queues; lazily retrieves each queue instance
const queues = [getPlagiarismQueue(), getPlagiarismDlqQueue(), getEmailQueue()].filter(Boolean);

if (queues.length > 0) {
  createBullBoard({
    queues: queues.map((q) => new BullMQAdapter(q)),
    serverAdapter,
  });
}

// Mount Bull Board's own Express router under the path prefix
router.use('/', serverAdapter.getRouter());

export default router;
