import React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { dashboardService } from '../../services/dashboardService';
import KPICards from './KPICards';
import WorkloadHeatmap from './WorkloadHeatmap';
import OptimizationEngine from './OptimizationEngine';

const InstructorDashboard = () => {
  const {
    data: kpisData,
    isLoading: kpisLoading,
    error: kpisError,
  } = useQuery({
    queryKey: ['instructorKpis'],
    queryFn: () => dashboardService.getInstructorKpis(),
    staleTime: 60 * 1000,
  });

  const {
    data: workloadData,
    isLoading: workloadLoading,
    error: workloadError,
    refetch: refetchWorkload,
  } = useQuery({
    queryKey: ['instructorWorkload'],
    queryFn: () => dashboardService.getInstructorWorkload(),
    staleTime: 30 * 1000,
  });

  const optimizeMutation = useMutation({
    mutationFn: () => dashboardService.optimizeInstructorWorkload(),
    onSuccess: () => {
      refetchWorkload();
    },
  });

  if (kpisLoading || workloadLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-8 text-center w-full max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-3 text-slate-600 font-medium">Loading instructor command center...</p>
        </div>
      </div>
    );
  }

  if (kpisError || workloadError) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Failed to load instructor dashboard data.
        </div>
      </div>
    );
  }

  const kpis = kpisData?.data || {};
  const workload = workloadData?.data || {};

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-blue-700 to-cyan-700 p-6 md:p-8 shadow-2xl">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20" />
          <div className="absolute -left-8 bottom-0 h-28 w-28 rounded-full bg-white/10" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] font-semibold text-white/80">
                Instructor Workspace
              </p>
              <h1 className="mt-2 text-3xl md:text-4xl font-bold text-white">
                Instructor Command Center
              </h1>
              <p className="mt-3 max-w-2xl text-white/85">
                Monitor capstone progress, adviser load, and balancing recommendations.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="rounded-xl bg-white/15 border border-white/20 p-3 backdrop-blur-sm">
                <p className="text-[11px] uppercase font-semibold tracking-wide text-white/70">
                  Projects
                </p>
                <p className="text-2xl font-bold text-white">{kpis?.totals?.totalProjects || 0}</p>
              </div>
              <div className="rounded-xl bg-white/15 border border-white/20 p-3 backdrop-blur-sm">
                <p className="text-[11px] uppercase font-semibold tracking-wide text-white/70">
                  Pending
                </p>
                <p className="text-2xl font-bold text-white">
                  {kpis?.pipeline?.pendingSubmissions || 0}
                </p>
              </div>
              <div className="rounded-xl bg-white/15 border border-white/20 p-3 backdrop-blur-sm col-span-2 md:col-span-1">
                <p className="text-[11px] uppercase font-semibold tracking-wide text-white/70">
                  Completion
                </p>
                <p className="text-2xl font-bold text-white">
                  {kpis?.performance?.completionRatePercent || 0}%
                </p>
              </div>
            </div>
          </div>
        </header>

        <KPICards kpis={kpis} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="xl:col-span-3">
            <WorkloadHeatmap workload={workload} />
          </div>
          <div className="xl:col-span-2">
            <OptimizationEngine
              optimization={optimizeMutation.data?.data}
              onGenerate={() => optimizeMutation.mutate()}
              loading={optimizeMutation.isPending}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(InstructorDashboard);
