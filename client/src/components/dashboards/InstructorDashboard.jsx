import React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { dashboardService } from '../../services/dashboardService';
import { useSettingsStore } from '@/stores/settingsStore';
import { CalendarScheduler } from './CalendarScheduler';
import KPICards from './KPICards';
import WorkloadHeatmap from './WorkloadHeatmap';
import OptimizationEngine from './OptimizationEngine';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import PageSkeleton from '@/components/ui/PageSkeleton';
import Skeleton from '@/components/ui/Skeleton';
import { AlertTriangle } from 'lucide-react';

const InstructorDashboard = () => {
  const { deadlines = [] } = useSettingsStore();
  const {
    data: kpisData,
    isLoading: kpisLoading,
    error: kpisError,
  } = useQuery({
    queryKey: ['instructorKpis'],
    queryFn: async () => {
      const response = await dashboardService.getInstructorKpis();
      return response.data?.data || response.data;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const {
    data: workloadData,
    isLoading: workloadLoading,
    error: workloadError,
    refetch: refetchWorkload,
  } = useQuery({
    queryKey: ['instructorWorkload'],
    queryFn: async () => {
      const response = await dashboardService.getInstructorWorkload();
      return response.data?.data || response.data;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const [roleScope, setRoleScope] = React.useState('all');

  const optimizeMutation = useMutation({
    mutationFn: async (scope = roleScope) => {
      const response = await dashboardService.optimizeInstructorWorkload({ roleScope: scope });
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      refetchWorkload();
    },
  });

  if (kpisLoading && workloadLoading && !kpisData && !workloadData) {
    return <PageSkeleton />;
  }

  if (kpisError && workloadError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Failed to load instructor dashboard data.</AlertDescription>
      </Alert>
    );
  }

  const kpis = kpisData || {};
  const workload = workloadData || {};

  return (
    <div className="min-w-0 space-y-6 lg:space-y-8">
      {/* Page Header - Clean Linear-Grade Command Bar */}
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Instructor Overview
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Track capstone progress, faculty assignments, and upcoming deadlines.
          </p>
        </div>
      </div>

      {kpisLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading dashboard metrics">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <KPICards kpis={kpis} />
      )}

      {/* Balanced 12-Column Grid: Workload Heatmap (7 cols) + Optimization Engine (5 cols) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
        <div className="min-w-0 xl:col-span-7">
          {workloadLoading ? (
            <div role="status" aria-label="Loading adviser workload distribution" className="space-y-4 rounded-xl border border-border/60 bg-card p-6">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <WorkloadHeatmap workload={workload} />
          )}
        </div>
        <div className="min-w-0 xl:col-span-5">
          <OptimizationEngine
            optimization={optimizeMutation.data}
            onGenerate={(scope) => optimizeMutation.mutate(scope)}
            loading={optimizeMutation.isPending}
            roleScope={roleScope}
            onRoleScopeChange={setRoleScope}
          />
        </div>
      </div>

      {/* Visual Deadline Calendar */}
      <div className="min-w-0">
        <CalendarScheduler deadlines={deadlines} defenseSchedules={[]} />
      </div>
    </div>
  );
};

export default React.memo(InstructorDashboard);
