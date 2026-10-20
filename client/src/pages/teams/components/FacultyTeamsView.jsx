import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  UsersRound,
  Search,
  X,
  Clock,
  Lock,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLES } from '@cms/shared';
import PageSkeleton from '@/components/ui/PageSkeleton';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import AssignCommitteeDialog from '@/components/teams/AssignCommitteeDialog';
import { InstructorTemplateConfigModal } from '@/components/teams/InstructorTemplateConfigModal';
import { InspectRosterDialog } from '@/components/teams/InspectRosterDialog';
import { useTeams, useTeamById, teamKeys } from '@/hooks/useTeams';
import { useAcademicYears, useSections } from '@/hooks/useAcademics';
import { formatSectionWithCode } from '@/utils/sectionUtils';
import { useTeamManager } from '../hooks/useTeamManager';
import EmptyTeamState from './EmptyTeamState';
import TeamCard from './TeamCard';
import FacultyTeamDetail from './FacultyTeamDetail';

/**
 * FacultyTeamsView - Institutional directory view for Instructors, Advisers, and Panelists
 * to monitor teams, filter rosters, inspect member details, and assign committee panels.
 */
export default function FacultyTeamsView({ canAssignCommittee }) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTeamId = searchParams.get('teamId');

  const teamManager = useTeamManager({ initialTeamId: urlTeamId || null });
  const {
    search,
    setSearch,
    filters,
    setFilters,
    selectedTeamId,
    setSelectedTeamId,
    statusFilter,
    setStatusFilter,
    inspectingTeam,
    setInspectingTeam,
    committeeModalTeam,
    academicYear,
    setAcademicYear,
    sectionId,
    setSectionId,
    openInspectRoster,
    closeInspectRoster,
    openAssignCommittee,
    closeAssignCommittee,
  } = teamManager;

  const { data: years = [] } = useAcademicYears();
  const { data: sections = [] } = useSections(
    { academicYear: academicYear || undefined },
    { enabled: Boolean(academicYear) },
  );

  const { data, isLoading: isLoadingTeams, isError, error } = useTeams(filters);

  // Targeted direct team lookup when deep-linked via URL
  const { data: directTeam } = useTeamById(urlTeamId, {
    enabled: Boolean(urlTeamId),
  });

  const teams = useMemo(() => data?.teams || [], [data?.teams]);
  const pagination = data?.pagination;

  // Sync deep-linked team from URL and auto-open roster inspection
  useEffect(() => {
    if (urlTeamId) {
      setSelectedTeamId(urlTeamId);
      const found = teams.find((t) => t._id === urlTeamId) || directTeam;
      if (found) {
        setInspectingTeam(found);
      }
    }
  }, [urlTeamId, teams, directTeam, setSelectedTeamId, setInspectingTeam]);

  const handleInspectTeam = (team) => {
    openInspectRoster(team);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('teamId', team._id);
    setSearchParams(newParams, { replace: true });
  };

  const handleCloseInspect = () => {
    closeInspectRoster();
    if (urlTeamId) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('teamId');
      setSearchParams(newParams, { replace: true });
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters({
      search: search.trim() || undefined,
      academicYear: academicYear || undefined,
      sectionId: sectionId || undefined,
      page: 1,
    });
  };

  const handleClearFilters = () => {
    teamManager.resetFilters();
    if (urlTeamId) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('teamId');
      setSearchParams(newParams, { replace: true });
    }
  };

  // Phase 0 metrics computed across current team catalog
  const stats = useMemo(() => {
    const total = pagination?.total ?? teams.length;
    const finalized = teams.filter((t) => t.isLocked).length;
    const forming = teams.filter((t) => !t.isLocked).length;
    const awaitingCommittee = teams.filter((t) => {
      const isLocked = Boolean(t.isLocked);
      const adviser = t.adviserId || t.assignment?.adviser;
      const panelists = t.panelistIds || t.assignment?.panelists || [];
      return isLocked && (!adviser || panelists.length < 3);
    }).length;

    return { total, finalized, forming, awaitingCommittee };
  }, [teams, pagination?.total]);

  // Client-side workflow status tab filtering
  const displayTeams = useMemo(() => {
    let list = teams;
    if (statusFilter === 'awaiting_committee') {
      list = list.filter((t) => {
        const isLocked = Boolean(t.isLocked);
        const adviser = t.adviserId || t.assignment?.adviser;
        const panelists = t.panelistIds || t.assignment?.panelists || [];
        return isLocked && (!adviser || panelists.length < 3);
      });
    } else if (statusFilter === 'finalized') {
      list = list.filter((t) => t.isLocked);
    } else if (statusFilter === 'forming') {
      list = list.filter((t) => !t.isLocked);
    }
    return list;
  }, [teams, statusFilter]);

  if (isLoadingTeams) {
    return <PageSkeleton />;
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error?.response?.data?.error?.message || 'Failed to load teams.'}
        </AlertDescription>
      </Alert>
    );
  }

  const selectedTeam =
    teams.find((team) => team._id === selectedTeamId) ||
    (directTeam?._id === selectedTeamId ? directTeam : null);

  return (
    <div className="space-y-5">
      {/* Top Banner / Template Config */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h4 className="text-base font-bold text-foreground tracking-tight">
            Phase 0: Team Roster & Committee Directory
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor proponent groupings, verify locked rosters, and appoint faculty committees.
          </p>
        </div>

        {canAssignCommittee && (
          <div className="shrink-0">
            <InstructorTemplateConfigModal academicYear={academicYear || '2025-2026'} />
          </div>
        )}
      </div>

      {/* Phase 0 Metric Cards Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter('all')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setStatusFilter('all');
            }
          }}
          className={cn(
            'cursor-pointer rounded-lg border p-3 text-left transition-all',
            statusFilter === 'all'
              ? 'border-primary bg-primary/10 shadow-xs'
              : 'border-border/70 bg-card hover:border-border',
          )}
        >
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium block">
            Total Teams
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-foreground">{stats.total}</span>
            <UsersRound className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter('awaiting_committee')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setStatusFilter('awaiting_committee');
            }
          }}
          className={cn(
            'cursor-pointer rounded-lg border p-3 text-left transition-all',
            statusFilter === 'awaiting_committee'
              ? 'border-amber-500 bg-amber-500/10 shadow-xs'
              : 'border-border/70 bg-card hover:border-border',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-amber-400 font-medium">
              Awaiting Committee
            </span>
            {stats.awaitingCommittee > 0 && (
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-amber-400">{stats.awaitingCommittee}</span>
            <UserCheck className="h-4 w-4 text-amber-400" />
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter('finalized')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setStatusFilter('finalized');
            }
          }}
          className={cn(
            'cursor-pointer rounded-lg border p-3 text-left transition-all',
            statusFilter === 'finalized'
              ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
              : 'border-border/70 bg-card hover:border-border',
          )}
        >
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium block">
            Rosters Finalized
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-emerald-400">{stats.finalized}</span>
            <Lock className="h-4 w-4 text-emerald-400" />
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter('forming')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setStatusFilter('forming');
            }
          }}
          className={cn(
            'cursor-pointer rounded-lg border p-3 text-left transition-all',
            statusFilter === 'forming'
              ? 'border-sky-500 bg-sky-500/10 shadow-xs'
              : 'border-border/70 bg-card hover:border-border',
          )}
        >
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium block">
            In Formation
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-sky-400">{stats.forming}</span>
            <Clock className="h-4 w-4 text-sky-400" />
          </div>
        </div>
      </div>

      {/* Deep-Link Notification Focus Banner */}
      {urlTeamId && (
        <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 px-4 py-2.5 text-xs text-primary animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <UsersRound className="h-4 w-4 shrink-0" />
            <span>
              Direct roster inspection for{' '}
              <strong className="font-semibold text-foreground">
                {selectedTeam?.name || 'Linked Team'}
              </strong>{' '}
              (Navigated from notification)
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-primary hover:bg-primary/20"
            onClick={handleClearFilters}
          >
            Show All Teams
          </Button>
        </div>
      )}

      {/* Modern Control Toolbar */}
      <div className="rounded-lg border border-border/70 bg-card/60 p-3.5 space-y-3">
        <form onSubmit={handleSearch} className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by team name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <select
            value={academicYear}
            onChange={(e) => {
              setAcademicYear(e.target.value);
              setSectionId('');
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground"
          >
            <option value="">All Academic Years</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            disabled={!academicYear}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground disabled:opacity-50"
          >
            <option value="">All Sections</option>
            {sections.map((section) => (
              <option key={section._id} value={section._id}>
                {formatSectionWithCode(section)}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <Button type="submit" variant="secondary" className="flex-1 h-9 text-xs">
              Filter
            </Button>
            {(search || academicYear || sectionId || statusFilter !== 'all') && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleClearFilters}
                className="h-9 text-xs text-muted-foreground hover:text-foreground px-2"
                title="Reset filters"
              >
                Reset
              </Button>
            )}
          </div>
        </form>

        {/* Quick Team Jump Dropdown & Tabs */}
        <div className="pt-1 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 pb-1 sm:pb-0">
            <Button
              type="button"
              variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setStatusFilter('all')}
            >
              All ({stats.total})
            </Button>
            <Button
              type="button"
              variant={statusFilter === 'awaiting_committee' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs text-amber-400 gap-1.5"
              onClick={() => setStatusFilter('awaiting_committee')}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Awaiting Committee ({stats.awaitingCommittee})
            </Button>
            <Button
              type="button"
              variant={statusFilter === 'finalized' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setStatusFilter('finalized')}
            >
              Finalized ({stats.finalized})
            </Button>
            <Button
              type="button"
              variant={statusFilter === 'forming' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setStatusFilter('forming')}
            >
              Forming ({stats.forming})
            </Button>
          </div>

          <div className="w-full sm:w-72 shrink-0">
            <select
              id="teamQuickSelect"
              value={selectedTeamId || ''}
              onChange={(e) => {
                const id = e.target.value;
                if (!id) {
                  setSelectedTeamId(null);
                  return;
                }
                setSelectedTeamId(id);
                const found = teams.find((t) => t._id === id);
                if (found) {
                  handleInspectTeam(found);
                }
              }}
              className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs text-foreground"
            >
              <option value="">Quick Jump to Inspect Team...</option>
              {teams.map((team) => (
                <option key={team._id} value={team._id}>
                  {team.name || 'Untitled Team'}
                  {team.isLocked ? ' [Locked]' : ' [Forming]'}
                  {team.academicYear ? ` • ${team.academicYear}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Selected Team Detail View (Maintains backwards compatibility for integration suites) */}
      {selectedTeam && (
        <FacultyTeamDetail
          team={selectedTeam}
          canAssignCommittee={canAssignCommittee}
          onInspectRoster={handleInspectTeam}
        />
      )}

      {/* Team Grid */}
      {displayTeams.length === 0 ? (
        <EmptyTeamState role={ROLES.INSTRUCTOR} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayTeams.map((team) => {
            const isSelected = selectedTeamId === team._id;

            return (
              <button
                key={team._id}
                type="button"
                onClick={() => {
                  setSelectedTeamId(team._id);
                }}
                className="min-w-0 max-w-full text-left rounded-lg transition-transform focus:outline-none"
                aria-pressed={isSelected}
                aria-label={`View details for ${team.name || 'team'}`}
              >
                <TeamCard
                  team={team}
                  isSelected={isSelected}
                  canAssignCommittee={canAssignCommittee}
                  onInspect={handleInspectTeam}
                  onAssign={(teamToAssign) => openAssignCommittee(teamToAssign)}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => setFilters((prev) => ({ ...prev, page: pagination.page - 1 }))}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setFilters((prev) => ({ ...prev, page: pagination.page + 1 }))}
          >
            Next
          </Button>
        </div>
      )}

      {/* Dedicated Roster Inspection Modal */}
      <InspectRosterDialog
        open={Boolean(inspectingTeam)}
        onOpenChange={(open) => {
          if (!open) handleCloseInspect();
        }}
        team={inspectingTeam}
        canAssignCommittee={canAssignCommittee}
        onAssignCommittee={(teamToAssign) => {
          openAssignCommittee(teamToAssign);
        }}
      />

      {/* Assigned Committee Dialog */}
      {committeeModalTeam && (
        <AssignCommitteeDialog
          open={Boolean(committeeModalTeam)}
          onOpenChange={(open) => {
            if (!open) closeAssignCommittee();
          }}
          teamId={committeeModalTeam._id}
          teamName={committeeModalTeam.name}
          initialAdviserId={
            committeeModalTeam.adviserId?._id ||
            committeeModalTeam.adviserId ||
            committeeModalTeam.assignment?.adviser?._id
          }
          initialSecretaryId={
            committeeModalTeam.secretaryId?._id ||
            committeeModalTeam.secretaryId ||
            committeeModalTeam.assignment?.secretary?._id
          }
          initialPanelistIds={(
            committeeModalTeam.panelistIds ||
            committeeModalTeam.assignment?.panelists ||
            []
          ).map((p) => p._id || p)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: teamKeys.all });
          }}
        />
      )}
    </div>
  );
}
