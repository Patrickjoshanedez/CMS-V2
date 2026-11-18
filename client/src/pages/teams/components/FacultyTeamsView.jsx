import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { UsersRound, Search, X, Clock, Lock, AlertTriangle, UserCheck } from 'lucide-react';
import { ROLES } from '@cms/shared';
import PageSkeleton from '@/components/ui/PageSkeleton';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import AssignCommitteeDialog from '@/components/teams/AssignCommitteeDialog';
import { InspectRosterDialog } from '@/components/teams/InspectRosterDialog';
import { MetricGrid, StatCard, FilterToolbar } from '@/components/common';
import { useTeams, useTeamById, teamKeys } from '@/hooks/useTeams';
import { useAcademicYears, useSections } from '@/hooks/useAcademics';
import { formatSectionWithCode } from '@/utils/sectionUtils';
import { useTeamManager } from '../hooks/useTeamManager';
import EmptyTeamState from './EmptyTeamState';
import TeamCard from './TeamCard';
import FacultyTeamDetail from './FacultyTeamDetail';

const ALL_FILTER_VALUE = '__all__';
const NO_TEAM_VALUE = '__no_team__';

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
    <div className="space-y-6">
      <MetricGrid cols={4}>
        <StatCard
          label="Total Teams"
          value={stats.total}
          icon={UsersRound}
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <StatCard
          label="Awaiting Committee"
          value={stats.awaitingCommittee}
          icon={UserCheck}
          tone={stats.awaitingCommittee > 0 ? 'warning' : 'default'}
          active={statusFilter === 'awaiting_committee'}
          onClick={() => setStatusFilter('awaiting_committee')}
        />
        <StatCard
          label="Rosters Finalized"
          value={stats.finalized}
          icon={Lock}
          tone="success"
          active={statusFilter === 'finalized'}
          onClick={() => setStatusFilter('finalized')}
        />
        <StatCard
          label="In Formation"
          value={stats.forming}
          icon={Clock}
          tone="primary"
          active={statusFilter === 'forming'}
          onClick={() => setStatusFilter('forming')}
        />
      </MetricGrid>

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

      {/* Unified Filter Toolbar */}
      <FilterToolbar
        top={
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearch('')}
                  className="absolute right-1 top-1/2 size-8 min-h-8 min-w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <Select
              value={academicYear || ALL_FILTER_VALUE}
              onValueChange={(value) => {
                setAcademicYear(value === ALL_FILTER_VALUE ? '' : value);
                setSectionId('');
              }}
            >
              <SelectTrigger
                aria-label="Filter teams by academic year"
                className="h-9 min-h-9 text-xs"
              >
                <SelectValue placeholder="All Academic Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>All Academic Years</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={sectionId || ALL_FILTER_VALUE}
              onValueChange={(value) => setSectionId(value === ALL_FILTER_VALUE ? '' : value)}
              disabled={!academicYear}
            >
              <SelectTrigger aria-label="Filter teams by section" className="h-9 min-h-9 text-xs">
                <SelectValue placeholder="All Sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>All Sections</SelectItem>
                {sections.map((section) => (
                  <SelectItem key={section._id} value={section._id}>
                    {formatSectionWithCode(section)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
        }
        footer={
          <>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
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
                className="h-7 gap-1.5 text-xs text-warning"
                onClick={() => setStatusFilter('awaiting_committee')}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
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
              <Select
                value={selectedTeamId || NO_TEAM_VALUE}
                onValueChange={(id) => {
                  if (id === NO_TEAM_VALUE) {
                    setSelectedTeamId(null);
                    return;
                  }
                  setSelectedTeamId(id);
                  const found = teams.find((t) => t._id === id);
                  if (found) {
                    handleInspectTeam(found);
                  }
                }}
              >
                <SelectTrigger
                  id="teamQuickSelect"
                  aria-label="Quick jump to inspect a team"
                  className="h-9 min-h-9 w-full text-xs"
                >
                  <SelectValue placeholder="Quick Jump to Inspect Team..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TEAM_VALUE}>Quick Jump to Inspect Team...</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team._id} value={team._id}>
                      {team.name || 'Untitled Team'}
                      {team.isLocked ? ' [Locked]' : ' [Forming]'}
                      {team.academicYear ? ` • ${team.academicYear}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        }
      />

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
              <div key={team._id} className="min-w-0 max-w-full">
                <TeamCard
                  team={team}
                  isSelected={isSelected}
                  onSelect={() => setSelectedTeamId(team._id)}
                  canAssignCommittee={canAssignCommittee}
                  onInspect={handleInspectTeam}
                  onAssign={(teamToAssign) => openAssignCommittee(teamToAssign)}
                />
              </div>
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
