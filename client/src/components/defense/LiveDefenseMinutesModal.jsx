import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import {
  X,
  FileText,
  Calculator,
  Gavel,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Clock,
  Printer,
  Loader2,
  ShieldCheck,
  Award,
  Sparkles,
  ChevronRight,
  User,
  Radio,
  Building,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import AutoExpandingTextarea from '@/components/projects/AutoExpandingTextarea';
import { defenseMinutesService } from '@/services/defenseMinutesService';
import { getSocket } from '@/services/socket';
import buksuLogo from '@/assets/buksu-logo.png';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  'Manuscript / Literature',
  'System Architecture / Backend',
  'UI/UX',
  'Database Schema',
  'Methodology & Implementation',
  'General / Other',
];

const SEVERITIES = [
  {
    value: 'minor',
    label: 'Minor',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
  {
    value: 'major',
    label: 'Major',
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  {
    value: 'critical',
    label: 'Critical',
    color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
  },
];

const VERDICTS = [
  { value: 'approved_with_minor_revisions', label: 'Approved with Minor Revision' },
  { value: 'approved_with_major_revisions', label: 'Approved with Major Revision' },
  { value: 'rejected', label: 'Rejected (Redefense Required)' },
];

// Sample institutional data from BukSU OVPAA-F-INS-032 reference artifact
const INSTITUTIONAL_SAMPLE = {
  venue: 'COT Conference Room',
  round: '2nd',
  dateStr: 'April 20, 2026',
  timeStr: '9:00am',
  clientName: 'Dr. Sales G. Aribe Jr.',
  overallRecommendations:
    'Unfinished prototype with missing functions and modules. Recommended to redefend.',
  verdict: 'approved_with_minor_revisions',
  secretaryName: 'Joan Marie M. Panes',
  chairName: 'Louie Jay S. Labastida',
  chairComments: [
    'Approved capstones should be transferred to archive automatically',
    'do not require minimum of 3 submissions ("add more" and "done" button instead)',
    'adviser and panel will be same account as faculty (and secretary)',
    'identification of panel roles (chair, members, secretary(for the record,with notification))',
    'do not delete data (archive only)',
    'setting of plagiarism rate should be cascaded to faculty and students',
    'action done matrix should be incorporated (with complete signatories)',
    'students should also be able to see comments and suggestions embedded in documents (name of suggester, highlight of concerned areas, google doc style)',
    'Capstone 2: no documents involved so directly to action done matrix',
    'secretary account upload minutes, action done created directly from that',
    'editable/notification of justification will trigger only if late',
    'put algorithm and its justification in paper',
  ],
  panelists: [
    {
      name: 'Raul Lecaros',
      comments: [
        'majority of the core functionalities (FR1–FR3, FR6, FR8–FR10, FR12–FR17) have been successfully implemented and are operating as intended.',
        'For FR4, it was agreed that the documentation must be updated to reflect a maximum of four members per capstone group instead of three, with an accompanying justification. Additionally, interface improvements were suggested, including repositioning the lock notification to the top and introducing color-coded indicators (red for locked and green for opened) to enhance user clarity.',
        'For FR5, the header "capstone type" will be revised to "IT Field of Discipline" to ensure proper terminology alignment.',
        'FR7 requires enhancement by removing the hard-coded Google Doc link and enabling instructors to configure this dynamically within the system.',
        "FR11 was noted as partially met; while the functionality is available on the student side, the GitHub repository link must also be made visible on the adviser's interface to ensure transparency and monitoring.",
        'FRAD1, FRAD5, FRAD6, and FRAD7 were confirmed as fully implemented.',
        "FRAD2, however, remains partially complete, as it requires the display of team member names on the adviser's view, specifically positioned on the right side of the interface.",
        'It was also agreed that FRAD3 and FRAD4 should be removed from the adviser functional requirements, as attaching minutes of the system proposal does not align with the intended scope.',
        'For the panel requirements (FRPA01–FRPA07), all functionalities were confirmed as fully met',
        'FRINS1, FRINS3–FRINS5, FRINS7 meets expectations. Minor adjustments were identified, including replacing the trash icon with an archive function (FRINS2) to better reflect intended usage and data retention practices.',
        'Additionally, FRINS6 remains incomplete, as it requires the inclusion of an Evaluation Report and a Plagiarism Report for each study, which are essential for academic assessment and integrity.',
      ],
    },
    {
      name: 'Joseph Abella',
      comments: [
        'results should be seen only once details are filled in',
        'User should be able to read the full paper',
        'if project is archived, details should not be visible (direct to whole paper)',
        'tabs: plagiarism vs similarity should be definite',
        'proposal should be able to be submitted, but should be flagged',
        'per session submission list',
      ],
    },
  ],
  clientComments: [
    'Request: template redesignable/restructurable (instructor side)',
    'light mode theme, bigger font size',
    'date of submission of deliverables should be settable',
    'scheduling upload (calendar implementation)',
    'consultation module (optional)',
  ],
};

export default function LiveDefenseMinutesModal({
  isOpen,
  open,
  onClose,
  onOpenChange,
  projectId,
  defenseType = 'midterm',
  projectTitle = '',
  project,
  panelists = [],
  user,
  onPublished,
  onMinutesPublished,
}) {
  const isVisible = Boolean(isOpen ?? open);

  const handleClose = useCallback(() => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  }, [onClose, onOpenChange]);

  const [activeTab, setActiveTab] = useState('ovpaa_minutes'); // 'ovpaa_minutes' | 'quick_entry' | 'scores' | 'verdict'
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);
  const [minutes, setMinutes] = useState(null);
  const [liveScores, setLiveScores] = useState(null);

  // OVPAA-F-INS-032 Document State
  const [venue, setVenue] = useState('COT Conference Room');
  const [round, setRound] = useState('2nd');
  const [clientName, setClientName] = useState('Dr. Sales G. Aribe Jr.');
  const [clientComments, setClientComments] = useState([]);
  const [newClientComment, setNewClientComment] = useState('');
  const [overallRecommendations, setOverallRecommendations] = useState('');
  const [selectedVerdict, setSelectedVerdict] = useState('approved_with_minor_revisions');
  const [verdictRemarks, setVerdictRemarks] = useState('');

  // Quick entry form state
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [panelistName, setPanelistName] = useState('');
  const [critique, setCritique] = useState('');
  const [expectedAction, setExpectedAction] = useState('');
  const [severity, setSeverity] = useState('minor');
  const [pageOrModule, setPageOrModule] = useState('');
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);

  // Actions state
  const [isFinalizingVerdict, setIsFinalizingVerdict] = useState(false);
  const [isLockingScores, setIsLockingScores] = useState(false);
  const [isPublishingADM, setIsPublishingADM] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);

  // Candidate panelists list
  const candidatePanelists = useMemo(() => {
    const list = (panelists || project?.panelists || []).map((p) => {
      const u = p.userId || p;
      const fullName = [u?.firstName, u?.lastName].filter(Boolean).join(' ');
      return {
        id: u?._id || p?._id,
        name: fullName || p.name || 'Panel Member',
        role: p.role || 'member',
      };
    });
    return list;
  }, [panelists, project]);

  // Proponents names formatted
  const proponentsString = useMemo(() => {
    const members = project?.teamId?.members || [];
    if (Array.isArray(members) && members.length > 0) {
      return members
        .map((m) => {
          const parts = [m.lastName, m.firstName].filter(Boolean);
          return parts.length > 0 ? parts.join(', ') : m.name || 'Proponent';
        })
        .join('; ');
    }
    return 'Antipuesto, Throylan; Canoy, Chijay; Anedez, Patrick Josh; Bautista, Steven Joe';
  }, [project]);

  const entries = minutes?.entries || [];

  // Group entries by panelist
  const entriesByPanelist = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      const name = e.panelistName || 'Panelist';
      if (!map[name]) map[name] = [];
      map[name].push(e);
    });
    return map;
  }, [entries]);

  // Load session minutes & live scores
  const loadSession = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const res = await defenseMinutesService.getMinutes(projectId, defenseType);
      if (res?.data?.data) {
        const dMin = res.data.data.defenseMinutes;
        setMinutes(dMin);
        setLiveScores(res.data.data.liveScores);
        if (dMin.venue) setVenue(dMin.venue);
        if (dMin.round) setRound(dMin.round);
        if (dMin.clientName) setClientName(dMin.clientName);
        if (Array.isArray(dMin.clientComments)) setClientComments(dMin.clientComments);
        if (dMin.overallRecommendations) setOverallRecommendations(dMin.overallRecommendations);
        if (dMin.consensusVerdict?.verdict) {
          setSelectedVerdict(dMin.consensusVerdict.verdict);
          setVerdictRemarks(dMin.consensusVerdict.remarks || '');
        }
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load defense session.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, defenseType]);

  useEffect(() => {
    if (isVisible) {
      loadSession();
      if (candidatePanelists.length > 0 && !panelistName) {
        setPanelistName(candidatePanelists[0].name);
      }
    }
  }, [isVisible, loadSession, candidatePanelists, panelistName]);

  // WebSocket real-time live synchronization
  useEffect(() => {
    if (!projectId || !isVisible) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit('join:project', projectId);

    const handleMinutesUpdated = (data) => {
      if (data?.projectId === projectId) {
        setIsLiveSyncing(true);
        loadSession();
        setTimeout(() => setIsLiveSyncing(false), 1200);
      }
    };

    socket.on('defense:minutes_updated', handleMinutesUpdated);

    return () => {
      socket.off('defense:minutes_updated', handleMinutesUpdated);
    };
  }, [projectId, isVisible, loadSession]);

  // Close on Escape key press
  useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, handleClose]);

  // Handle Add Entry (Panelist Comment)
  const handleAddEntry = async (e) => {
    if (e) e.preventDefault();
    if (!panelistName.trim()) {
      toast.error('Please specify or select a panelist.');
      return;
    }
    if (!critique.trim()) {
      toast.error('Please input the critique or recommendation voiced.');
      return;
    }
    if (!expectedAction.trim()) {
      toast.error('Please define the expected action/revision.');
      return;
    }

    setIsSubmittingEntry(true);
    try {
      const payload = {
        category,
        panelistName: panelistName.trim(),
        critique: critique.trim(),
        expectedAction: expectedAction.trim(),
        severity,
        pageOrModule: pageOrModule.trim(),
      };
      const res = await defenseMinutesService.addEntry(projectId, defenseType, payload);
      toast.success('Revision item logged to official minutes.');
      setMinutes(res?.data?.data?.defenseMinutes || minutes);
      setCritique('');
      setExpectedAction('');
      setPageOrModule('');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add revision item.');
    } finally {
      setIsSubmittingEntry(false);
    }
  };

  // Add Client Comment Bullet Point
  const handleAddClientComment = async () => {
    if (!newClientComment.trim()) return;
    const updated = [...clientComments, newClientComment.trim()];
    setClientComments(updated);
    setNewClientComment('');

    try {
      await defenseMinutesService.updateSessionDetails(projectId, defenseType, {
        clientName,
        clientComments: updated,
      });
      toast.success('Client recommendation added.');
    } catch {
      toast.error('Failed to sync client recommendation.');
    }
  };

  // Remove Client Comment Bullet Point
  const handleRemoveClientComment = async (index) => {
    const updated = clientComments.filter((_, idx) => idx !== index);
    setClientComments(updated);
    try {
      await defenseMinutesService.updateSessionDetails(projectId, defenseType, {
        clientName,
        clientComments: updated,
      });
      toast.success('Client recommendation removed.');
    } catch {
      toast.error('Failed to sync client recommendation update.');
    }
  };

  // Handle Delete Entry
  const handleDeleteEntry = async (entryId) => {
    try {
      const res = await defenseMinutesService.deleteEntry(projectId, defenseType, entryId);
      toast.success('Item removed from minutes.');
      setMinutes(res?.data?.data?.defenseMinutes || minutes);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete item.');
    }
  };

  // Save session details (venue, round, client, overall recommendations)
  const handleSaveSessionDetails = async () => {
    setIsSavingSession(true);
    try {
      await defenseMinutesService.updateSessionDetails(projectId, defenseType, {
        venue,
        round,
        clientName,
        clientComments,
        overallRecommendations,
      });
      toast.success('Official defense session metadata saved.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save session metadata.');
    } finally {
      setIsSavingSession(false);
    }
  };

  // Handle Lock Scores
  const handleLockScores = async () => {
    setIsLockingScores(true);
    try {
      const res = await defenseMinutesService.lockCompositeScores(projectId, defenseType, {
        confirmedByChair: true,
      });
      toast.success('Composite scores verified and locked.');
      setMinutes(res?.data?.data?.defenseMinutes || minutes);
      loadSession();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to lock scores.');
    } finally {
      setIsLockingScores(false);
    }
  };

  // Handle Finalize Verdict
  const handleFinalizeVerdict = async () => {
    setIsFinalizingVerdict(true);
    try {
      const res = await defenseMinutesService.finalizeVerdict(projectId, defenseType, {
        verdict: selectedVerdict,
        remarks: verdictRemarks || overallRecommendations,
        chairConfirmed: true,
      });
      toast.success('Consensus verdict officially recorded.');
      setMinutes(res?.data?.data?.defenseMinutes || minutes);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record verdict.');
    } finally {
      setIsFinalizingVerdict(false);
    }
  };

  // Handle Publish to Action Done Matrix
  const handlePublishToADM = async () => {
    const totalItems = (minutes?.entries?.length || 0) + (clientComments?.length || 0);
    if (totalItems === 0) {
      toast.error(
        'Please record at least one panelist recommendation or client comment before publishing to the Action Done Matrix.',
      );
      return;
    }

    setIsPublishingADM(true);
    try {
      // First ensure session details (like client comments) are saved
      await defenseMinutesService.updateSessionDetails(projectId, defenseType, {
        venue,
        round,
        clientName,
        clientComments,
        overallRecommendations,
      });

      const res = await defenseMinutesService.publishToADM(projectId, defenseType);
      toast.success(
        'Action Done Matrix (ADM) successfully generated and published from Secretary Minutes!',
      );
      if (onPublished) onPublished(res?.data?.data);
      if (onMinutesPublished) onMinutesPublished(res?.data?.data);
      handleClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to publish to Action Done Matrix.');
    } finally {
      setIsPublishingADM(false);
    }
  };

  // Quick Load Institutional Reference Data from the BukSU sample
  const handleLoadInstitutionalSample = async () => {
    setIsLoading(true);
    try {
      setVenue(INSTITUTIONAL_SAMPLE.venue);
      setRound(INSTITUTIONAL_SAMPLE.round);
      setClientName(INSTITUTIONAL_SAMPLE.clientName);
      setClientComments(INSTITUTIONAL_SAMPLE.clientComments);
      setOverallRecommendations(INSTITUTIONAL_SAMPLE.overallRecommendations);
      setSelectedVerdict(INSTITUTIONAL_SAMPLE.verdict);

      await defenseMinutesService.updateSessionDetails(projectId, defenseType, {
        venue: INSTITUTIONAL_SAMPLE.venue,
        round: INSTITUTIONAL_SAMPLE.round,
        clientName: INSTITUTIONAL_SAMPLE.clientName,
        clientComments: INSTITUTIONAL_SAMPLE.clientComments,
        overallRecommendations: INSTITUTIONAL_SAMPLE.overallRecommendations,
      });

      // Populate Chair comments
      for (const c of INSTITUTIONAL_SAMPLE.chairComments) {
        await defenseMinutesService.addEntry(projectId, defenseType, {
          category: 'General / Other',
          panelistName: INSTITUTIONAL_SAMPLE.chairName,
          critique: c,
          expectedAction: 'Implement required revision in manuscript and prototype',
          severity: 'minor',
        });
      }

      // Populate Panel Member 1
      for (const c of INSTITUTIONAL_SAMPLE.panelists[0].comments) {
        await defenseMinutesService.addEntry(projectId, defenseType, {
          category: 'Methodology & Implementation',
          panelistName: INSTITUTIONAL_SAMPLE.panelists[0].name,
          critique: c,
          expectedAction:
            'Update documentation and system functionality according to panel recommendation',
          severity: 'minor',
        });
      }

      // Populate Panel Member 2
      for (const c of INSTITUTIONAL_SAMPLE.panelists[1].comments) {
        await defenseMinutesService.addEntry(projectId, defenseType, {
          category: 'UI/UX',
          panelistName: INSTITUTIONAL_SAMPLE.panelists[1].name,
          critique: c,
          expectedAction: 'Refine interface visibility and submission handling',
          severity: 'minor',
        });
      }

      await loadSession();
      toast.success('BukSU OVPAA-F-INS-032 reference sample loaded successfully!');
    } catch (err) {
      toast.error('Failed to load sample data: ' + (err?.message || 'Error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isScoreLocked = Boolean(minutes?.compositeScores?.isLocked);
  const isMatrixPublished = Boolean(minutes?.matrixPublished);

  if (!isVisible) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Modal Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-muted/30 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-foreground truncate">
                  Secretary&apos;s Minutes Studio — OVPAA-F-INS-032
                </h2>
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-mono tracking-wider border-primary/40 bg-primary/10 text-primary"
                >
                  {defenseType === 'midterm' ? 'Prototype Defense' : `${defenseType} Defense`}
                </Badge>
                {isLiveSyncing && (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-emerald-500/40 bg-emerald-500/10 text-emerald-600 animate-pulse flex items-center gap-1"
                  >
                    <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                    Live Synced
                  </Badge>
                )}
                {isMatrixPublished && (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                  >
                    ADM Published
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {projectTitle ||
                  project?.title ||
                  'Bukidnon State University Capstone Defense Hearing'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs h-8 gap-1.5 hidden sm:flex"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Form
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
              aria-label="Close dialog"
              data-testid="close-defense-minutes-btn"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tab Navigation Ribbon */}
        <div className="flex items-center gap-1 px-6 pt-2 border-b border-border bg-card no-print overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('ovpaa_minutes')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap',
              activeTab === 'ovpaa_minutes'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            Official Minutes (OVPAA-F-INS-032)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quick_entry')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap',
              activeTab === 'quick_entry'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            Quick-Log Remark ({entries.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('scores')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap',
              activeTab === 'scores'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Calculator className="h-3.5 w-3.5" />
            Score Consolidator
            {isScoreLocked && <Lock className="h-3 w-3 text-emerald-500" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('verdict')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap',
              activeTab === 'verdict'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Gavel className="h-3.5 w-3.5" />
            Consensus &amp; Publish ADM
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Synchronizing official defense records...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: OFFICIAL OVPAA-F-INS-032 MINUTES VIEW */}
              {activeTab === 'ovpaa_minutes' && (
                <div className="space-y-6">
                  {/* Top Action Bar for Template Quick-fill & Publish */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-border/80 bg-muted/20 no-print">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Document format matches BukSU OVPAA-F-INS-032 standard.
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleLoadInstitutionalSample}
                        className="text-xs h-7 gap-1 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                      >
                        <Sparkles className="h-3 w-3" />
                        Load Reference Sample
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handlePublishToADM}
                        disabled={isPublishingADM}
                        className="text-xs h-7 font-semibold gap-1 bg-primary text-primary-foreground shadow-xs"
                      >
                        {isPublishingADM ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        Publish to ADM
                      </Button>
                    </div>
                  </div>

                  {/* Printable Institutional Minutes Document (OVPAA-F-INS-032) */}
                  <div className="border border-border bg-card rounded-xl p-6 sm:p-8 space-y-6 shadow-xs font-serif text-foreground print:border-none print:shadow-none print:p-0">
                    {/* Header */}
                    <div className="border-b border-border/80 pb-4 text-center relative">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground font-sans mb-3 border-b border-border/40 pb-1">
                        <span>
                          Document Code: <strong>OVPAA-F-INS-032</strong>
                        </span>
                        <span>
                          Revision No: <strong>01</strong>
                        </span>
                        <span>
                          Issue No: <strong>01</strong>
                        </span>
                        <span>
                          Issue Date: <strong>June 1, 2018</strong>
                        </span>
                      </div>

                      <div className="flex items-center justify-center gap-4">
                        <img
                          src={buksuLogo}
                          alt="BukSU Logo"
                          className="h-16 w-16 object-contain"
                        />
                        <div>
                          <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-foreground font-sans">
                            Bukidnon State University
                          </h3>
                          <p className="text-xs text-muted-foreground font-sans">
                            Malaybalay City, Bukidnon 8700
                          </p>
                          <p className="text-[11px] text-muted-foreground font-sans">
                            Tel (088) 813-5661 to 5663 · TeleFax (088) 813-2717 · www.buksu.edu.ph
                          </p>
                        </div>
                      </div>

                      <h4 className="text-base sm:text-lg font-bold uppercase tracking-wider text-foreground font-sans mt-4">
                        SECRETARY&apos;S MINUTES
                      </h4>
                    </div>

                    {/* Metadata Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-xs font-sans border-b border-border/80 pb-4">
                      <div className="space-y-1.5 md:col-span-2">
                        <span className="font-bold text-foreground">Title of Paper: </span>
                        <span className="text-foreground">
                          {projectTitle || project?.title || 'Capstone Project Workspace'}
                        </span>
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <span className="font-bold text-foreground">Name of Proponents: </span>
                        <span className="text-foreground">{proponentsString}</span>
                      </div>

                      <div className="space-y-1.5">
                        <span className="font-bold text-foreground">Type of Defense: </span>
                        <span className="text-foreground">
                          ( ) Proposal Defense &nbsp; <strong>(✓) Prototype Defense</strong> &nbsp;
                          ( ) Final Defense
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <span className="font-bold text-foreground">Number of Rounds: </span>
                        <span className="text-foreground">
                          ( ) 1st &nbsp; <strong>(✓) 2nd</strong> &nbsp; ( ) 3rd
                        </span>
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <span className="font-bold text-foreground">Date/Time &amp; Venue: </span>
                        <span className="text-foreground font-mono">
                          {new Date().toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}{' '}
                          || 9:00am || {venue}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <span className="font-bold text-foreground">Adviser: </span>
                        <span className="text-foreground">
                          {project?.adviserId?.firstName
                            ? `${project.adviserId.firstName} ${project.adviserId.lastName}`
                            : 'Glaiza Mae Libe'}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <span className="font-bold text-foreground">Panel Chair/REC: </span>
                        <span className="text-foreground">
                          {candidatePanelists.find((p) => p.role === 'chair')?.name ||
                            'Louie Jay S. Labastida'}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <span className="font-bold text-foreground">Panel Members: </span>
                        <span className="text-foreground">
                          {candidatePanelists
                            .filter((p) => p.role !== 'chair')
                            .map((p) => p.name)
                            .join(', ') || 'Lecaros, Raul; Abella, Joseph'}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <span className="font-bold text-foreground">Secretary: </span>
                        <span className="text-foreground">
                          {project?.secretaryId?.firstName
                            ? `${project.secretaryId.firstName} ${project.secretaryId.lastName}`
                            : 'Joan Marie M. Panes'}
                        </span>
                      </div>
                    </div>

                    {/* Comments & Suggestions Table */}
                    <div className="space-y-2 font-sans">
                      <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="border-b border-border bg-muted/40 text-foreground font-bold">
                              <th className="py-2.5 px-4 w-1/4 border-r border-border">
                                Name of Panel
                              </th>
                              <th className="py-2.5 px-4 w-3/4">COMMENTS / SUGGESTIONS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {/* Panelists & Chair Sections */}
                            {Object.entries(entriesByPanelist).map(([panelist, items]) => (
                              <tr key={panelist} className="align-top">
                                <td className="py-3 px-4 font-bold text-foreground border-r border-border bg-muted/5">
                                  {panelist}
                                </td>
                                <td className="py-3 px-4 space-y-1.5">
                                  <ul className="list-disc list-inside space-y-1 text-foreground leading-relaxed">
                                    {items.map((item) => (
                                      <li key={item._id} className="text-xs">
                                        <span>{item.critique}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteEntry(item._id)}
                                          className="ml-2 text-muted-foreground hover:text-destructive no-print inline"
                                          title="Remove this bullet item"
                                        >
                                          ×
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                </td>
                              </tr>
                            ))}

                            {/* Fallback empty panel row if no entries logged yet */}
                            {Object.keys(entriesByPanelist).length === 0 && (
                              <tr className="align-top">
                                <td className="py-3 px-4 font-bold text-foreground border-r border-border bg-muted/5">
                                  Louie Jay S. Labastida (Panel Chair)
                                </td>
                                <td className="py-3 px-4 text-muted-foreground italic">
                                  No panelist remarks logged yet. Use &ldquo;Quick-Log Remark&rdquo;
                                  tab or &ldquo;Load Reference Sample&rdquo;.
                                </td>
                              </tr>
                            )}

                            {/* DEDICATED CLIENT SECTION UNDER REC CHAIR / PANEL AS SPECIFIED */}
                            <tr className="align-top border-t-2 border-border bg-primary/5">
                              <td className="py-3 px-4 font-bold text-primary border-r border-border">
                                <div className="space-y-1">
                                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                                    Client / Project Beneficiary
                                  </span>
                                  <span className="text-xs font-bold block">
                                    {clientName || 'Dr. Sales G. Aribe Jr.'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 space-y-2">
                                <ul className="list-disc list-inside space-y-1.5 text-foreground leading-relaxed">
                                  {clientComments.map((cc, idx) => (
                                    <li
                                      key={idx}
                                      className="text-xs flex items-start justify-between gap-2"
                                    >
                                      <span>{cc}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveClientComment(idx)}
                                        className="text-muted-foreground hover:text-destructive no-print shrink-0"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </li>
                                  ))}
                                </ul>

                                {/* Add Client Comment Input */}
                                <div className="flex items-center gap-2 pt-1 no-print">
                                  <Input
                                    type="text"
                                    placeholder="Add client comment/suggestion bullet point..."
                                    value={newClientComment}
                                    onChange={(e) => setNewClientComment(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddClientComment();
                                      }
                                    }}
                                    className="h-8 text-xs bg-background"
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={handleAddClientComment}
                                    className="h-8 text-xs gap-1 shrink-0"
                                  >
                                    <Plus className="h-3 w-3" /> Add
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Overall Recommendations */}
                    <div className="space-y-1.5 font-sans pt-2">
                      <Label className="text-xs font-bold text-foreground">
                        Overall Recommendations:
                      </Label>
                      <AutoExpandingTextarea
                        value={overallRecommendations}
                        onChange={(e) => setOverallRecommendations(e.target.value)}
                        placeholder="Detail overall defense hearing recommendations and redefense directions..."
                        rows={2}
                        className="text-xs font-sans"
                      />
                    </div>

                    {/* Panel Verdict */}
                    <div className="space-y-2 font-sans pt-2">
                      <Label className="text-xs font-bold text-foreground">Panel Verdict:</Label>
                      <div className="flex flex-wrap gap-4 text-xs">
                        {VERDICTS.map((v) => (
                          <label key={v.value} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="doc_verdict"
                              value={v.value}
                              checked={selectedVerdict === v.value}
                              onChange={(e) => setSelectedVerdict(e.target.value)}
                              className="text-primary focus:ring-primary h-4 w-4"
                            />
                            <span
                              className={
                                selectedVerdict === v.value
                                  ? 'font-bold text-foreground'
                                  : 'text-muted-foreground'
                              }
                            >
                              {v.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Secretary Signature Block */}
                    <div className="pt-8 flex justify-end font-sans">
                      <div className="text-center w-64 space-y-1">
                        <div className="h-10 flex items-center justify-center">
                          <span className="font-serif italic font-bold text-primary tracking-widest text-base">
                            {minutes?.secretaryId?.firstName
                              ? `${minutes.secretaryId.firstName} ${minutes.secretaryId.lastName}`
                              : 'Joan Marie M. Panes'}
                          </span>
                        </div>
                        <div className="border-t border-foreground pt-1">
                          <p className="text-xs font-bold uppercase text-foreground">
                            {minutes?.secretaryId?.firstName
                              ? `${minutes.secretaryId.firstName} ${minutes.secretaryId.lastName}`
                              : 'JOAN MARIE M. PANES'}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Signature over Printed Name of Secretary
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save Session Action */}
                  <div className="flex justify-end gap-2 no-print pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSaveSessionDetails}
                      disabled={isSavingSession}
                      className="text-xs h-8 gap-1.5"
                    >
                      {isSavingSession && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Save Minutes Draft
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handlePublishToADM}
                      disabled={isPublishingADM}
                      className="text-xs h-8 font-semibold gap-1.5 shadow-xs"
                    >
                      {isPublishingADM ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Publish to Action Done Matrix (ADM)
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB 2: QUICK ENTRY LOGGER FORM */}
              {activeTab === 'quick_entry' && (
                <div className="space-y-6">
                  <form
                    onSubmit={handleAddEntry}
                    className="rounded-xl border border-border bg-muted/20 p-4 space-y-4 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5 text-primary" />
                        Log Panel Revision Remark / Critique
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Logged entries populate the official student Action Done Matrix (ADM)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-foreground">Category</Label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-foreground">
                          Panelist Attribution
                        </Label>
                        {candidatePanelists.length > 0 ? (
                          <select
                            value={panelistName}
                            onChange={(e) => setPanelistName(e.target.value)}
                            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                          >
                            {candidatePanelists.map((p) => (
                              <option key={p.id} value={p.name}>
                                {p.name} ({p.role})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            placeholder="e.g. Dr. Louie Jay Labastida"
                            value={panelistName}
                            onChange={(e) => setPanelistName(e.target.value)}
                            className="h-9 text-xs"
                          />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-foreground">Severity</Label>
                          <select
                            value={severity}
                            onChange={(e) => setSeverity(e.target.value)}
                            className="w-full h-9 rounded-lg border border-input bg-background px-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                          >
                            {SEVERITIES.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-foreground">
                            Page / Module
                          </Label>
                          <Input
                            placeholder="e.g. Ch 3, p. 45"
                            value={pageOrModule}
                            onChange={(e) => setPageOrModule(e.target.value)}
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-foreground">
                          Critique / Flaw Voiced
                        </Label>
                        <AutoExpandingTextarea
                          placeholder="Detail the specific observation or flaw noted by the panelist..."
                          value={critique}
                          onChange={(e) => setCritique(e.target.value)}
                          rows={2}
                          className="text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-foreground">
                          Required Revision / Expected Action
                        </Label>
                        <AutoExpandingTextarea
                          placeholder="Action required from the student team to resolve this item..."
                          value={expectedAction}
                          onChange={(e) => setExpectedAction(e.target.value)}
                          rows={2}
                          className="text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={isSubmittingEntry}
                        className="gap-2 font-semibold shadow-xs"
                      >
                        {isSubmittingEntry ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        Log Revision Item
                      </Button>
                    </div>
                  </form>

                  {/* Logged Revisions List */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Recorded Defense Minutes ({entries.length} items)
                    </h3>

                    {entries.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="text-xs font-medium">No defense minutes recorded yet.</p>
                        <p className="text-[11px] text-muted-foreground">
                          Use the form above to record panel remarks in real time as defense
                          proceeds.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {entries.map((item, idx) => (
                          <div
                            key={item._id || idx}
                            className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors shadow-xs"
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-foreground">
                                  #{idx + 1}. {item.panelistName}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] bg-muted/40 border-border"
                                >
                                  {item.category}
                                </Badge>
                                {item.pageOrModule && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-mono text-muted-foreground"
                                  >
                                    {item.pageOrModule}
                                  </Badge>
                                )}
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px] capitalize',
                                    item.severity === 'critical'
                                      ? 'border-rose-500/40 text-rose-600 bg-rose-500/10'
                                      : item.severity === 'major'
                                        ? 'border-amber-500/40 text-amber-600 bg-amber-500/10'
                                        : 'border-blue-500/40 text-blue-600 bg-blue-500/10',
                                  )}
                                >
                                  {item.severity}
                                </Badge>
                              </div>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteEntry(item._id)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive rounded-lg"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1 border-t border-border/50">
                              <div>
                                <span className="font-semibold text-muted-foreground block text-[11px] mb-0.5">
                                  Critique / Flaw:
                                </span>
                                <p className="text-foreground leading-relaxed">{item.critique}</p>
                              </div>
                              <div>
                                <span className="font-semibold text-muted-foreground block text-[11px] mb-0.5">
                                  Expected Action:
                                </span>
                                <p className="text-foreground leading-relaxed">
                                  {item.expectedAction}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: AUTOMATED SCORE CONSOLIDATOR */}
              {activeTab === 'scores' && (
                <div className="space-y-6">
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Award className="h-5 w-5 text-primary" />
                          <h3 className="text-sm font-bold text-foreground">
                            Consolidated Composite Defense Score
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Aggregated evaluation scores from assigned panel members (Passing Cutoff:
                          75%)
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-2xl font-black font-mono text-primary">
                            {liveScores?.averagePercentage !== null
                              ? `${liveScores.averagePercentage}%`
                              : '—'}
                          </span>
                          <span className="text-[11px] text-muted-foreground block">
                            {liveScores?.averageScore !== null
                              ? `${liveScores.averageScore} / ${liveScores.averageMaxScore}`
                              : 'Awaiting scores'}
                          </span>
                        </div>

                        {liveScores?.passingThresholdMet ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/40 text-emerald-600 bg-emerald-500/10 font-bold text-xs py-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Passed (≥75%)
                          </Badge>
                        ) : liveScores?.submittedCount > 0 ? (
                          <Badge
                            variant="outline"
                            className="border-rose-500/40 text-rose-600 bg-rose-500/10 font-bold text-xs py-1"
                          >
                            <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Below 75%
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground border-border text-xs py-1"
                          >
                            Awaiting Scores
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Panel Scores Breakdown Table */}
                  <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
                    <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-primary" />
                        Individual Evaluation Rubrics Consolidation
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={loadSession}
                        className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <Clock className="h-3 w-3" /> Refresh Rubrics
                      </Button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-muted/10 text-[11px] font-bold text-muted-foreground">
                            <th className="py-2.5 px-4">Panel Member</th>
                            <th className="py-2.5 px-3">Role</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-right">Total Score</th>
                            <th className="py-2.5 px-3 text-right">Percentage</th>
                            <th className="py-2.5 px-4 text-center">Decision</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {liveScores?.panelScores && liveScores.panelScores.length > 0 ? (
                            liveScores.panelScores.map((row, idx) => (
                              <tr key={idx} className="hover:bg-muted/20 transition-colors">
                                <td className="py-3 px-4 font-semibold text-foreground flex items-center gap-2">
                                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                                  {row.panelistName}
                                </td>
                                <td className="py-3 px-3 capitalize text-muted-foreground font-mono text-[11px]">
                                  {row.panelRole}
                                </td>
                                <td className="py-3 px-3">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-[10px] capitalize',
                                      row.status === 'submitted' || row.status === 'released'
                                        ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10'
                                        : 'border-amber-500/40 text-amber-600 bg-amber-500/10',
                                    )}
                                  >
                                    {row.status}
                                  </Badge>
                                </td>
                                <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                                  {row.score !== null ? `${row.score} / ${row.maxScore}` : '—'}
                                </td>
                                <td className="py-3 px-3 text-right font-mono font-bold text-primary">
                                  {row.percentage !== null ? `${row.percentage}%` : '—'}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {row.decision ? (
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        'text-[10px] capitalize',
                                        ['passed', 'approved'].includes(row.decision.toLowerCase())
                                          ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10'
                                          : [
                                                'passed_with_revisions',
                                                'passed_with_revision',
                                              ].includes(row.decision.toLowerCase())
                                            ? 'border-amber-500/40 text-amber-600 bg-amber-500/10'
                                            : 'border-rose-500/40 text-rose-600 bg-rose-500/10',
                                      )}
                                    >
                                      {row.decision.replace(/_/g, ' ')}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground italic text-[11px]">
                                      Pending
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={6}
                                className="py-6 text-center text-muted-foreground italic"
                              >
                                No panel evaluation sheets registered for this defense yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Confirmation & Lock Box */}
                  <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold text-foreground">
                          Score Confirmation &amp; Immutability Lock
                        </span>
                        {isScoreLocked && (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/40 text-emerald-600 bg-emerald-500/10 text-[10px]"
                          >
                            Locked &amp; Confirmed
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Locking freezes the aggregated score table for committee documentation.
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={handleLockScores}
                      disabled={isLockingScores || isScoreLocked}
                      className="gap-2 font-semibold shadow-xs"
                    >
                      {isLockingScores ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      )}
                      {isScoreLocked ? 'Composite Scores Locked' : 'Confirm & Lock Scores'}
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB 4: CONSENSUS VERDICT & PUBLISH */}
              {activeTab === 'verdict' && (
                <div className="space-y-6">
                  <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
                    <div className="flex items-center gap-2 border-b border-border pb-3">
                      <Gavel className="h-4 w-4 text-primary" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Committee Consensus Verdict
                      </h3>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs font-medium text-foreground">
                        Consensus Decision
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {VERDICTS.map((v) => (
                          <label
                            key={v.value}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                              selectedVerdict === v.value
                                ? 'border-primary bg-primary/5 text-foreground font-semibold shadow-xs'
                                : 'border-border bg-muted/10 text-muted-foreground hover:bg-muted/20',
                            )}
                          >
                            <input
                              type="radio"
                              name="verdict"
                              value={v.value}
                              checked={selectedVerdict === v.value}
                              onChange={(e) => setSelectedVerdict(e.target.value)}
                              className="text-primary focus:ring-primary h-4 w-4"
                            />
                            <span className="text-xs">{v.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground">
                        Committee Recommendations &amp; Summary Remarks
                      </Label>
                      <AutoExpandingTextarea
                        placeholder="Provide consensus justification, key directions, and conditions required from the proponent team..."
                        value={verdictRemarks}
                        onChange={(e) => setVerdictRemarks(e.target.value)}
                        rows={3}
                        className="text-xs"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleFinalizeVerdict}
                        disabled={isFinalizingVerdict}
                        className="gap-1.5 font-semibold text-xs"
                      >
                        {isFinalizingVerdict ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Gavel className="h-3.5 w-3.5" />
                        )}
                        Record Consensus Verdict
                      </Button>
                    </div>
                  </div>

                  {/* Publish to ADM Card */}
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3 shadow-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-bold text-foreground">
                        Publish to Action Done Matrix (ADM)
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Publishing transforms all logged revision remarks ({entries.length} items) and
                      client comments ({clientComments.length} items) into the official Action Done
                      Matrix checklist on the student and faculty dashboards.
                    </p>

                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                        <span>
                          Items to convert:{' '}
                          <strong className="text-foreground">
                            {entries.length + clientComments.length}
                          </strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClose}
                          className="text-xs"
                          data-testid="footer-close-defense-minutes-btn"
                        >
                          Close Minutes
                        </Button>
                        <Button
                          size="sm"
                          onClick={handlePublishToADM}
                          disabled={isPublishingADM}
                          className="gap-2 font-bold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          {isPublishingADM ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Publish to Action Done Matrix
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}

LiveDefenseMinutesModal.propTypes = {
  isOpen: PropTypes.bool,
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onOpenChange: PropTypes.func,
  projectId: PropTypes.string,
  defenseType: PropTypes.string,
  projectTitle: PropTypes.string,
  project: PropTypes.object,
  panelists: PropTypes.array,
  user: PropTypes.object,
  onPublished: PropTypes.func,
  onMinutesPublished: PropTypes.func,
};
