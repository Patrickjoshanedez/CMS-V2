import React from 'react';
import { Link, useInRouterContext } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardService } from '../../services/dashboardService';
import { projectService } from '@/services/authService';
import { useSettingsStore } from '@/stores/settingsStore';
import { CalendarScheduler } from './CalendarScheduler';
import KPICards from './KPICards';
import WorkloadHeatmap from './WorkloadHeatmap';
import OptimizationEngine from './OptimizationEngine';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import PageSkeleton from '@/components/ui/PageSkeleton';
import Skeleton from '@/components/ui/Skeleton';
import { PageHeader, MetricGrid, StatCard } from '@/components/common';
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

const INSTRUCTOR_QUICK_ACTIONS = [
  {
    to: '/committee-assignments',
    label: 'Assign Committees',
    icon: ShieldCheck,
    variant: 'default',
  },
  { to: '/scheduling-center', label: 'Schedule Defense', icon: Calendar, variant: 'outline' },
  { to: '/users', label: 'Manage Users', icon: Users, variant: 'outline' },
  { to: '/reports', label: 'Generate Reports', icon: BarChart3, variant: 'outline' },
  { to: '/archive/upload/capstone', label: 'Archive Upload', icon: Archive, variant: 'outline' },
];

const InstructorDashboard = () => {
  const inRouter = useInRouterContext();
  const queryClient = useQueryClient();
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

  const advancePhaseMutation = useMutation({
    mutationFn: async (projectId) => {
      const response = await projectService.advancePhase(projectId);
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      toast.success(
        `Advanced "${data?.project?.title || 'project'}" to Capstone ${data?.newPhase || 'next phase'}.`,
      );
      queryClient.invalidateQueries({ queryKey: ['instructorKpis'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.error?.message ||
          err?.message ||
          'Phase advancement is still blocked by unmet prerequisites.',
      );
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
    <div className="min-w-0 space-y-6">
      <PageHeader
        eyebrow="Instructor Workspace"
        title="Instructor Overview"
        description="Track capstone progress, faculty assignments, and upcoming deadlines."
      />

      <div
        data-testid="instructor-role-quick-actions"
        className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-xs"
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Instructor Quick Actions
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Direct shortcuts for committee appointments, defense scheduling, cohort administration,
            and repository archival.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {INSTRUCTOR_QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            const content = (
              <>
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{action.label}</span>
              </>
            );
            return (
              <Button
                key={action.to}
                asChild
                size="sm"
                variant={action.variant}
                className="min-h-11 sm:min-h-9 gap-1.5 text-xs"
              >
                {inRouter ? (
                  <Link to={action.to}>{content}</Link>
                ) : (
                  <a href={action.to}>{content}</a>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {kpisLoading ? (
        <MetricGrid cols={4}>
          {[1, 2, 3, 4].map((i) => (
            <StatCard key={i} label="Loading metric" loading />
          ))}
        </MetricGrid>
      ) : (
        <KPICards kpis={kpis} />
      )}

      {Array.isArray(kpis.phaseTransitionQueue) && kpis.phaseTransitionQueue.length > 0 && (
        <Card
          data-testid="instructor-phase-transition-queue"
          className="rounded-xl border border-border/60 bg-card shadow-xs"
        >
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                <CardTitle className="text-base font-semibold">
                  Phase Transition &amp; Grade Release Queue
                </CardTitle>
              </div>
              <Badge variant="outline" className="font-mono text-[10px]">
                {kpis.phaseTransitionQueue.filter((i) => i.readyToAdvance).length} Ready to Advance
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Active Capstone 1–3 projects ordered by grade-release readiness, phase advancement,
              and remaining committee blockers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {kpis.phaseTransitionQueue.slice(0, 6).map((item) => {
              const targetHref = `/projects/${item.projectId}?tab=capstone_${item.currentPhase}`;
              return (
                <div
                  key={item.projectId}
                  className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {item.projectTitle}
                      </span>
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        {item.teamName}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        Cap {item.currentPhase}
                        {item.nextPhase !== 'archive' ? ` → Cap ${item.nextPhase}` : ' → Archive'}
                      </Badge>
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {item.readyToAdvance ? (
                        <CheckCircle2
                          className="h-3.5 w-3.5 text-success shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-warning shrink-0" aria-hidden="true" />
                      )}
                      <span className="min-w-0 break-words">
                        {item.readyToAdvance
                          ? 'All exit prerequisites verified — ready for 1-click phase advancement.'
                          : item.readyToReleaseGrades
                            ? 'All panel evaluations submitted — open project to release grades.'
                            : item.blockerLabel || 'Review committee & deliverable gates.'}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {item.readyToAdvance && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => advancePhaseMutation.mutate(item.projectId)}
                        disabled={advancePhaseMutation.isPending}
                        className="min-h-11 sm:min-h-9 gap-1.5 text-xs font-semibold"
                      >
                        <span>Advance to Capstone {item.nextPhase}</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    )}
                    <Button
                      asChild
                      size="sm"
                      variant={
                        item.readyToReleaseGrades && !item.readyToAdvance ? 'default' : 'outline'
                      }
                      className="min-h-11 sm:min-h-9 gap-1.5 text-xs font-medium"
                    >
                      {inRouter ? (
                        <Link to={targetHref}>
                          <span>
                            {item.readyToReleaseGrades ? 'Release Grades' : 'Inspect Gates'}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      ) : (
                        <a href={targetHref}>
                          <span>
                            {item.readyToReleaseGrades ? 'Release Grades' : 'Inspect Gates'}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Balanced 12-Column Grid: Workload Heatmap (7 cols) + Optimization Engine (5 cols) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
        <div className="min-w-0 xl:col-span-7">
          {workloadLoading ? (
            <div
              role="status"
              aria-label="Loading adviser workload distribution"
              className="space-y-4 rounded-xl border border-border/60 bg-card p-6"
            >
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
