import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import SignaturePad from '@/components/ui/SignaturePad';
import { useAuthStore } from '@/stores/authStore';
import { projectService, userService } from '@/services/authService';
import { getSocket, connectSocket } from '@/services/socket';
import { useProjects } from '@/hooks/useProjects';
import { ROLES, PROJECT_STATUSES } from '@cms/shared';
import { toast } from 'sonner';
import {
  FileSignature,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  ShieldCheck,
  Lock,
  Unlock,
  Users,
  ChevronRight,
  ExternalLink,
  BookOpen,
  FileSpreadsheet,
} from 'lucide-react';
import ActionDoneMatrixTab from '@/components/projects/ActionDoneMatrixTab';
import SecretaryMinutesDocumentSheet from '@/components/secretary/SecretaryMinutesDocumentSheet';

export default function SecretaryReviewPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const authState = useAuthStore((s) => s?.user);
  const user = authState?.user ?? authState;
  const queryClient = useQueryClient();

  const initialProjectId = searchParams.get('projectId');
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || '');
  const initialTab = searchParams.get('tab') === 'adm' ? 'adm_matrix' : 'minutes_sheet';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Minutes upload state
  const [minutesFile, setMinutesFile] = useState(null);
  const [isUploadingMinutes, setIsUploadingMinutes] = useState(false);

  // Endorsement modal state
  const [isEndorseModalOpen, setIsEndorseModalOpen] = useState(false);
  const [signatoryName, setSignatoryName] = useState('');
  const [endorsementNotes, setEndorsementNotes] = useState(
    'I hereby verify that all committee remarks, critiques, and recommendations recorded during the hearing defense have been satisfactorily addressed by the student team.',
  );
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [isDrawingSignature, setIsDrawingSignature] = useState(false);
  const [saveSignatureToProfile, setSaveSignatureToProfile] = useState(true);
  const [isSubmittingEndorsement, setIsSubmittingEndorsement] = useState(false);

  // Fetch projects where user is Secretary
  const {
    data: projectsData,
    isLoading: isProjectsLoading,
    refetch: refetchProjects,
  } = useProjects({
    secretaryId: user?._id || user?.id,
    excludeArchived: false,
  });

  const projects = useMemo(() => {
    return projectsData?.projects || [];
  }, [projectsData]);

  // Set default selected project
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      const firstId = projects[0]._id;
      setSelectedProjectId(firstId);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('projectId', firstId);
      setSearchParams(nextParams, { replace: true });
    }
  }, [projects, selectedProjectId, searchParams, setSearchParams]);

  const handleSelectProject = (id) => {
    setSelectedProjectId(id);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('projectId', id);
    setSearchParams(nextParams);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const nextParams = new URLSearchParams(searchParams);
    if (tab === 'adm_matrix') {
      nextParams.set('tab', 'adm');
    } else {
      nextParams.delete('tab');
    }
    setSearchParams(nextParams, { replace: true });
  };

  // Fetch full details of selected project
  const {
    data: selectedProjectData,
    isLoading: isProjectDetailsLoading,
    refetch: refetchProjectDetails,
  } = useQuery({
    queryKey: ['project', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return null;
      const res = await projectService.getProject(selectedProjectId);
      return res.data?.data?.project || res.data?.project || res.data;
    },
    enabled: Boolean(selectedProjectId),
  });

  const project = selectedProjectData || projects.find((p) => p._id === selectedProjectId);

  // Prefill signatory name from user
  useEffect(() => {
    if (user) {
      const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      setSignatoryName(full || user.fullName || '');
      if (user.digitalSignature) {
        setSignatureDataUrl(user.digitalSignature);
        setIsDrawingSignature(false);
      } else {
        setIsDrawingSignature(true);
      }
    }
  }, [user]);

  // Filter project list
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        !searchTerm ||
        p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.teamId?.name?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      const hasMinutes = p.actionDoneMatrix?.length > 0;
      const isEndorsed = p.admSignatures?.secretary?.endorsed === true;

      if (statusFilter === 'NEEDS_MINUTES') return !hasMinutes;
      if (statusFilter === 'IN_REVISION') return hasMinutes && !isEndorsed;
      if (statusFilter === 'ENDORSED') return isEndorsed;
      return true;
    });
  }, [projects, searchTerm, statusFilter]);

  // Real-time synchronization with Proponents, Committee, and Instructor
  useEffect(() => {
    if (!selectedProjectId) return;

    let s = getSocket();
    if (!s) {
      s = connectSocket();
    }
    if (!s) return;

    try {
      s.emit('join:project', selectedProjectId);
    } catch {
      // Non-blocking
    }

    const handleSync = (data) => {
      if (!data?.projectId || String(data.projectId) === String(selectedProjectId)) {
        refetchProjectDetails();
        queryClient.invalidateQueries({ queryKey: ['project', selectedProjectId] });
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['secretary-minutes', selectedProjectId] });
      }
    };

    s.on('adm:row_updated', handleSync);
    s.on('adm:row_created', handleSync);
    s.on('adm:row_deleted', handleSync);
    s.on('adm:endorsed', handleSync);
    s.on('adm:signed', handleSync);
    s.on('adm:submitted', handleSync);
    s.on('defense:minutes_updated', handleSync);
    s.on('project:updated', handleSync);

    return () => {
      s.off('adm:row_updated', handleSync);
      s.off('adm:row_created', handleSync);
      s.off('adm:row_deleted', handleSync);
      s.off('adm:endorsed', handleSync);
      s.off('adm:signed', handleSync);
      s.off('adm:submitted', handleSync);
      s.off('defense:minutes_updated', handleSync);
      s.off('project:updated', handleSync);
    };
  }, [selectedProjectId, refetchProjectDetails, queryClient]);

  // Upload Minutes Handler
  const handleUploadMinutes = async (e) => {
    e.preventDefault();
    if (!minutesFile || !selectedProjectId) {
      toast.error('Please select a defense minutes PDF or DOCX file.');
      return;
    }

    try {
      setIsUploadingMinutes(true);
      const formData = new FormData();
      formData.append('file', minutesFile);
      formData.append('projectId', selectedProjectId);

      const res = await projectService.uploadSecretaryMinutes(formData);
      toast.success(
        res?.data?.message || 'Defense minutes uploaded! Action Done Matrix rows generated.',
      );
      setMinutesFile(null);
      await Promise.all([refetchProjectDetails(), refetchProjects()]);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to process defense minutes file.');
    } finally {
      setIsUploadingMinutes(false);
    }
  };

  // Add ADM Item Manually
  const handleAddRow = async () => {
    if (!selectedProjectId) return;
    const phase = Number(project?.capstonePhase || 1);
    const defaultMilestone = phase >= 3 ? 'CAPSTONE_3' : phase === 2 ? 'CAPSTONE_2' : 'CAPSTONE_1';
    try {
      await projectService.createActionDoneMatrixItem(selectedProjectId, {
        panelName: 'Committee Secretary',
        suggestion: 'Additional hearing observation / compliance remark',
        expectedAction: 'Address remark in manuscript and document page reference',
        milestone: defaultMilestone,
      });
      toast.success('New ADM row added.');
      refetchProjectDetails();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add row.');
    }
  };

  // Update single row
  const handleUpdateRow = async (itemId, patch) => {
    try {
      await projectService.updateActionDoneMatrixItem(selectedProjectId, itemId, patch);
      refetchProjectDetails();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update row.');
    }
  };

  // Delete single row
  const handleDeleteRow = async (itemId) => {
    try {
      await projectService.deleteActionDoneMatrixItem(selectedProjectId, itemId);
      toast.info('ADM row removed.');
      refetchProjectDetails();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete row.');
    }
  };

  // Endorse ADM Handler
  const handleConfirmEndorsement = async () => {
    if (!signatoryName.trim()) {
      toast.error('Please enter your full legal name as Secretary signatory.');
      return;
    }
    const sig = signatureDataUrl || user?.digitalSignature;
    if (!sig) {
      toast.error('Please draw or configure your digital signature.');
      return;
    }

    try {
      setIsSubmittingEndorsement(true);
      await projectService.endorseADM(selectedProjectId, {
        signatoryName: signatoryName.trim(),
        notes: endorsementNotes.trim(),
        signatureDataUrl: sig,
      });

      // Optionally save to profile
      if (saveSignatureToProfile && (!user?.digitalSignature || isDrawingSignature)) {
        try {
          await userService.updateMe({ digitalSignature: sig });
        } catch {
          // non-blocking
        }
      }

      toast.success(
        'Action Done Matrix successfully endorsed! Committee signatures are now unlocked.',
      );
      setIsEndorseModalOpen(false);
      await Promise.all([refetchProjectDetails(), refetchProjects()]);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to endorse Action Done Matrix.');
    } finally {
      setIsSubmittingEndorsement(false);
    }
  };

  // Matrix items and metrics
  const admRows = project?.actionDoneMatrix || [];
  const addressedCount = admRows.filter(
    (r) => r.actionDone && String(r.actionDone).trim().length > 0,
  ).length;
  const verifiedCount = admRows.filter((r) => r.status === 'verified').length;
  const totalRows = admRows.length;
  const isEndorsed = project?.admSignatures?.secretary?.endorsed === true;
  const canEndorse = totalRows > 0 && addressedCount === totalRows;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Institutional Top Header */}
        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileSignature className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Committee Secretary Review Studio
              </h1>
              <p className="text-xs text-muted-foreground">
                Upload defense minutes, manage Action Done Matrix compliance, and issue
                institutional endorsements.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchProjects();
                refetchProjectDetails();
              }}
              className="gap-1 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="gap-1 text-xs"
            >
              Faculty Overview
            </Button>
          </div>
        </div>

        {/* Studio Split Workspace */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Assigned Secretary Teams Queue (3 cols) */}
          <div className="space-y-4 lg:col-span-3 xl:col-span-3 no-print">
            <Card className="shadow-sm">
              <CardHeader className="p-4 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Assigned Teams</CardTitle>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {projects.length} Total
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Teams where you serve as Committee Secretary.
                </CardDescription>

                {/* Filter & Search */}
                <div className="mt-3 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search team or title..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 text-xs h-8"
                    />
                  </div>
                  <div className="flex gap-1 overflow-x-auto pb-1 text-[10px]">
                    {[
                      { id: 'ALL', label: 'All' },
                      { id: 'NEEDS_MINUTES', label: 'Needs Minutes' },
                      { id: 'IN_REVISION', label: 'Under Review' },
                      { id: 'ENDORSED', label: 'Endorsed' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setStatusFilter(tab.id)}
                        className={`rounded px-2 py-0.5 font-medium whitespace-nowrap transition-colors ${
                          statusFilter === tab.id
                            ? 'bg-primary text-primary-foreground font-bold'
                            : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-2 pt-0 max-h-[600px] overflow-y-auto space-y-1.5 custom-scrollbar">
                {isProjectsLoading ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    Loading assigned teams...
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No matching teams found.
                  </div>
                ) : (
                  filteredProjects.map((p) => {
                    const isSelected = p._id === selectedProjectId;
                    const pHasMinutes = p.actionDoneMatrix?.length > 0;
                    const pIsEndorsed = p.admSignatures?.secretary?.endorsed === true;

                    return (
                      <div
                        key={p._id}
                        onClick={() => handleSelectProject(p._id)}
                        className={`cursor-pointer rounded-lg border p-3 text-left transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border/60 hover:border-border hover:bg-muted/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-foreground line-clamp-1">
                            {p.title || 'Untitled Project'}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[10px] text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {p.teamId?.name || 'Unknown Team'}
                          </span>
                          <span>&bull;</span>
                          <span>Phase {p.capstonePhase || 1}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          {pIsEndorsed ? (
                            <Badge
                              variant="outline"
                              className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 border-emerald-500/30"
                            >
                              Endorsed
                            </Badge>
                          ) : pHasMinutes ? (
                            <Badge
                              variant="outline"
                              className="text-[9px] font-bold text-sky-600 bg-sky-500/10 border-sky-500/30"
                            >
                              In Revision ({p.actionDoneMatrix.length} items)
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[9px] font-bold text-amber-600 bg-amber-500/10 border-amber-500/30"
                            >
                              Needs Minutes
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Active Project Workspace (9 cols) */}
          <div className="space-y-6 lg:col-span-9 xl:col-span-9">
            {!project && isProjectDetailsLoading ? (
              <Card className="p-12 text-center text-muted-foreground shadow-sm">
                Loading project details and Action Done Matrix...
              </Card>
            ) : !project ? (
              <Card className="p-12 text-center text-muted-foreground shadow-sm">
                Select a team on the left to begin minutes extraction and compliance review.
              </Card>
            ) : (
              <>
                {/* Project Header Banner */}
                <Card className="border-border/70 shadow-sm no-print">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] uppercase font-bold">
                            {project.teamId?.name || 'Assigned Team'}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            Phase {project.capstonePhase || 1}
                          </Badge>
                        </div>
                        <h2 className="text-lg font-bold text-foreground tracking-tight">
                          {project.title}
                        </h2>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/projects/${project._id}`)}
                          className="text-xs gap-1"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View Project Page
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/50 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                          Adviser
                        </span>
                        <p className="font-medium text-foreground">
                          {project.adviserId?.fullName ||
                            `${project.adviserId?.firstName || ''} ${project.adviserId?.lastName || ''}`.trim() ||
                            'Unassigned'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                          Secretary
                        </span>
                        <p className="font-medium text-foreground">
                          {user?.fullName ||
                            `${user?.firstName || ''} ${user?.lastName || ''}`.trim()}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                          Matrix Status
                        </span>
                        <p className="font-medium text-foreground capitalize">
                          {project.admStatus?.replace(/_/g, ' ') || 'Not Started'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                          Compliance
                        </span>
                        <p className="font-bold text-foreground">
                          {totalRows > 0
                            ? `${addressedCount} of ${totalRows} (${Math.round((addressedCount / totalRows) * 100)}%)`
                            : 'No remarks'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Studio Mode Navigation */}
                <div className="flex flex-wrap items-center gap-2 border-b border-border/70 pb-3 no-print">
                  <button
                    type="button"
                    onClick={() => handleTabChange('minutes_sheet')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'minutes_sheet'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'border border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`}
                    data-testid="tab-minutes-sheet"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Secretary Minutes (Form OVPAA-F-INS-032)</span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-mono uppercase tracking-wider py-0 px-1.5 ${
                        activeTab === 'minutes_sheet'
                          ? 'border-primary-foreground/30 text-primary-foreground'
                          : 'text-primary border-primary/30'
                      }`}
                    >
                      Official Form
                    </Badge>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabChange('adm_matrix')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'adm_matrix'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'border border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`}
                    data-testid="tab-adm-matrix"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Action Done Matrix & Endorsement Gate</span>
                    {totalRows > 0 && (
                      <Badge
                        variant="secondary"
                        className={`text-[9px] font-mono py-0 px-1.5 ${
                          activeTab === 'adm_matrix'
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : ''
                        }`}
                      >
                        {addressedCount}/{totalRows}
                      </Badge>
                    )}
                  </button>
                </div>

                {activeTab === 'minutes_sheet' ? (
                  <SecretaryMinutesDocumentSheet
                    project={project}
                    user={user}
                    onMinutesSynced={async () => {
                      await Promise.all([refetchProjectDetails(), refetchProjects()]);
                      toast.success('Matrix synced! Switching to Action Done Matrix review.');
                      handleTabChange('adm_matrix');
                    }}
                  />
                ) : (
                  <ActionDoneMatrixTab
                    project={project}
                    user={user}
                    isFaculty={true}
                    isSecretary={true}
                    onRefresh={async () => {
                      await Promise.all([refetchProjectDetails(), refetchProjects()]);
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
