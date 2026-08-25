import React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { dashboardService } from '../../services/dashboardService';
import { useSettingsStore } from '@/stores/settingsStore';
import { CalendarScheduler } from './CalendarScheduler';
import KPICards from './KPICards';
import WorkloadHeatmap from './WorkloadHeatmap';
import OptimizationEngine from './OptimizationEngine';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import LoadingScreen from '@/components/ui/LoadingScreen';
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
    staleTime: 60 * 1000,
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
    staleTime: 30 * 1000,
  });

  const optimizeMutation = useMutation({
    mutationFn: async () => {
      const response = await dashboardService.optimizeInstructorWorkload();
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      refetchWorkload();
    },
  });

  if (kpisLoading || workloadLoading) {
    return <LoadingScreen fullScreen={false} message="Loading instructor command center..." />;
  }

  if (kpisError || workloadError) {
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
    <div className="space-y-6">
      {/* Page Header — card-based, matches FacultyDashboard style */}
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Instructor Command Center
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor capstone progress, adviser load, and balancing recommendations.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-center">
            <p className="text-[11px] uppercase font-semibold tracking-wide text-muted-foreground">
              Projects
            </p>
            <p className="text-2xl font-bold text-foreground">{kpis?.totals?.totalProjects || 0}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-center">
            <p className="text-[11px] uppercase font-semibold tracking-wide text-muted-foreground">
              Pending
            </p>
            <p className="text-2xl font-bold text-foreground">
              {kpis?.pipeline?.pendingSubmissions || 0}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-center">
            <p className="text-[11px] uppercase font-semibold tracking-wide text-muted-foreground">
              Completion
            </p>
            <p className="text-2xl font-bold text-foreground">
              {kpis?.performance?.completionRatePercent || 0}%
            </p>
          </div>
        </div>
      </div>

      <KPICards kpis={kpis} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <WorkloadHeatmap workload={workload} />
        </div>
        <div className="xl:col-span-2">
          <OptimizationEngine
            optimization={optimizeMutation.data}
            onGenerate={() => optimizeMutation.mutate()}
            loading={optimizeMutation.isPending}
          />
        </div>
      </div>

      {/* Visual Deadline Calendar */}
      <div className="rounded-2xl border border-border bg-card/60 p-4">
        <CalendarScheduler deadlines={deadlines} defenseSchedules={[]} />
      </div>
    </div>
  );
};

export default React.memo(InstructorDashboard);
