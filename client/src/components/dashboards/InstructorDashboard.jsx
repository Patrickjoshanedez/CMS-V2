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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
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

  if (kpisLoading && workloadLoading) {
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
    <div className="space-y-6">
      {/* Page Header - Clean Linear-Grade Command Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Instructor Command Center
            </h1>
            <Badge variant="outline" className="text-[10px] font-semibold">
              AY {new Date().getFullYear()}–{new Date().getFullYear() + 1}
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Monitor capstone progress, adviser workload distribution, and automated rebalancing
            recommendations.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <Badge variant="success" className="gap-1.5 py-1 px-2.5 text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Advisory Monitoring Active
          </Badge>
        </div>
      </div>

      {kpisLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-muted/40 border border-border/60" />
          ))}
        </div>
      ) : (
        <KPICards kpis={kpis} />
      )}

      {/* Balanced 12-Column Grid: Workload Heatmap (7 cols) + Optimization Engine (5 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        <div className="lg:col-span-7">
          {workloadLoading ? (
            <div className="h-80 rounded-xl bg-muted/40 border border-border/60 animate-pulse p-6 flex items-center justify-center text-xs text-muted-foreground">
              Loading adviser workload distribution...
            </div>
          ) : (
            <WorkloadHeatmap workload={workload} />
          )}
        </div>
        <div className="lg:col-span-5">
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
      <div className="rounded-xl border border-border/60 bg-card p-5 shadow-xs">
        <CalendarScheduler deadlines={deadlines} defenseSchedules={[]} />
      </div>
    </div>
  );
};

export default React.memo(InstructorDashboard);
