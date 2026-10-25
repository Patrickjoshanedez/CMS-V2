import PropTypes from 'prop-types';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { Users, Layers, GraduationCap, Award } from 'lucide-react';

/**
 * CohortKPIRibbon — Executive 4-Metric Institutional Capstone KPI Ribbon.
 *
 * Displays high-level cohort demographics and institutional progression metrics:
 * 1. Total Enrolled Proponents (with synchronized cohort lifecycle badge)
 * 2. Capstone Teams (with active vs archived team breakdown)
 * 3. Academic Sections (dynamic count & cohort scope badge)
 * 4. Archival & ADM Sign-Off Yield Rate (with explicit sample denominator and un-inflated sample badge)
 */
export default function CohortKPIRibbon({
  summary = {},
  activeAcademicYear = '',
  activeYear = '',
  selectedSection = '',
  isLoading = false,
}) {
  const totalStudents =
    summary.totalEnrolledStudents ?? summary.totalAuthorsStudents ?? summary.totalStudents ?? 0;
  const totalArchived = summary.totalCapstonesArchived ?? summary.totalArchived ?? 0;
  const totalTeams =
    summary.totalTeams ??
    (summary.totalCapstonesActive !== undefined
      ? summary.totalCapstonesActive + totalArchived
      : totalArchived > 0
        ? totalArchived
        : 0);

  const activeTeams =
    summary.totalCapstonesActive !== undefined
      ? summary.totalCapstonesActive
      : Math.max(0, totalTeams - totalArchived);

  const activeSections =
    selectedSection && selectedSection !== 'All Sections' && selectedSection !== 'All'
      ? 1
      : summary.totalSections || summary.sectionsCount || 4;

  const yieldCompleted = summary.yieldCompleted ?? totalArchived;
  const yieldTotal = summary.yieldTotal ?? totalTeams;
  const yieldRate =
    summary.yieldRate !== undefined
      ? summary.yieldRate
      : yieldTotal > 0
        ? Math.round((yieldCompleted / yieldTotal) * 100)
        : totalTeams === 0
          ? 0
          : 100;

  // Harmonized lifecycle determination: ensure Proponent and Team states never conflict
  const isArchivedCohort = Boolean(
    summary.isArchivedCohort || (totalArchived > 0 && activeTeams === 0),
  );

  const proponentBadge = isArchivedCohort
    ? 'Archived / Defended'
    : selectedSection && selectedSection !== 'All Sections' && selectedSection !== 'All'
      ? `${selectedSection} Enrolled`
      : 'Active Enrolled';

  const teamsSubtext = isArchivedCohort
    ? `${totalArchived} Sealed & Archived`
    : activeTeams > 0 && totalArchived > 0
      ? `${activeTeams} Active (${totalArchived} Sealed)`
      : `${totalTeams} Active In-Progress`;

  const teamsBadge = isArchivedCohort
    ? `${totalArchived} Completed`
    : `${activeTeams || totalTeams} In-Progress`;

  // Sample size-aware badge for ADM Yield Rate
  const sampleBadge =
    yieldTotal === 0
      ? 'No Teams'
      : yieldTotal <= 3
        ? `Sample N=${yieldTotal}`
        : yieldRate >= 90
          ? 'Institutional High'
          : yieldRate >= 75
            ? 'Compliant'
            : 'Attention Needed';

  const yieldSubtext =
    yieldTotal > 0 ? `${yieldCompleted}/${yieldTotal} Teams Completed` : '0/0 Teams';

  const yearText = activeAcademicYear || activeYear || 'AY 2025-2026';

  const kpis = [
    {
      id: 'students',
      label: 'Enrolled Proponents',
      value: isLoading ? (
        <Skeleton className="h-8 w-16 rounded-md" />
      ) : (
        totalStudents.toLocaleString()
      ),
      subtext: isLoading ? <Skeleton className="h-3.5 w-24 rounded" /> : `${yearText} Cohort`,
      icon: Users,
      badge: isLoading ? <Skeleton className="h-4 w-14 rounded" /> : proponentBadge,
      iconClassName: 'text-primary',
      iconSurfaceClassName: 'border-primary/20 bg-primary/5',
      badgeVariant: isArchivedCohort ? 'success' : 'secondary',
    },
    {
      id: 'teams',
      label: 'Capstone Teams',
      value: isLoading ? <Skeleton className="h-8 w-16 rounded-md" /> : totalTeams.toLocaleString(),
      subtext: isLoading ? <Skeleton className="h-3.5 w-28 rounded" /> : teamsSubtext,
      icon: Layers,
      badge: isLoading ? <Skeleton className="h-4 w-16 rounded" /> : teamsBadge,
      iconClassName: 'text-success',
      iconSurfaceClassName: 'border-success/20 bg-success/5',
      badgeVariant: isArchivedCohort ? 'success' : 'info',
    },
    {
      id: 'sections',
      label: 'Academic Sections',
      value: isLoading ? (
        <Skeleton className="h-8 w-16 rounded-md" />
      ) : (
        activeSections.toLocaleString()
      ),
      subtext: isLoading ? (
        <Skeleton className="h-3.5 w-24 rounded" />
      ) : selectedSection && selectedSection !== 'All Sections' && selectedSection !== 'All' ? (
        `${selectedSection} Selected`
      ) : (
        'IT Department Sections'
      ),
      icon: GraduationCap,
      badge: isLoading ? (
        <Skeleton className="h-4 w-14 rounded" />
      ) : selectedSection && selectedSection !== 'All Sections' && selectedSection !== 'All' ? (
        selectedSection
      ) : (
        'BSIT 4A - 4D'
      ),
      iconClassName: 'text-info',
      iconSurfaceClassName: 'border-info/20 bg-info/5',
      badgeVariant: 'secondary',
    },
    {
      id: 'yield',
      label: 'ADM Yield Rate',
      // Render percentage as primary hero number, sample denominator formatted cleanly in subtext
      value: isLoading ? <Skeleton className="h-8 w-16 rounded-md" /> : `${yieldRate}%`,
      subtext: isLoading ? <Skeleton className="h-3.5 w-28 rounded" /> : yieldSubtext,
      icon: Award,
      badge: isLoading ? <Skeleton className="h-4 w-16 rounded" /> : sampleBadge,
      iconClassName: 'text-warning',
      iconSurfaceClassName: 'border-warning/20 bg-warning/5',
      badgeVariant:
        yieldTotal <= 3
          ? 'warning'
          : yieldRate >= 90
            ? 'success'
            : yieldRate >= 75
              ? 'secondary'
              : 'destructive',
    },
  ];

  return (
    <div
      role="region"
      aria-label="Capstone cohort key performance indicators"
      data-testid="cohort-kpi-ribbon"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 print:grid-cols-4 print:gap-2"
    >
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const textValue = typeof kpi.value === 'string' ? kpi.value : '';
        return (
          <Card
            key={kpi.id}
            aria-label={`${kpi.label}: ${isLoading ? 'Loading' : `${textValue}, ${typeof kpi.subtext === 'string' ? kpi.subtext : ''}`}`}
            className="group relative break-inside-avoid overflow-hidden border-border/70 shadow-sm transition-colors hover:border-primary/35 print:shadow-none"
          >
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3 print:p-3 print:space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="line-clamp-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {kpi.label}
                </span>
                <div
                  aria-hidden="true"
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-md border transition-transform group-hover:scale-105',
                    kpi.iconSurfaceClassName,
                  )}
                >
                  <Icon className={cn('size-4', kpi.iconClassName)} />
                </div>
              </div>

              <div>
                <div className="flex min-h-8 items-center break-words text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {kpi.value}
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 border-t border-border/60 pt-1.5 text-[11px]">
                  <span
                    className="truncate font-medium text-muted-foreground"
                    title={typeof kpi.subtext === 'string' ? kpi.subtext : undefined}
                  >
                    {kpi.subtext}
                  </span>
                  {typeof kpi.badge === 'string' ? (
                    <Badge
                      aria-label={`Status: ${kpi.badge}`}
                      className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold"
                      variant={kpi.badgeVariant}
                    >
                      {kpi.badge}
                    </Badge>
                  ) : (
                    kpi.badge
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

CohortKPIRibbon.propTypes = {
  summary: PropTypes.object,
  activeAcademicYear: PropTypes.string,
  activeYear: PropTypes.string,
  selectedSection: PropTypes.string,
  isLoading: PropTypes.bool,
};
