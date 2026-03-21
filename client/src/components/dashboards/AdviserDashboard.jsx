import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../../services/dashboardService';
import AdviserWorkloadCard from './AdviserWorkloadCard';
import AdviserAnalytics from './AdviserAnalytics';

/**
 * AdviserDashboard — Main adviser-facing dashboard with workload & analytics tabs.
 * Phase 2: Workload tracking and performance analytics.
 *
 * Features:
 * - Tab-based navigation between Workload and Analytics
 * - Workload tab: Students awaiting review, overdue, upcoming deadlines
 * - Analytics tab: Review velocity, approval rate, avg review time charts
 */
const AdviserDashboard = () => {
  const [activeTab, setActiveTab] = useState('workload');

  // Fetch workload data
  const {
    data: workloadData,
    isLoading: workloadLoading,
    error: workloadError,
    refetch: refetchWorkload,
  } = useQuery({
    queryKey: ['adviserWorkload'],
    queryFn: () => dashboardService.getAdviserWorkload(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000, // Refresh every 30 seconds for deadline awareness
  });

  // Fetch analytics data
  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useQuery({
    queryKey: ['adviserAnalytics'],
    queryFn: () => dashboardService.getAdviserAnalytics(),
    staleTime: 1 * 60 * 60 * 1000, // 1 hour (analytics less frequently updated)
  });

  const handleRefresh = () => {
    refetchWorkload();
  };

  const resolvedWorkload = workloadData?.data?.data || workloadData?.data || workloadData || null;
  const resolvedAnalytics =
    analyticsData?.data?.data || analyticsData?.data || analyticsData || null;

  return (
    <div className="min-h-screen rounded-2xl border border-border bg-background p-4 shadow-sm sm:p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Adviser Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage your capstone reviews and track performance metrics
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8 flex gap-4 border-b border-border">
        <button
          onClick={() => setActiveTab('workload')}
          className={`px-6 py-3 text-lg font-semibold border-b-2 transition-colors ${
            activeTab === 'workload'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          📋 Workload
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-6 py-3 text-lg font-semibold border-b-2 transition-colors ${
            activeTab === 'analytics'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          📊 Analytics
        </button>
      </div>

      {/* Workload Tab */}
      {activeTab === 'workload' && (
        <div>
          {/* Refresh Button */}
          <div className="mb-6">
            <button
              onClick={handleRefresh}
              disabled={workloadLoading}
              className="rounded-lg border border-border bg-card px-4 py-2 font-semibold text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {workloadLoading ? '⟳ Refreshing...' : '⟳ Refresh'}
            </button>
          </div>

          {/* Loading State */}
          {workloadLoading && !workloadData && (
            <div className="text-center py-12">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
              <p className="text-muted-foreground">Loading workload data...</p>
            </div>
          )}

          {/* Error State */}
          {workloadError && (
            <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <p className="text-destructive">
                <span className="font-semibold">Error:</span> {workloadError.message}
              </p>
            </div>
          )}

          {/* Workload Content */}
          {resolvedWorkload && <AdviserWorkloadCard workload={resolvedWorkload} />}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div>
          {/* Loading State */}
          {analyticsLoading && !analyticsData && (
            <div className="text-center py-12">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
              <p className="text-muted-foreground">Loading analytics data...</p>
            </div>
          )}

          {/* Error State */}
          {analyticsError && (
            <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <p className="text-destructive">
                <span className="font-semibold">Error:</span> {analyticsError.message}
              </p>
            </div>
          )}

          {/* Analytics Content */}
          {resolvedAnalytics && <AdviserAnalytics analytics={resolvedAnalytics} />}
        </div>
      )}
    </div>
  );
};

export default React.memo(AdviserDashboard);
