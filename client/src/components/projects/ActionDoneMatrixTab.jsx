import { useState, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { projectService } from '@/services/authService';
import { ROLES, PANEL_ROLES } from '@cms/shared';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  UserCheck,
  PenTool,
  Loader2,
  RefreshCw,
  Printer,
  ShieldCheck,
  Check,
  X,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * ADM_STATUS_CONFIG — Visual states for the overall Action Done Matrix workflow.
 */
const ADM_STATUS_CONFIG = {
  pending_developer_action: {
    label: 'Pending Proponent Action',
    variant: 'warning',
    icon: Clock,
    description: 'Proponents must address each defense suggestion and describe actions taken.',
  },
  under_panel_review: {
    label: 'Under Panel Review',
    variant: 'outline',
    icon: AlertTriangle,
    description: 'Panel members are reviewing proponent modifications and verifying compliance.',
  },
  approved: {
    label: 'Approved & Completed',
    variant: 'success',
    icon: CheckCircle2,
    description: 'All defense requirements have been satisfied and verified by the panel.',
  },
  archived: {
    label: 'Archived',
    variant: 'default',
    icon: ShieldCheck,
    description: 'Project has completed the capstone defense cycle and is archived.',
  },
};

const ITEM_STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    className:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
  },
  addressed: {
    label: 'Addressed',
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300',
  },
  verified: {
    label: 'Verified ✓',
    className:
      'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  rejected: {
    label: 'Revision Needed',
    className: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300',
  },
};

