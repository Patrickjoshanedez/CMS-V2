import PropTypes from 'prop-types';
import { Card, CardContent } from '@/components/ui/Card';
import {
  Users,
  Layers,
  GraduationCap,
  CalendarRange,
  CheckCircle2,
  TrendingUp,
  Award,
} from 'lucide-react';

/**
 * CohortKPIRibbon — Executive 5-Metric Institutional Capstone KPI Ribbon.
 *
 * Displays high-level cohort demographics and institutional progression metrics:
 * 1. Total Students / Proponents
 * 2. Active & Archived Capstone Teams
 * 3. Active Academic Sections
 * 4. Academic Cycle Progression Phase
 * 5. Archival & ADM Sign-Off Yield Rate
 */
export default function CohortKPIRibbon({
  summary = {},
  activeAcademicYear = '',
  currentPhase = 'Capstone 3 (Final)',
  isLoading = false,
}) {
  const totalStudents = summary.totalAuthorsStudents || summary.totalStudents || 0;
  const totalArchived = summary.totalCapstonesArchived || summary.totalArchived || 0;
  const totalTeams = summary.totalTeams || (totalArchived > 0 ? totalArchived : 0);
  const activeSections = summary.totalSections || summary.sectionsCount || 4;
  const yieldRate =
    summary.yieldRate !== undefined
      ? summary.yieldRate
      : totalTeams > 0
        ? Math.round((totalArchived / totalTeams) * 100)
        : 88;

  const kpis = [
    {
      id: 'students',
      label: 'Enrolled Proponents',
      value: isLoading ? '...' : totalStudents.toLocaleString(),
      subtext: `${activeAcademicYear || 'AY 2025-2026'} Cohort`,
      icon: Users,
      badge: 'Active Enrolled',
      colorScheme:
        'from-blue-500/10 to-transparent border-blue-500/20 text-blue-600 dark:text-blue-400',
    },
    {
      id: 'teams',
      label: 'Capstone Teams',
      value: isLoading ? '...' : totalTeams.toLocaleString(),
      subtext: `${totalArchived} Sealed & Archived`,
      icon: Layers,
      badge: `${totalArchived} Completed`,
      colorScheme:
        'from-emerald-500/10 to-transparent border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'sections',
      label: 'Academic Sections',
      value: isLoading ? '...' : activeSections.toLocaleString(),
      subtext: 'IT Department Sections',
      icon: GraduationCap,
      badge: 'BSIT 4A - 4D',
      colorScheme:
        'from-indigo-500/10 to-transparent border-indigo-500/20 text-indigo-600 dark:text-indigo-400',
    },
    {
      id: 'phase',
      label: 'Academic Cycle',
      value: isLoading ? '...' : summary.academicPhase || currentPhase,
      subtext: 'Current Milestone',
      icon: CalendarRange,
      badge: 'Defense Term',
      colorScheme:
        'from-amber-500/10 to-transparent border-amber-500/20 text-amber-600 dark:text-amber-400',
    },
    {
      id: 'yield',
      label: 'ADM Yield Rate',
      value: isLoading ? '...' : `${yieldRate}%`,
      subtext: 'Multi-Tier Compliance',
      icon: Award,
      badge: 'Institutional High',
      colorScheme:
        'from-purple-500/10 to-transparent border-purple-500/20 text-purple-600 dark:text-purple-400',
    },
  ];

  return (
    <div
      data-testid="cohort-kpi-ribbon"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5"
    >
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card
            key={kpi.id}
            className={`relative overflow-hidden border border-border/80 bg-gradient-to-b ${kpi.colorScheme} shadow-xs hover:shadow-md transition-all group`}
          >
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground line-clamp-1">
                  {kpi.label}
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/80 border border-border/60 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <div>
                <p className="text-2xl font-extrabold tracking-tight text-foreground">
                  {kpi.value}
                </p>
                <div className="flex items-center justify-between gap-1 mt-1 pt-1.5 border-t border-border/40 text-[11px]">
                  <span className="text-muted-foreground truncate">{kpi.subtext}</span>
                  <span className="font-semibold text-foreground/80 shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-background/60 border border-border/40">
                    {kpi.badge}
                  </span>
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
  currentPhase: PropTypes.string,
  isLoading: PropTypes.bool,
};
