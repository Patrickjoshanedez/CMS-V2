import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '@/services/dashboardService';
import AdviserTeamInteractionPanel from '@/components/dashboards/AdviserTeamInteractionPanel';
import { Button } from '@/components/ui/Button';

export default function TeamReviewWorkflowPage() {
  const navigate = useNavigate();

  const {
    data: workloadData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['adviserWorkload', 'teamReviewWorkflow'],
    queryFn: () => dashboardService.getAdviserWorkload(),
    staleTime: 60 * 1000,
    refetchInterval: 30 * 1000,
  });

  const workload = useMemo(
    () => workloadData?.data?.data || workloadData?.data || workloadData || null,
    [workloadData],
  );

  return (
    <section className="space-y-6 rounded-2xl border border-border bg-background p-4 shadow-sm sm:p-6">
      <header className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Team Review Workflow
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Review incoming submissions, manage revision follow-ups, and move teams through a clear
            chapter-by-chapter approval pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? 'Refreshing…' : 'Refresh Queue'}
          </Button>
          <Button onClick={() => navigate('/project/submissions')}>Open Submissions List</Button>
        </div>
      </header>

      {isLoading && !workload && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading team review queue...</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <span className="font-semibold">Unable to load team workflow:</span> {error.message}
        </div>
      )}

      {workload && <AdviserTeamInteractionPanel workload={workload} />}
    </section>
  );
}
