import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { generalLimiter } from './middleware/rateLimiter.js';
import errorHandler from './middleware/errorHandler.js';
import AppError from './utils/AppError.js';
import env from './config/env.js';
import authenticate from './middleware/authenticate.js';
import auditRequestCapture from './middleware/auditRequestCapture.js';

import checkMaintenance from './middleware/checkMaintenance.js';

// --- Route imports ---
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/user.routes.js';
import teamRoutes from './modules/teams/team.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import projectRoutes from './modules/projects/project.routes.js';
import proposalRoutes from './modules/proposals/proposal.routes.js';
import submissionRoutes from './modules/submissions/submission.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import evaluationRoutes from './modules/evaluations/evaluation.routes.js';
import settingsRoutes from './modules/settings/settings.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import documentRoutes from './modules/documents/document.routes.js';
import plagiarismRoutes from './modules/plagiarism/plagiarism.routes.js';
import academicRoutes from './modules/academics/academic.routes.js';
import agentRuntimeRoutes from './modules/agent-runtime/agentRuntime.routes.js';
import storageFileServerRouter from './middleware/storage-file-server.middleware.js';

const app = express();

// Respect X-Forwarded-* headers when running behind Nginx/Ingress.
if (env.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

// ---------- Global Middleware ----------

// Security headers
// Google popup-based auth requires COOP compatibility for postMessage.
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  }),
);

// CORS — allow configured origins with credentials (cookies)
app.use(
  cors({
    origin: env.CORS_ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Parse JSON request bodies (limit to 10kb to mitigate large-payload attacks)
app.use(express.json({ limit: '10kb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Parse cookies (for JWT access/refresh tokens)
app.use(cookieParser());

// General API rate limiter (keep auth endpoints on their dedicated limiters)
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth')) {
    return next();
  }

  return generalLimiter(req, res, next);
});

// ---------- Health Check ----------

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CMS API is running.',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ---------- Static File Storage Server (Filesystem Mode) ----------
// Keep route available in all environments so uploaded files can render,
// while requiring auth to prevent anonymous access.
app.use('/storage', authenticate, storageFileServerRouter);

// ---------- API Routes ----------

app.use(auditRequestCapture);

app.use('/api/auth', authRoutes);

// Global maintenance gate for authenticated API routes.
app.use('/api', authenticate, checkMaintenance());

app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/submissions', plagiarismRoutes);
app.use('/api/academics', academicRoutes);
app.use('/api/agent-runtime', agentRuntimeRoutes);

// ---------- 404 Handler ----------

app.all('/{*path}', (req, res, next) => {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
});

// ---------- Global Error Handler ----------

app.use(errorHandler);

export default app;
