import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { userService } from '@/services/authService';
import { useAssignAdviser, useAssignPanelist, useRemovePanelist } from '@/hooks/useProjects';
import { getFullName, getProjectAuthors } from '@/pages/projects/projectDetailUtils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Users, Search, UserPlus, CheckCircle2, Archive } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';

export default function FacultyWidget({ project, canManage }) {
  const [adviserQuery, setAdviserQuery] = useState('');
  const [showAdviserResults, setShowAdviserResults] = useState(false);
  const [panelistQuery, setPanelistQuery] = useState('');
  const [debouncedPanelistQuery, setDebouncedPanelistQuery] = useState('');
  const [showPanelistResults, setShowPanelistResults] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedPanelistQuery(panelistQuery.trim()), 250);
    return () => window.clearTimeout(t);
  }, [panelistQuery]);

  const { data: advisers = [] } = useQuery({
    queryKey: ['users', 'advisers'],
    queryFn: async () => {
      const { data } = await userService.listUsers({ role: 'adviser' });
      return data.data?.users || [];
    },
    enabled: canManage,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allPanelists = [] } = useQuery({
    queryKey: ['users', 'panelists'],
    queryFn: async () => {
      const { data } = await userService.listUsers({ role: 'panelist' });
      return data.data?.users || [];
    },
    enabled: canManage,
    staleTime: 5 * 60 * 1000,
  });

  const assignAdviser = useAssignAdviser({
    onSuccess: () => {
      toast.success('Adviser assigned!');
      setAdviserQuery('');
      setShowAdviserResults(false);
    },
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to assign adviser.'),
  });

  const assignPanelist = useAssignPanelist({
    onSuccess: () => {
      toast.success('Panelist assigned!');
      setPanelistQuery('');
      setDebouncedPanelistQuery('');
      setShowPanelistResults(false);
    },
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to assign panelist.'),
  });

  const removePanelist = useRemovePanelist({
    onSuccess: () => toast.success('Panelist removed.'),
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to remove panelist.'),
  });

  const authors = getProjectAuthors(project);
  const currentAdviser = project.adviserId ? getFullName(project.adviserId) : 'Not assigned';
  const currentPanelists = project.panelistIds || [];
  const assignedIds = new Set(currentPanelists.map((p) => (p._id || p).toString()));

  // Filter panelists by search query and exclude already-assigned
  const filteredPanelists = allPanelists.filter((u) => {
    if (assignedIds.has(u._id)) return false;
    if (!debouncedPanelistQuery) return true;
    const q = debouncedPanelistQuery.toLowerCase();
    const name = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
    return name.includes(q) || (u.email || '').toLowerCase().includes(q);
  });

  return (
    <Card className="rounded-2xl border-border bg-card shadow-lg">
      <CardHeader className="pb-3 border-b border-border">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
          <Users className="h-4 w-4 text-blue-500" />
          Faculty Committee
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Proponent Team Roster (FRAD2)
          </p>
          {Array.isArray(project.teamId?.members) && project.teamId.members.length > 0 ? (
            <div className="space-y-1.5">
              {project.teamId.members.map((member, idx) => {
                const memberUser = member.userId || member;
                const memberName = memberUser.firstName
                  ? `${memberUser.firstName} ${memberUser.lastName || ''}`.trim()
                  : memberUser.fullName || memberUser.email || `Member ${idx + 1}`;
                const isLeader =
                  (member.role === 'leader' ||
                    project.teamId?.leaderId === (memberUser._id || memberUser)) &&
                  true;

                return (
                  <div
                    key={member._id || idx}
                    className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-1.5 text-xs"
                  >
                    <span className="font-medium text-foreground truncate">{memberName}</span>
                    {isLeader ? (
                      <Badge variant="default" className="h-4 px-1.5 text-[9px] font-bold">
                        Leader
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="h-4 px-1.5 text-[9px] text-muted-foreground"
                      >
                        Member
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {authors.length > 0 ? (
                authors.map((author, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="bg-secondary text-secondary-foreground border-none"
                  >
                    {author}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No team members assigned</span>
              )}
            </div>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Adviser
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-card-foreground font-medium">{currentAdviser}</span>
          </div>
          {canManage && (
            <div className="mt-3 relative">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search adviser to assign..."
                  className="pl-8 h-9 text-sm"
                  value={adviserQuery}
                  onChange={(e) => {
                    setAdviserQuery(e.target.value);
                    setShowAdviserResults(true);
                  }}
                  onFocus={() => setShowAdviserResults(true)}
                  onBlur={() => window.setTimeout(() => setShowAdviserResults(false), 200)}
                  autoComplete="off"
                />
              </div>
              {showAdviserResults && adviserQuery.trim().length >= 1 && (
                <div className="absolute left-0 right-0 top-10 z-40 max-h-48 overflow-auto rounded-lg border border-border bg-popover shadow-xl">
                  {advisers.filter((u) => {
                    const q = adviserQuery.toLowerCase();
                    const name = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
                    return name.includes(q) || (u.email || '').toLowerCase().includes(q);
                  }).length > 0 ? (
                    <ul className="py-1">
                      {advisers
                        .filter((u) => {
                          const q = adviserQuery.toLowerCase();
                          const name = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
                          return name.includes(q) || (u.email || '').toLowerCase().includes(q);
                        })
                        .map((u) => (
                          <li key={u._id}>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                assignAdviser.mutate({ projectId: project._id, adviserId: u._id });
                              }}
                            >
                              <UserPlus className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">
                                  {u.firstName} {u.lastName}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {u.email}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                      No matching advisers found.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Panelists ({currentPanelists.length}/3)
          </p>
          <div className="space-y-2">
            {currentPanelists.length > 0 ? (
              currentPanelists.map((p, idx) => {
                const assignedRole =
                  p.role ||
                  project.panelists?.find(
                    (item) => item.userId === p._id || item.userId?._id === p._id,
                  )?.role ||
                  'member';
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm text-card-foreground bg-muted p-2 rounded-md group"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>{getFullName(p)}</span>
                      {assignedRole === 'chair' ? (
                        <Badge
                          variant="default"
                          className="text-[10px] px-1.5 py-0 h-4 bg-purple-600"
                        >
                          Chair
                        </Badge>
                      ) : assignedRole === 'secretary' ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4 border-blue-400 text-blue-600 dark:text-blue-400"
                        >
                          Secretary
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          Member
                        </Badge>
                      )}
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-destructive"
                        onClick={() =>
                          removePanelist.mutate({ projectId: project._id, panelistId: p._id || p })
                        }
                        disabled={removePanelist.isPending}
                        title="Unassign panelist"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground italic">No panelists assigned</p>
            )}
          </div>

          {/* Searchable panelist assignment dropdown */}
          {canManage && currentPanelists.length < 3 && (
            <div className="mt-3 relative">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search panelist by name or email..."
                  className="pl-8 h-9 text-sm"
                  value={panelistQuery}
                  onChange={(e) => {
                    setPanelistQuery(e.target.value);
                    setShowPanelistResults(true);
                  }}
                  onFocus={() => setShowPanelistResults(true)}
                  onBlur={() => window.setTimeout(() => setShowPanelistResults(false), 150)}
                  autoComplete="off"
                />
              </div>
              {showPanelistResults && panelistQuery.trim().length >= 1 && (
                <div className="absolute left-0 right-0 top-10 z-30 max-h-48 overflow-auto rounded-lg border border-border bg-popover shadow-lg">
                  {filteredPanelists.length > 0 ? (
                    <ul className="py-1">
                      {filteredPanelists.map((u) => (
                        <li key={u._id}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              assignPanelist.mutate({ projectId: project._id, panelistId: u._id });
                            }}
                          >
                            <UserPlus className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">
                                {u.firstName} {u.lastName}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {u.email}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No matching panelists found.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
