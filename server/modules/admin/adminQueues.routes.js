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
import rateLimit from 'express-rate-limit';
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

/** Rate limiter for the admin queue dashboard: 60 requests per minute per IP. */
const adminQueueLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests to the queue dashboard.' },
});

const router = Router();

// Guard all routes under /admin/queues with rate limiting and role-based auth
router.use(adminQueueLimiter, authenticate, authorize(ROLES.INSTRUCTOR));

// Create the Express adapter for Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

/**
 * Initialize Bull Board with current queue instances.
 * Called lazily on each request so that queues that became available after
 * startup (e.g., Redis reconnect) are included.
 */
let boardInitialized = false;
function ensureBoardInitialized() {
  if (boardInitialized) return;

  const queues = [getPlagiarismQueue(), getPlagiarismDlqQueue(), getEmailQueue()].filter(Boolean);
  if (queues.length === 0) return;

  createBullBoard({
    queues: queues.map((q) => new BullMQAdapter(q)),
    serverAdapter,
  });
  boardInitialized = true;
}

/**
 * Lazily initialize the Bull Board adapter only when Redis is available.
 * Returns a 503 response when Redis is offline to prevent startup errors.
 * Calls ensureBoardInitialized() so newly available queues are registered.
 */
router.use((req, res, next) => {
  if (!isRedisAvailable()) {
    return res.status(503).json({
      success: false,
      message: 'Queue dashboard unavailable: Redis connection is offline.',
    });
  }
  ensureBoardInitialized();
  next();
});

// Mount Bull Board's own Express router under the path prefix
router.use('/', serverAdapter.getRouter());

export default router;
