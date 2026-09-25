import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  FileSpreadsheet,
  Award,
  ChevronDown,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Eye,
  Clock,
  ExternalLink,
  BookMarked,
  ScrollText,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { DOCUMENT_TYPES, SUBMISSION_STATUSES } from '@cms/shared';
import { useProjectSubmissions } from '@/hooks/useSubmissions';
import ChapterReviewPanel from '@/components/submissions/ChapterReviewPanel';
import ActionDoneMatrixTab from './ActionDoneMatrixTab';
import EvaluationPanel from './EvaluationPanel';
import SophisticatedDocumentViewer from '@/components/documents/SophisticatedDocumentViewer';

function formatDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Capstone3CollapsibleSections
 *
 * Compact, organized, and sectionized workspace for Capstone 3:
 * 1. Chapters 4–5 & Final Manuscript Submissions (with Compiled Chapters 1–5 / Final Paper)
 * 2. Academic Paper & Academic Journal Submissions (Official institutional publications)
 * 3. Action Done Matrix (ADM v3 with Secretary Verification Gate)
 * 4. Final Defense Evaluation & Grade Sign-Off (Final oral defense scoring & verdict)
 */
export default function Capstone3CollapsibleSections({
  project,
  isStudent = false,
  isFaculty = false,
  user,
  onRefresh,
}) {
  const navigate = useNavigate();

  const [openSections, setOpenSections] = useState({
    chapters: true, // Default open for submission review
    publications: false,
    adm: false,
    evaluation: false,
  });

  const toggleSection = (key) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Document Viewer modal state
  const [activeViewerSubmission, setActiveViewerSubmission] = useState(null);

  const { data: submissions = [] } = useProjectSubmissions(project?._id);

  const list = useMemo(() => {
    return Array.isArray(submissions)
      ? submissions
      : submissions?.submissions || submissions?.data || [];
  }, [submissions]);

  // Academic Paper & Academic Journal submissions
  const academicPaperSubs = useMemo(() => {
    return list
      .filter((s) => s.type === DOCUMENT_TYPES.FINAL_ACADEMIC || s.type === 'final_academic')
      .sort((a, b) => (b.version || 0) - (a.version || 0));
  }, [list]);

  const academicJournalSubs = useMemo(() => {
    return list
      .filter((s) => s.type === DOCUMENT_TYPES.FINAL_JOURNAL || s.type === 'final_journal')
      .sort((a, b) => (b.version || 0) - (a.version || 0));
  }, [list]);

  const latestAcademicPaper = academicPaperSubs[0];
  const latestAcademicJournal = academicJournalSubs[0];

  const admRows = project?.actionDoneMatrix || [];
  const capstone3AdmRows = admRows.filter(
    (r) => r.milestone === 'CAPSTONE_3' || r.milestone === 'capstone_3',
  );
  const isAdmApproved = project?.admStatus === 'approved';
  const isSecretaryEndorsed = Boolean(project?.admSignatures?.secretary?.endorsed);

  const isInstructor = user?.role === 'instructor';
  const isAssignedAdviser =
    (project?.adviserId?._id || project?.adviserId)?.toString() === user?._id?.toString();

  return (
    <div className="space-y-3" data-testid="capstone3-collapsible-workspace">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 1: CHAPTERS 4–5 & FINAL MANUSCRIPT SUBMISSIONS              */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Card
        className={cn(
          'overflow-hidden rounded-xl border border-border/70 bg-card transition-all shadow-xs',
          openSections.chapters && 'ring-1 ring-primary/20',
        )}
      >
        <button
          type="button"
          onClick={() => toggleSection('chapters')}
          className="w-full text-left p-4 sm:p-4.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors focus-visible:outline-none"
          aria-expanded={openSections.chapters}
          data-testid="toggle-chapters-section"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
              <BookOpen className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  Chapters 4–5 &amp; Final Manuscript Submissions
                </span>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] text-muted-foreground border-border/60"
                >
                  Results, Conclusions &amp; Complete Paper
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-xl">
                Submission review, originality compliance, and OOXML reader view
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:inline-block">
              {openSections.chapters ? 'Collapse' : 'Expand'}
            </span>
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-transform duration-200',
                openSections.chapters && 'rotate-180 text-foreground bg-muted/50',
              )}
            >
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </button>

        {openSections.chapters && (
          <CardContent className="p-4 sm:p-6 pt-0 border-t border-border/50 animate-in fade-in duration-200">
            <div className="pt-2">
              <ChapterReviewPanel
                submissions={submissions}
                chapters={[4, 5]}
                title="Capstone 3 — Chapter Submissions"
                description="Approve or request revisions for Chapters 4 and 5."
                showReviewActions={isInstructor || isAssignedAdviser}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 2: ACADEMIC PAPER & ACADEMIC JOURNAL                        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Card
        className={cn(
          'overflow-hidden rounded-xl border border-border/70 bg-card transition-all shadow-xs',
          openSections.publications && 'ring-1 ring-primary/20',
        )}
      >
        <button
          type="button"
          onClick={() => toggleSection('publications')}
          className="w-full text-left p-4 sm:p-4.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors focus-visible:outline-none"
          aria-expanded={openSections.publications}
          data-testid="toggle-publications-section"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold shrink-0">
              <FileText className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  Academic Paper &amp; Academic Journal
                </span>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] text-muted-foreground border-border/60"
                >
                  Publishable Archives
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-xl">
                Official full institutional research paper and condensed journal article
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:inline-block">
              {openSections.publications ? 'Collapse' : 'Expand'}
            </span>
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-transform duration-200',
                openSections.publications && 'rotate-180 text-foreground bg-muted/50',
              )}
            >
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </button>

        {openSections.publications && (
          <CardContent className="p-4 sm:p-6 pt-0 border-t border-border/50 animate-in fade-in duration-200">
            <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Publication Card 1: Academic Paper */}
              <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                        <BookMarked className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">Academic Paper</h4>
                        <p className="text-xs text-muted-foreground">
                          Full 5-chapter institutional repository manuscript
                        </p>
                      </div>
                    </div>
                    {latestAcademicPaper ? (
                      <Badge variant="outline" className="text-xs">
                        v{latestAcademicPaper.version || 1}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Not Started
                      </Badge>
                    )}
                  </div>

                  {latestAcademicPaper ? (
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="font-medium text-foreground capitalize">
                          {latestAcademicPaper.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Uploaded:</span>
                        <span className="font-medium text-foreground">
                          {formatDate(latestAcademicPaper.createdAt)}
                        </span>
                      </div>
                      {latestAcademicPaper.fileName && (
                        <div className="flex justify-between truncate">
                          <span className="text-muted-foreground">File:</span>
                          <span className="font-mono text-[11px] truncate max-w-[200px]">
                            {latestAcademicPaper.fileName}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border/70 p-4 text-center">
                      <p className="text-xs text-muted-foreground">
                        No submissions yet for this academic paper.
                      </p>
                    </div>
                  )}
                </div>

                {latestAcademicPaper && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40">
                    <Button
                      size="sm"
                      variant="default"
                      className="gap-1.5 text-xs h-8"
                      onClick={() => setActiveViewerSubmission(latestAcademicPaper)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Read Document
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs h-8"
                      onClick={() => navigate(`/project/submissions/${latestAcademicPaper._id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                )}
              </div>

              {/* Publication Card 2: Academic Journal */}
              <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
                        <ScrollText className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">Academic Journal</h4>
                        <p className="text-xs text-muted-foreground">
                          Condensed IEEE/ACM publishable format article
                        </p>
                      </div>
                    </div>
                    {latestAcademicJournal ? (
                      <Badge variant="outline" className="text-xs">
                        v{latestAcademicJournal.version || 1}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Not Started
                      </Badge>
                    )}
                  </div>

                  {latestAcademicJournal ? (
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="font-medium text-foreground capitalize">
                          {latestAcademicJournal.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Uploaded:</span>
                        <span className="font-medium text-foreground">
                          {formatDate(latestAcademicJournal.createdAt)}
                        </span>
                      </div>
                      {latestAcademicJournal.fileName && (
                        <div className="flex justify-between truncate">
                          <span className="text-muted-foreground">File:</span>
                          <span className="font-mono text-[11px] truncate max-w-[200px]">
                            {latestAcademicJournal.fileName}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border/70 p-4 text-center">
                      <p className="text-xs text-muted-foreground">
                        No submissions yet for this academic journal.
                      </p>
                    </div>
                  )}
                </div>

                {latestAcademicJournal && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40">
                    <Button
                      size="sm"
                      variant="default"
                      className="gap-1.5 text-xs h-8"
                      onClick={() => setActiveViewerSubmission(latestAcademicJournal)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Read Document
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs h-8"
                      onClick={() => navigate(`/project/submissions/${latestAcademicJournal._id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 3: ACTION DONE MATRIX (ADM v3)                              */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Card
        className={cn(
          'overflow-hidden rounded-xl border border-border/70 bg-card transition-all shadow-xs',
          openSections.adm && 'ring-1 ring-primary/20',
        )}
      >
        <button
          type="button"
          onClick={() => toggleSection('adm')}
          className="w-full text-left p-4 sm:p-4.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors focus-visible:outline-none"
          aria-expanded={openSections.adm}
          data-testid="toggle-adm-section"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold shrink-0">
              <FileSpreadsheet className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  Action Done Matrix (ADM v3)
                </span>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] text-muted-foreground border-border/60"
                >
                  {capstone3AdmRows.length} Items
                </Badge>
                {isAdmApproved ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Ratified
                  </Badge>
                ) : isSecretaryEndorsed ? (
                  <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 text-[10px] font-semibold gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Secretary Endorsed
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] text-muted-foreground border-border/60"
                  >
                    Final Revisions
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-xl">
                Official BukSU Form RU-F-033 — Final defense panel remarks, secretary verification
                gate, and multi-tier sign-off
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:inline-block">
              {openSections.adm ? 'Collapse' : 'Expand'}
            </span>
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-transform duration-200',
                openSections.adm && 'rotate-180 text-foreground bg-muted/50',
              )}
            >
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </button>

        {openSections.adm && (
          <CardContent className="p-4 sm:p-6 pt-0 border-t border-border/50 animate-in fade-in duration-200">
            <div className="pt-2">
              <ActionDoneMatrixTab
                project={project}
                isStudent={isStudent}
                isFaculty={isFaculty}
                user={user}
                onRefresh={onRefresh}
                initialMilestone="CAPSTONE_3"
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 4: FINAL DEFENSE EVALUATION & GRADE SIGN-OFF                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Card
        className={cn(
          'overflow-hidden rounded-xl border border-border/70 bg-card transition-all shadow-xs',
          openSections.evaluation && 'ring-1 ring-primary/20',
        )}
      >
        <button
          type="button"
          onClick={() => toggleSection('evaluation')}
          className="w-full text-left p-4 sm:p-4.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors focus-visible:outline-none"
          aria-expanded={openSections.evaluation}
          data-testid="toggle-evaluation-section"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold shrink-0">
              <Award className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  Final Oral Defense Evaluation &amp; Grade Sign-Off
                </span>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] text-muted-foreground border-border/60"
                >
                  Final Defense
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-xl">
                Committee rubric evaluations, final composite scoring, and degree clearance verdict
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:inline-block">
              {openSections.evaluation ? 'Collapse' : 'Expand'}
            </span>
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-transform duration-200',
                openSections.evaluation && 'rotate-180 text-foreground bg-muted/50',
              )}
            >
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </button>

        {openSections.evaluation && (
          <CardContent className="p-4 sm:p-6 pt-0 border-t border-border/50 animate-in fade-in duration-200">
            <div className="pt-2">
              <EvaluationPanel projectId={project?._id} defenseType="final" />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Institutional Document & Diff Viewer Modal */}
      {activeViewerSubmission && (
        <SophisticatedDocumentViewer
          open={Boolean(activeViewerSubmission)}
          onOpenChange={(isOpen) => !isOpen && setActiveViewerSubmission(null)}
          submission={activeViewerSubmission}
        />
      )}
    </div>
  );
}

Capstone3CollapsibleSections.propTypes = {
  project: PropTypes.shape({
    _id: PropTypes.string,
    actionDoneMatrix: PropTypes.arrayOf(PropTypes.object),
    admStatus: PropTypes.string,
    admSignatures: PropTypes.object,
    adviserId: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  }),
  isStudent: PropTypes.bool,
  isFaculty: PropTypes.bool,
  user: PropTypes.object,
  onRefresh: PropTypes.func,
};
