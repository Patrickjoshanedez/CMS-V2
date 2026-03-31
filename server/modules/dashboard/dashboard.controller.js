/**
 * DashboardController — thin HTTP handler for dashboard stats.
 * Delegates all business logic to DashboardService.
 */
import dashboardService from './dashboard.service.js';
import catchAsync from '../../utils/catchAsync.js';

/**
 * GET /api/dashboard/stats
 * Returns role-aware dashboard statistics for the authenticated user.
 */
export const getStats = catchAsync(async (req, res) => {
  const stats = await dashboardService.getStats(req.user);

  res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * GET /api/dashboard/adviser/workload
 * Returns adviser's current workload: students awaiting review, overdue, upcoming deadlines.
 * Only accessible by ADVISER role.
 */
export const getAdviserWorkload = catchAsync(async (req, res) => {
  const workload = await dashboardService.getAdviserWorkload(req.user._id);

  res.status(200).json({
    success: true,
    message: 'Workload retrieved.',
    data: workload,
  });
});

/**
 * GET /api/dashboard/adviser/analytics
 * Returns adviser's review analytics: review velocity, approval rate, avg review time.
 * Only accessible by ADVISER role.
 */
export const getAdviserAnalytics = catchAsync(async (req, res) => {
  const analytics = await dashboardService.getAdviserAnalytics(req.user._id);

  res.status(200).json({
    success: true,
    message: 'Analytics retrieved.',
    data: analytics,
  });
});

/**
 * GET /api/dashboard/panelist/topics
 * Returns projects/topics available or assigned to the panelist.
 */
export const getPanelistTopics = catchAsync(async (req, res) => {
  const topics = await dashboardService.getPanelistTopics(req.user._id);

  res.status(200).json({
    success: true,
    message: 'Panelist topics retrieved.',
    data: topics,
  });
});

/**
 * POST /api/dashboard/panelist/topics/:projectId/select
 * Assign current panelist to a project topic.
 */
export const selectPanelistTopic = catchAsync(async (req, res) => {
  const result = await dashboardService.selectPanelistTopic(req.params.projectId, req.user._id);

  res.status(200).json({
    success: true,
    message: 'Project selected for paneling.',
    data: result,
  });
});

/**
 * GET /api/dashboard/instructor/kpis
 * Returns instructor command-center KPI metrics.
 */
export const getInstructorKpis = catchAsync(async (req, res) => {
  const kpis = await dashboardService.getInstructorKpis(req.user._id);

  res.status(200).json({
    success: true,
    message: 'Instructor KPIs retrieved.',
    data: kpis,
  });
});

/**
 * GET /api/dashboard/instructor/workload
 * Returns adviser workload matrix for instructor oversight.
 */
export const getInstructorWorkload = catchAsync(async (req, res) => {
  const workload = await dashboardService.getInstructorWorkload(req.user._id);

  res.status(200).json({
    success: true,
    message: 'Instructor workload overview retrieved.',
    data: workload,
  });
});

/**
 * POST /api/dashboard/instructor/optimize
 * Returns optimization suggestions for adviser assignment balancing.
 */
export const optimizeInstructorWorkload = catchAsync(async (req, res) => {
  const optimization = await dashboardService.optimizeInstructorWorkload(req.user._id);

  res.status(200).json({
    success: true,
    message: 'Optimization suggestions generated.',
    data: optimization,
  });
});
