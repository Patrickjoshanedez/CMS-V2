import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useQueryClient } from '@tanstack/react-query';
import { ROLES } from '@cms/shared';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TagInput } from '@/components/ui/TagInput';
import { UsersRound, UserCheck, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { useUsers } from '@/hooks/useUsers';
import { useAssignAdviser, useAssignPanelist, useRemovePanelist } from '@/hooks/useProjects';
import { teamKeys } from '@/hooks/useTeams';
import AssignCommitteeDialog from '@/components/teams/AssignCommitteeDialog';
import { formatName, formatCommitteeOption } from '../utils/teamFormatters';

export default function FacultyTeamDetail({ team, canAssignCommittee, onInspectRoster }) {
  const queryClient = useQueryClient();
  const [isCommitteeModalOpen, setIsCommitteeModalOpen] = useState(false);
  const leader = team.leaderId;
  const members = team.members || [];
  const assignment = team.assignment || {};
  const panelists = useMemo(() => assignment.panelists || [], [assignment.panelists]);
  const projectId = assignment.projectId || null;

  const { data: facultyUsersData, isLoading: isFacultyLoading } = useUsers(
    { role: ROLES.FACULTY, isActive: true, page: 1, limit: 200 },
    { enabled: canAssignCommittee },
  );

  const adviserOptions = useMemo(() => facultyUsersData?.users || [], [facultyUsersData?.users]);
  const panelistOptions = useMemo(() => facultyUsersData?.users || [], [facultyUsersData?.users]);
  const isAdvisersLoading = isFacultyLoading;
  const isPanelistsLoading = isFacultyLoading;

  const adviserSuggestions = useMemo(
    () =>
      adviserOptions
        .filter((adviser) => {
          const advId = String(adviser._id);
          const secretaryId = String(assignment.secretary?._id || '');
          if (advId === secretaryId) return false;
          if (panelists.some((p) => String(p?._id || p) === advId)) return false;
          return true;
        })
        .map(formatCommitteeOption),
    [adviserOptions, assignment.secretary, panelists],
  );

  const panelistSuggestions = useMemo(
    () =>
      panelistOptions
        .filter((panelist) => {
          const panId = String(panelist._id);
          const adviserId = String(assignment.adviser?._id || '');
          const secretaryId = String(assignment.secretary?._id || '');
          if (panId === adviserId) return false;
          if (panId === secretaryId) return false;
          if (
            panelists.some(
              (currentPanelist) => String(currentPanelist?._id || currentPanelist) === panId,
            )
          )
            return false;
          return true;
        })
        .map(formatCommitteeOption),
    [panelistOptions, panelists, assignment.adviser, assignment.secretary],
  );

  const assignAdviser = useAssignAdviser({
    onSuccess: () => {
      toast.success('Adviser assigned successfully.');
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error?.message || 'Failed to assign adviser.');
    },
  });

  const assignPanelist = useAssignPanelist({
    onSuccess: () => {
      toast.success('Panelist assigned successfully.');
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error?.message || 'Failed to assign panelist.');
    },
  });

  const removePanelist = useRemovePanelist({
    onSuccess: () => {
      toast.success('Panelist removed successfully.');
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error?.message || 'Failed to remove panelist.');
    },
  });

  const handleAdviserSelect = (selectedTags) => {
    const selectedLabel = selectedTags.at(-1);
    if (!selectedLabel || !projectId) {
      return;
    }

    const selectedAdviser = adviserOptions.find(
      (adviser) => formatCommitteeOption(adviser) === selectedLabel,
    );
    if (!selectedAdviser) {
      toast.error('Select a valid adviser from the suggestions.');
      return;
    }

    const adviserCandidateId = String(selectedAdviser._id);
    if (String(assignment.adviser?._id || '') === adviserCandidateId) {
      toast.error('This adviser is already assigned.');
      return;
    }

    if (String(assignment.secretary?._id || '') === adviserCandidateId) {
      toast.error('A committee secretary cannot serve as adviser on the same team.');
      return;
    }

    if (panelists.some((p) => String(p?._id || p) === adviserCandidateId)) {
      toast.error('A defense panelist cannot serve as adviser on the same team.');
      return;
    }

    assignAdviser.mutate({ projectId, adviserId: selectedAdviser._id });
  };

  const handlePanelistSelect = (selectedTags) => {
    const selectedLabel = selectedTags.at(-1);
    if (!selectedLabel || !projectId) {
      return;
    }

    const selectedPanelist = panelistOptions.find(
      (panelist) => formatCommitteeOption(panelist) === selectedLabel,
    );
    if (!selectedPanelist) {
      toast.error('Select a valid panelist from the suggestions.');
      return;
    }

    const panelistCandidateId = String(selectedPanelist._id);
    if (String(assignment.adviser?._id || '') === panelistCandidateId) {
      toast.error('A faculty adviser cannot serve as a defense panelist on the same team.');
      return;
    }

    if (String(assignment.secretary?._id || '') === panelistCandidateId) {
      toast.error('A committee secretary cannot serve as a defense panelist on the same team.');
      return;
    }

    if (panelists.some((panelist) => String(panelist?._id || panelist) === panelistCandidateId)) {
      toast.error('This panelist is already assigned to the team.');
      return;
    }

    assignPanelist.mutate({ projectId, panelistId: selectedPanelist._id });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch justify-between gap-3 space-y-0 pb-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <CardTitle className="break-words text-lg [overflow-wrap:anywhere]">
            {team.name || 'Untitled Team'}
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <span>
              {members.length} member{members.length !== 1 ? 's' : ''}
            </span>
            {team.academicYear && (
              <>
                <span>&bull;</span>
                <span>{team.academicYear}</span>
              </>
            )}
          </CardDescription>
        </div>
        <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
          {onInspectRoster && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-xs gap-1.5 font-medium shrink-0"
              onClick={() => onInspectRoster(team)}
            >
              <UsersRound className="h-3.5 w-3.5" />
              Inspect Full Roster
            </Button>
          )}
          {canAssignCommittee && (
            <Button
              type="button"
              size="sm"
              className="text-xs bg-primary hover:bg-primary/90 gap-1.5 font-medium shrink-0"
              onClick={() => setIsCommitteeModalOpen(true)}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Assign Committee
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Team Leader
          </p>
          <p className="mt-1 break-words text-sm font-medium [overflow-wrap:anywhere]">
            {formatName(leader)}
          </p>
          <p className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
            {leader?.email || 'No email provided'}
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Current Capstone Committee
          </p>
          <div className="space-y-2">
            <div className="rounded-md border p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Instructor
              </p>
              <p className="mt-1 text-sm font-medium">
                {assignment.instructor ? formatName(assignment.instructor) : 'Not assigned yet'}
              </p>
              <p className="text-xs text-muted-foreground">
                {assignment.instructor?.email || 'No instructor assigned yet'}
              </p>
            </div>

            <div className="rounded-md border p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Adviser
              </p>
              <p className="mt-1 text-sm font-medium">
                {assignment.adviser ? formatName(assignment.adviser) : 'Not assigned yet'}
              </p>
              <p className="text-xs text-muted-foreground">
                {assignment.adviser?.email || 'No adviser assigned yet'}
              </p>

              {canAssignCommittee && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Search and assign adviser
                  </p>
                  <TagInput
                    value={[]}
                    onChange={handleAdviserSelect}
                    suggestions={adviserSuggestions}
                    placeholder={
                      isAdvisersLoading ? 'Loading advisers...' : 'Type to search advisers'
                    }
                    maxTags={1}
                    disabled={!projectId || isAdvisersLoading || assignAdviser.isPending}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            <div className="rounded-md border p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Committee Secretary
              </p>
              <p className="mt-1 text-sm font-medium">
                {assignment.secretary ? formatName(assignment.secretary) : 'Not assigned yet'}
              </p>
              <p className="text-xs text-muted-foreground">
                {assignment.secretary?.email || 'No committee secretary assigned yet'}
              </p>
            </div>

            <div className="rounded-md border p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Panelists
              </p>
              {panelists.length > 0 ? (
                <div className="mt-1 space-y-1">
                  {panelists.map((panelist) => (
                    <div
                      key={panelist._id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <div>
                        <p className="break-words font-medium [overflow-wrap:anywhere]">
                          {formatName(panelist)}
                        </p>
                        <p className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                          {panelist.email}
                        </p>
                      </div>
                      {canAssignCommittee && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!projectId || removePanelist.isPending}
                          onClick={() =>
                            removePanelist.mutate({ projectId, panelistId: panelist._id })
                          }
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">No panelists assigned yet</p>
              )}

              {canAssignCommittee && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Search and add panelist
                  </p>
                  <TagInput
                    value={[]}
                    onChange={handlePanelistSelect}
                    suggestions={panelistSuggestions}
                    placeholder={
                      isPanelistsLoading ? 'Loading panelists...' : 'Type to search panelists'
                    }
                    maxTags={3}
                    disabled={
                      !projectId ||
                      isPanelistsLoading ||
                      assignPanelist.isPending ||
                      panelists.length >= 3
                    }
                    className="w-full"
                  />
                  {panelists.length >= 3 && (
                    <p className="text-xs text-muted-foreground">
                      This project already has the maximum number of panelists.
                    </p>
                  )}
                </div>
              )}

              {canAssignCommittee && !projectId && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Create and approve the team project first before assigning adviser and panelists.
                </p>
              )}
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Members
          </p>
          <div className="space-y-2">
            {members.map((member) => {
              const memberId = member._id || member;
              const isThisLeader = (leader?._id || leader) === memberId;

              return (
                <div key={memberId} className="flex items-center gap-3 rounded-md border p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {member.firstName?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{formatName(member)}</p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  {isThisLeader && (
                    <Badge variant="outline" className="gap-1">
                      <Crown className="h-3 w-3" />
                      Leader
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>

      {isCommitteeModalOpen && (
        <AssignCommitteeDialog
          open={isCommitteeModalOpen}
          onOpenChange={setIsCommitteeModalOpen}
          teamId={team._id}
          teamName={team.name}
          initialAdviserId={assignment.adviser?._id}
          initialSecretaryId={assignment.secretary?._id}
          initialPanelistIds={panelists.map((p) => p._id)}
        />
      )}
    </Card>
  );
}

FacultyTeamDetail.propTypes = {
  team: PropTypes.object.isRequired,
  canAssignCommittee: PropTypes.bool,
  onInspectRoster: PropTypes.func,
};
