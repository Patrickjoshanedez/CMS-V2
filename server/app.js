import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { generalLimiter } from './middleware/rateLimiter.js';
import errorHandler from './middleware/errorHandler.js';
import AppError from './utils/AppError.js';
import env from './config/env.js';

// --- Route imports ---
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/user.routes.js';
import teamRoutes from './modules/teams/team.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import projectRoutes from './modules/projects/project.routes.js';
import submissionRoutes from './modules/submissions/submission.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import evaluationRoutes from './modules/evaluations/evaluation.routes.js';

const app = express();

// ---------- Global Middleware ----------

// Security headers
app.use(helmet());

// CORS — allow the client origin with credentials (cookies)
app.use(
  cors({
    origin: env.CLIENT_URL,
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

// General rate limiter (100 requests per 15 minutes)
app.use(generalLimiter);

// ---------- Health Check ----------

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CMS API is running.',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ---------- API Routes ----------

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/evaluations', evaluationRoutes);

// ---------- 404 Handler ----------

app.all('*', (req, res, next) => {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
});

// ---------- Global Error Handler ----------

app.use(errorHandler);

export default app;
