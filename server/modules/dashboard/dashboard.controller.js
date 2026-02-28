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