export default function ActionDoneMatrixTab({
  project,
  isFaculty = false,
  isStudent = false,
  user,
  onRefresh,
}) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploadingMinutes, setIsUploadingMinutes] = useState(false);

  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [actionDoneText, setActionDoneText] = useState('');
  const [isSavingAction, setIsSavingAction] = useState(false);

  const [signingItem, setSigningItem] = useState(null);
  const [signatureName, setSignatureName] = useState('');
  const [isSigning, setIsSigning] = useState(false);

  const admItems = useMemo(() => project?.actionDoneMatrix || [], [project?.actionDoneMatrix]);
  const currentAdmStatus = project?.admStatus || 'pending_developer_action';
  const statusMeta =
    ADM_STATUS_CONFIG[currentAdmStatus] || ADM_STATUS_CONFIG.pending_developer_action;
  const StatusIcon = statusMeta.icon;

  const isCapstone2 =
    project?.capstoneCourse === 'Capstone 2' || project?.currentPhase === 'Capstone 2';

  // Identify committee members
  const panelists = project?.panelists || [];
  const chair = panelists.find((p) => p.role === PANEL_ROLES.CHAIR || p.role === 'chair');
  const secretary = panelists.find(
    (p) => p.role === PANEL_ROLES.SECRETARY || p.role === 'secretary',
  );
  const regularMembers = panelists.filter(
    (p) =>
      p.role !== PANEL_ROLES.CHAIR &&
      p.role !== 'chair' &&
      p.role !== PANEL_ROLES.SECRETARY &&
      p.role !== 'secretary',
  );

  const isUserChair =
    user &&
    (chair?.userId === user._id ||
      chair?.userId?._id === user._id ||
      user.role === ROLES.INSTRUCTOR);
  const isUserSecretary =
    user && (secretary?.userId === user._id || secretary?.userId?._id === user._id);
  const isUserPanelist =
    user &&
    (isUserChair ||
      isUserSecretary ||
      panelists.some((p) => p.userId === user._id || p.userId?._id === user._id));
  const canUploadMinutes = isFaculty || isUserSecretary || user?.role === ROLES.INSTRUCTOR;

  // Handle uploading defense minutes
  const handleUploadMinutes = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a defense minutes PDF file.');
      return;
    }

    try {
      setIsUploadingMinutes(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('projectId', project._id);

      const res = await projectService.uploadSecretaryMinutes(formData);
      toast.success(
        res?.data?.message || 'Defense minutes processed! Action Done Matrix populated.',
      );
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          'Failed to process minutes PDF.',
      );
    } finally {
      setIsUploadingMinutes(false);
    }
  };

  // Handle saving proponent action done
  const handleSaveActionDone = async (item, index) => {
    if (!actionDoneText.trim()) {
      toast.error('Please input your action done or explanation.');
      return;
    }

    try {
      setIsSavingAction(true);
      const itemId = item._id || index;
      await projectService.updateActionDoneMatrixItem(project._id, itemId, {
        actionDone: actionDoneText.trim(),
        status: 'addressed',
      });
      toast.success('Action Done response saved.');
      setEditingItemIndex(null);
      setActionDoneText('');
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Failed to update action done.');
    } finally {
      setIsSavingAction(false);
    }
  };

  // Handle row item status change by faculty
  const handleUpdateItemStatus = async (item, index, newStatus) => {
    try {
      const itemId = item._id || index;
      await projectService.updateActionDoneMatrixItem(project._id, itemId, {
        status: newStatus,
      });
      toast.success(`Item status updated to ${newStatus}.`);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Failed to update item status.');
    }
  };

  // Handle signing an ADM item
  const handleSignItem = async () => {
    if (!signatureName.trim()) {
      toast.error('Please type your full name as digital signature acknowledgment.');
      return;
    }

    try {
      setIsSigning(true);
      const itemId = signingItem?._id || signingItem?.index;
      const res = await projectService.signADMItem(project._id, itemId, {
        signatureName: signatureName.trim(),
        role: isUserChair ? 'chair' : isUserSecretary ? 'secretary' : 'panelist',
      });

      toast.success(res?.data?.message || 'Digital signature recorded.');
      setSigningItem(null);
      setSignatureName('');
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          'Failed to record signature.',
      );
    } finally {
      setIsSigning(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Capstone 2 Direct Pipeline Notice */}
      {isCapstone2 && (
        <Alert className="border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-900 dark:text-blue-200 font-semibold">
            Capstone 2: System Development &amp; Action Done Matrix
          </AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-300 text-xs leading-relaxed">
            In Capstone 2, development deliverables and revisions from previous defenses are tracked
            directly through the
            <strong> Action Done Matrix</strong>. No separate manuscript documents are required for
            this phase.
          </AlertDescription>
        </Alert>
      )}

      {/* ADM Status & Actions Card */}
      <Card className="border-border/70 bg-card shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">Action Done Matrix (ADM)</CardTitle>
              <Badge variant="outline" className="font-semibold capitalize">
                {statusMeta.label}
              </Badge>
            </div>
            <CardDescription className="mt-1 text-xs sm:text-sm">
              Official BukSU Matrix for tracking panel recommendations, developer implementation,
              and committee verification.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canUploadMinutes && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsUploadModalOpen(true)}
                className="gap-1.5"
              >
                <Upload className="h-4 w-4 text-primary" />
                Upload Defense Minutes (PDF)
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 print:hidden"
            >
              <Printer className="h-4 w-4" />
              Print / Export ADM
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress Banner */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <StatusIcon className="h-4 w-4 text-primary shrink-0" />
                <span className="font-medium text-foreground">{statusMeta.description}</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs">
                <span>
                  Total Items: <strong>{admItems.length}</strong>
                </span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  Verified:{' '}
                  <strong>{admItems.filter((i) => i.status === 'verified').length}</strong>
                </span>
                <span>•</span>
                <span className="text-amber-600 dark:text-amber-400">
                  Pending: <strong>{admItems.filter((i) => i.status === 'pending').length}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Empty State */}
          {admItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 px-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <h4 className="text-base font-semibold">No Action Done Matrix Entries Yet</h4>
              <p className="text-xs text-muted-foreground max-w-md mt-1 mb-4">
                The Action Done Matrix will be automatically generated once the defense secretary or
                instructor uploads the official defense minutes PDF.
              </p>
              {canUploadMinutes && (
                <Button size="sm" onClick={() => setIsUploadModalOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" /> Upload Defense Minutes
                </Button>
              )}
            </div>
          ) : (
            /* ADM Table */
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold border-b border-border">
                  <tr>
                    <th className="p-3 w-10">#</th>
                    <th className="p-3 w-48">Panelist / Suggester</th>
                    <th className="p-3 min-w-[180px]">Recommendation / Remark</th>
                    <th className="p-3 min-w-[180px]">Expected Action</th>
                    <th className="p-3 min-w-[220px]">Proponent Action Taken</th>
                    <th className="p-3 w-32">Status</th>
                    <th className="p-3 w-40">Signatures</th>
                    {isFaculty && <th className="p-3 w-32">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {admItems.map((item, idx) => {
                    const statusConfig =
                      ITEM_STATUS_CONFIG[item.status] || ITEM_STATUS_CONFIG.pending;
                    const isEditing = editingItemIndex === idx;
                    const signatures = item.signatures || [];

                    return (
                      <tr key={item._id || idx} className="hover:bg-muted/10 transition-colors">
                        <td className="p-3 font-mono text-muted-foreground align-top">{idx + 1}</td>
                        <td className="p-3 font-medium text-foreground align-top">
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>{item.panelName || 'Panel Committee'}</span>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground leading-relaxed align-top">
                          {item.suggestion || '—'}
                        </td>
                        <td className="p-3 text-foreground leading-relaxed align-top">
                          {item.expectedAction || '—'}
                        </td>
                        <td className="p-3 align-top">
                          {isEditing ? (
                            <div className="space-y-2">
                              <Textarea
                                value={actionDoneText}
                                onChange={(e) => setActionDoneText(e.target.value)}
                                placeholder="Describe the specific modifications or actions taken..."
                                rows={3}
                                className="text-xs"
                                disabled={isSavingAction}
                              />
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveActionDone(item, idx)}
                                  disabled={isSavingAction || !actionDoneText.trim()}
                                  className="h-7 text-xs px-2.5"
                                >
                                  {isSavingAction ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    'Save Action'
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingItemIndex(null);
                                    setActionDoneText('');
                                  }}
                                  className="h-7 text-xs px-2"
                                  disabled={isSavingAction}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <p className="text-xs leading-relaxed text-foreground">
                                {item.actionDone || (
                                  <span className="italic text-muted-foreground">
                                    No action recorded yet.
                                  </span>
                                )}
                              </p>
                              {isStudent && !project.isArchived && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingItemIndex(idx);
                                    setActionDoneText(item.actionDone || '');
                                  }}
                                  className="h-6 text-[11px] px-2 text-primary"
                                >
                                  <PenTool className="h-3 w-3 mr-1" />
                                  {item.actionDone ? 'Edit Response' : 'Add Response'}
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-3 align-top">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusConfig.className}`}
                          >
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="p-3 align-top">
                          <div className="space-y-1">
                            {signatures.length > 0 ? (
                              signatures.map((sig, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="text-[11px] bg-muted/40 p-1.5 rounded border border-border/50 font-mono"
                                >
                                  <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <Check className="h-3 w-3" />
                                    <span>{sig.name}</span>
                                  </div>
                                  <div className="text-muted-foreground text-[10px] capitalize">
                                    {sig.role} •{' '}
                                    {new Date(sig.signedAt || Date.now()).toLocaleDateString()}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                No signatures yet
                              </span>
                            )}
                            {isUserPanelist && !project.isArchived && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSigningItem({ ...item, index: idx });
                                  setSignatureName(
                                    `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
                                  );
                                }}
                                className="h-6 text-[11px] px-1.5 text-primary hover:bg-primary/10 mt-1"
                              >
                                <PenTool className="h-3 w-3 mr-1" /> Sign Row
                              </Button>
                            )}
                          </div>
                        </td>
                        {isFaculty && (
                          <td className="p-3 align-top">
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateItemStatus(item, idx, 'verified')}
                                className="h-6 text-[11px] justify-start text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Verify
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateItemStatus(item, idx, 'rejected')}
                                className="h-6 text-[11px] justify-start text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                              >
                                <X className="h-3 w-3 mr-1" /> Request Fix
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Committee Signatories Card */}
      <Card className="border-border/70 bg-card shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Official Defense Committee Signatories
          </CardTitle>
          <CardDescription className="text-xs">
            The Action Done Matrix requires digital certification from all assigned faculty
            panelists. When the Panel Chair signs off all items, the project is officially certified
            and archived.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Panel Chair */}
            <SignatoryBadge
              roleTitle="Panel Chair"
              panelist={chair}
              isVerified={
                admItems.length > 0 &&
                admItems.every((i) => i.signatures?.some((s) => s.role === 'chair'))
              }
            />

            {/* Secretary */}
            <SignatoryBadge
              roleTitle="Defense Secretary"
              panelist={secretary}
              isVerified={
                admItems.length > 0 &&
                admItems.every((i) => i.signatures?.some((s) => s.role === 'secretary'))
              }
            />

            {/* Panel Members */}
            {regularMembers.map((member, idx) => (
              <SignatoryBadge
                key={member._id || idx}
                roleTitle={`Panel Member ${idx + 1}`}
                panelist={member}
                isVerified={
                  admItems.length > 0 &&
                  admItems.some((i) =>
                    i.signatures?.some(
                      (s) =>
                        s.userId === member.userId ||
                        s.name?.toLowerCase().includes(member.user?.lastName?.toLowerCase()),
                    ),
                  )
                }
              />
            ))}

            {/* Capstone Adviser */}
            <SignatoryBadge
              roleTitle="Capstone Adviser"
              panelist={{ user: project?.adviserId, role: 'adviser' }}
              isVerified={
                admItems.length > 0 &&
                admItems.some((i) => i.signatures?.some((s) => s.role === 'adviser'))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Upload Minutes Modal */}
      {isUploadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isUploadingMinutes) {
              setIsUploadModalOpen(false);
            }
          }}
        >
          <Card className="w-full max-w-md border-border shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Upload className="h-5 w-5 text-primary" />
                Upload Defense Minutes PDF
              </CardTitle>
              <CardDescription className="text-xs">
                Upload the official defense minutes signed by the secretary. The system will
                automatically parse panelist recommendations and populate the Action Done Matrix
                rows.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleUploadMinutes}>
              <CardContent className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="minutes-file">Defense Minutes File (.pdf)</Label>
                  <Input
                    id="minutes-file"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    disabled={isUploadingMinutes}
                  />
                  {selectedFile && (
                    <p className="text-xs text-muted-foreground">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={isUploadingMinutes}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUploadingMinutes || !selectedFile}>
                  {isUploadingMinutes ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing Minutes...
                    </>
                  ) : (
                    'Extract to ADM'
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {/* Digital Signature Modal */}
      {Boolean(signingItem) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSigning) {
              setSigningItem(null);
            }
          }}
        >
          <Card className="w-full max-w-md border-border shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <PenTool className="h-5 w-5 text-primary" />
                Digital Signature Acknowledgment
              </CardTitle>
              <CardDescription className="text-xs">
                By typing your full legal name, you certify that the proponent has adequately
                addressed recommendation #{(signingItem?.index || 0) + 1}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 py-2">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-xs space-y-1">
                <p className="font-semibold text-foreground">Recommendation:</p>
                <p className="text-muted-foreground">{signingItem?.suggestion}</p>
                <p className="font-semibold text-foreground pt-1">Action Done:</p>
                <p className="text-muted-foreground">{signingItem?.actionDone || 'N/A'}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sig-name">Signatory Name</Label>
                <Input
                  id="sig-name"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="Dr. / Prof. Firstname Lastname"
                  disabled={isSigning}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSigningItem(null)}
                disabled={isSigning}
              >
                Cancel
              </Button>
              <Button onClick={handleSignItem} disabled={isSigning || !signatureName.trim()}>
                {isSigning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  'Confirm Digital Signature'
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}

function SignatoryBadge({ roleTitle, panelist, isVerified }) {
  const name =
    panelist?.user?.firstName && panelist?.user?.lastName
      ? `${panelist.user.firstName} ${panelist.user.lastName}`
      : panelist?.name || 'Unassigned';

  return (
    <div className="rounded-lg border border-border/70 bg-muted/15 p-3 space-y-1 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">
          {roleTitle}
        </span>
        {isVerified ? (
          <Badge variant="success" className="h-5 px-1.5 text-[10px]">
            Signed ✓
          </Badge>
        ) : (
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-muted-foreground">
            Pending
          </Badge>
        )}
      </div>
      <p className="font-medium text-foreground truncate">{name}</p>
      {panelist?.user?.email && (
        <p className="text-[10px] text-muted-foreground truncate">{panelist.user.email}</p>
      )}
    </div>
  );
}
