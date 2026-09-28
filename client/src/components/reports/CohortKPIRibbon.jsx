import PropTypes from 'prop-types';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
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
      colorScheme:
        'from-blue-500/10 to-transparent border-blue-500/20 text-blue-600 dark:text-blue-400 print:text-[#111827]',
    },
    {
      id: 'teams',
      label: 'Capstone Teams',
      value: isLoading ? <Skeleton className="h-8 w-16 rounded-md" /> : totalTeams.toLocaleString(),
      subtext: isLoading ? <Skeleton className="h-3.5 w-28 rounded" /> : teamsSubtext,
      icon: Layers,
      badge: isLoading ? <Skeleton className="h-4 w-16 rounded" /> : teamsBadge,
      colorScheme:
        'from-emerald-500/10 to-transparent border-emerald-500/20 text-emerald-600 dark:text-emerald-400 print:text-[#111827]',
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
      colorScheme:
        'from-indigo-500/10 to-transparent border-indigo-500/20 text-indigo-600 dark:text-indigo-400 print:text-[#111827]',
    },
    {
      id: 'yield',
      label: 'ADM Yield Rate',
      // Render percentage as primary hero number, sample denominator formatted cleanly in subtext
      value: isLoading ? <Skeleton className="h-8 w-16 rounded-md" /> : `${yieldRate}%`,
      subtext: isLoading ? <Skeleton className="h-3.5 w-28 rounded" /> : yieldSubtext,
      icon: Award,
      badge: isLoading ? <Skeleton className="h-4 w-16 rounded" /> : sampleBadge,
      colorScheme:
        'from-purple-500/10 to-transparent border-purple-500/20 text-purple-600 dark:text-purple-400 print:text-[#111827]',
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
            className={`relative overflow-hidden border border-border/80 bg-gradient-to-b ${kpi.colorScheme} shadow-xs hover:shadow-md transition-all group print:bg-white print:border-slate-300 print:shadow-none break-inside-avoid`}
          >
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3 print:p-3 print:space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground line-clamp-1 print:text-[#111827]">
                  {kpi.label}
                </span>
                <div
                  aria-hidden="true"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/80 border border-border/60 shadow-2xs group-hover:scale-105 transition-transform shrink-0 print:bg-white print:border-slate-300"
                >
                  <Icon className="h-4 w-4 print:text-[#111827]" />
                </div>
              </div>

              <div>
                <div className="text-xl sm:text-2xl font-black tracking-tight text-foreground print:text-[#111827] break-words flex items-center min-h-[32px]">
                  {kpi.value}
                </div>
                <div className="flex items-center justify-between gap-1 mt-1 pt-1.5 border-t border-border/40 text-[11px] print:border-slate-200">
                  <span
                    className="text-muted-foreground truncate print:text-slate-600 font-medium"
                    title={typeof kpi.subtext === 'string' ? kpi.subtext : undefined}
                  >
                    {kpi.subtext}
                  </span>
                  {typeof kpi.badge === 'string' ? (
                    <span
                      aria-label={`Status: ${kpi.badge}`}
                      className="font-semibold text-foreground/80 shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-background/60 border border-border/40 print:bg-slate-100 print:border-slate-300 print:text-[#111827]"
                    >
                      {kpi.badge}
                    </span>
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
