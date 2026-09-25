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
import SecretaryMinutesDocumentSheet from '@/components/secretary/SecretaryMinutesDocumentSheet';

export default function SecretaryReviewPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
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
      setSearchParams({ projectId: firstId }, { replace: true });
    }
  }, [projects, selectedProjectId, setSearchParams]);

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
    try {
      await projectService.createActionDoneMatrixItem(selectedProjectId, {
        panelName: 'Committee Secretary',
        suggestion: 'Additional hearing observation / compliance remark',
        expectedAction: 'Address remark in manuscript and document page reference',
        milestone: project?.capstonePhase >= 4 ? 'CAPSTONE_4' : 'CAPSTONE_2',
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
                  <>
                    {/* Section 1: Minutes Upload Zone */}
                    <Card className="border-border/70 shadow-sm">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Upload className="h-4 w-4 text-primary" />
                          Upload Hearing Defense Minutes
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Upload your official defense hearing minutes (PDF or DOCX). Remarks and
                          panel critiques are directly parsed into Action Done Matrix rows.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        <form
                          onSubmit={handleUploadMinutes}
                          className="flex flex-col sm:flex-row items-center gap-3"
                        >
                          <div className="flex-1 w-full">
                            <Input
                              type="file"
                              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              onChange={(e) => setMinutesFile(e.target.files?.[0] || null)}
                              className="text-xs file:text-xs file:font-semibold"
                            />
                          </div>
                          <Button
                            type="submit"
                            disabled={!minutesFile || isUploadingMinutes}
                            className="w-full sm:w-auto shrink-0 text-xs gap-1.5"
                          >
                            {isUploadingMinutes ? (
                              <>Uploading & Parsing…</>
                            ) : (
                              <>
                                <Upload className="h-3.5 w-3.5" />
                                Extract to ADM
                              </>
                            )}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>

                    {/* Section 2: Action Done Matrix Table */}
                    <Card className="border-border/70 shadow-sm">
                      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                        <div>
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            Action Done Matrix (ADM)
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Review remarks recorded during defense and the actions taken by
                            proponents.
                          </CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAddRow}
                          className="text-xs gap-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Remark
                        </Button>
                      </CardHeader>

                      <CardContent className="p-4 pt-2">
                        {admRows.length === 0 ? (
                          <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                            No Action Done Matrix remarks found. Upload defense minutes above or
                            click &quot;+ Add Remark&quot; to populate the matrix.
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-lg border border-border/70">
                            <table className="w-full text-xs text-left border-collapse">
                              <thead className="bg-muted/40 text-[11px] font-bold uppercase text-muted-foreground border-b border-border/70">
                                <tr>
                                  <th className="p-2.5 w-8">#</th>
                                  <th className="p-2.5 w-32">Panelist</th>
                                  <th className="p-2.5">Critique / Suggestion</th>
                                  <th className="p-2.5">Student Action Taken</th>
                                  <th className="p-2.5 w-16 text-center">Page(s)</th>
                                  <th className="p-2.5 w-24 text-center">Status</th>
                                  <th className="p-2.5 w-12 text-center">Act</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/50 font-sans">
                                {admRows.map((row, idx) => {
                                  const hasAction = Boolean(
                                    row.actionDone && String(row.actionDone).trim(),
                                  );
                                  return (
                                    <tr
                                      key={row._id || idx}
                                      className="hover:bg-muted/10 transition-colors"
                                    >
                                      <td className="p-2.5 font-mono text-[10px] text-muted-foreground text-center">
                                        {idx + 1}
                                      </td>
                                      <td className="p-2.5 font-medium text-foreground">
                                        {row.panelName || 'Panelist'}
                                      </td>
                                      <td className="p-2.5 text-foreground leading-relaxed">
                                        {row.suggestion}
                                        {row.expectedAction && (
                                          <div className="text-[10px] text-muted-foreground mt-0.5 italic">
                                            Expected: {row.expectedAction}
                                          </div>
                                        )}
                                      </td>
                                      <td className="p-2.5">
                                        {hasAction ? (
                                          <span className="text-foreground font-medium">
                                            {row.actionDone}
                                          </span>
                                        ) : (
                                          <span className="text-amber-600 dark:text-amber-400 italic text-[11px]">
                                            Pending proponent action…
                                          </span>
                                        )}
                                      </td>
                                      <td className="p-2.5 text-center font-mono text-[11px]">
                                        {row.pageNumbers || '—'}
                                      </td>
                                      <td className="p-2.5 text-center">
                                        {row.status === 'verified' ? (
                                          <Badge
                                            variant="outline"
                                            className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 border-emerald-500/30"
                                          >
                                            Verified
                                          </Badge>
                                        ) : hasAction ? (
                                          <Badge
                                            variant="outline"
                                            className="text-[9px] font-bold text-sky-600 bg-sky-500/10 border-sky-500/30"
                                          >
                                            Addressed
                                          </Badge>
                                        ) : (
                                          <Badge
                                            variant="outline"
                                            className="text-[9px] font-bold text-amber-600 bg-amber-500/10 border-amber-500/30"
                                          >
                                            Pending
                                          </Badge>
                                        )}
                                      </td>
                                      <td className="p-2.5 text-center">
                                        <button
                                          onClick={() => handleDeleteRow(row._id)}
                                          className="text-muted-foreground hover:text-rose-500 transition-colors p-1"
                                          title="Delete row"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Section 3: Institutional Secretary Endorsement Gate */}
                    <Card
                      className={`border shadow-sm transition-all ${
                        isEndorsed
                          ? 'border-emerald-500/50 bg-emerald-500/5'
                          : canEndorse
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-amber-500/40 bg-amber-500/5'
                      }`}
                    >
                      <CardContent className="p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${
                                isEndorsed
                                  ? 'bg-emerald-600'
                                  : canEndorse
                                    ? 'bg-primary'
                                    : 'bg-amber-600'
                              }`}
                            >
                              {isEndorsed ? (
                                <ShieldCheck className="h-5 w-5" />
                              ) : canEndorse ? (
                                <FileSignature className="h-5 w-5" />
                              ) : (
                                <Clock className="h-5 w-5" />
                              )}
                            </div>
                            <div className="space-y-0.5">
                              <h3 className="text-sm font-bold text-foreground">
                                {isEndorsed
                                  ? 'Action Done Matrix Endorsed by Committee Secretary'
                                  : canEndorse
                                    ? 'All Remarks Addressed — Ready for Secretary Endorsement'
                                    : 'Secretary Endorsement Pending Proponent Revisions'}
                              </h3>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {isEndorsed
                                  ? `Endorsed by Secretary ${project.admSignatures?.secretary?.signatoryName || user?.fullName}${project.admSignatures?.secretary?.endorsedAt ? ` on ${new Date(project.admSignatures.secretary.endorsedAt).toLocaleDateString()}` : ''}. Committee signatures are unlocked.`
                                  : canEndorse
                                    ? 'The student proponents have documented actions and page references for all hearing remarks. You may now grant digital endorsement.'
                                    : `${totalRows - addressedCount} remark(s) are still pending student action. Secretary endorsement unlocks once all items are completed.`}
                              </p>
                            </div>
                          </div>

                          {/* Action Button */}
                          <div>
                            {isEndorsed ? (
                              <Badge
                                variant="outline"
                                className="text-xs font-bold text-emerald-600 bg-emerald-500/10 border-emerald-500/30 px-3 py-1.5 flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                Endorsement Granted
                              </Badge>
                            ) : (
                              <Button
                                onClick={() => setIsEndorseModalOpen(true)}
                                disabled={!canEndorse || isSubmittingEndorsement}
                                className="text-xs font-bold gap-1.5 whitespace-nowrap shadow-sm"
                              >
                                <FileSignature className="h-4 w-4" />
                                Sign & Endorse Matrix
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Endorsement Modal */}
        {isEndorseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2 text-foreground font-bold">
                  <FileSignature className="h-5 w-5 text-primary" />
                  Grant Committee Secretary Endorsement
                </div>
                <button
                  onClick={() => setIsEndorseModalOpen(false)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <Label className="text-xs font-semibold text-foreground">
                    Secretary Signatory Full Name
                  </Label>
                  <Input
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    placeholder="e.g. Glaiza Mae A. Libe"
                    className="mt-1 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-foreground">
                    Endorsement & Verification Notes
                  </Label>
                  <Textarea
                    value={endorsementNotes}
                    onChange={(e) => setEndorsementNotes(e.target.value)}
                    rows={3}
                    className="mt-1 text-xs"
                  />
                </div>

                {/* Digital Signature Pad */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">
                      Digital Signature
                    </Label>
                    {user?.digitalSignature && (
                      <button
                        type="button"
                        onClick={() => setIsDrawingSignature(!isDrawingSignature)}
                        className="text-[11px] text-primary hover:underline"
                      >
                        {isDrawingSignature ? 'Use Saved Signature' : 'Draw New Signature'}
                      </button>
                    )}
                  </div>

                  {isDrawingSignature || !signatureDataUrl ? (
                    <div className="rounded-lg border border-border bg-background p-2">
                      <SignaturePad
                        onSave={(dataUrl) => setSignatureDataUrl(dataUrl)}
                        onClear={() => setSignatureDataUrl(null)}
                      />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                          Saved Digital Signature Active
                        </span>
                      </div>
                      <img
                        src={signatureDataUrl}
                        alt="Signature"
                        className="h-10 max-w-[120px] object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEndorseModalOpen(false)}
                  disabled={isSubmittingEndorsement}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmEndorsement}
                  disabled={isSubmittingEndorsement || !signatureDataUrl}
                  className="text-xs font-bold gap-1.5"
                >
                  {isSubmittingEndorsement ? (
                    <>Submitting…</>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Confirm & Sign Endorsement
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
