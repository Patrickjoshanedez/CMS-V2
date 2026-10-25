import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  FileText,
  CheckSquare,
  ShieldAlert,
  MessageSquare,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  SlidersHorizontal,
  Printer,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Label } from '@/components/ui/Label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Slider } from '@/components/ui/Slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';
import PdfViewerWorkspace from './PdfViewerWorkspace';

/**
 * StickyDefenseVerdictBar — Pinned bottom verdict action toolbar
 */
export function StickyVerdictBar({
  _submissionId,
  canSubmitVerdict = true,
  onVerdict,
  isSubmitting = false,
  verdictScore = null,
}) {
  return (
    <footer
      data-no-print="true"
      className="print:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3 bg-background border-t border-border shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Defense Verdict
          </span>
          {verdictScore !== null && (
            <Badge variant="success" className="font-mono text-xs">
              Score: {verdictScore}%
            </Badge>
          )}
        </div>
        <span className="hidden sm:inline text-xs text-muted-foreground">
          Committee evaluations are recorded and bound to the Action Done Matrix.
        </span>
      </div>

      <div className="flex items-center gap-2">
        {canSubmitVerdict ? (
          <>
            <Button
              type="button"
              variant="destructiveOutline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => onVerdict?.('rejected')}
              className="min-h-[44px] gap-1.5 text-xs sm:min-h-0"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Reject Submission</span>
              <span className="xs:hidden">Reject</span>
            </Button>

            <Button
              type="button"
              variant="warningOutline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => onVerdict?.('revision_required')}
              className="min-h-[44px] gap-1.5 text-xs sm:min-h-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Request Revision</span>
              <span className="xs:hidden">Revision</span>
            </Button>

            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={isSubmitting}
              onClick={() => onVerdict?.('approved')}
              className="min-h-[44px] gap-1.5 text-xs sm:min-h-0"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Approve Submission</span>
              <span className="xs:hidden">Approve</span>
            </Button>
          </>
        ) : (
          <Badge variant="outline" className="text-xs text-muted-foreground border-border">
            Read-only evaluation mode
          </Badge>
        )}
      </div>
    </footer>
  );
}

const EMPTY_ARRAY = Object.freeze([]);

/**
 * EvaluationWorkspace — Split-Screen Defense & Annotation Workspace
 *
 * Implements 55/45 split grid on desktop, fluid vertical stack on mobile/tablet,
 * with layer filtering and sticky verdict dispatch.
 */
export function EvaluationWorkspace({
  submission,
  pdfUrl,
  highlights = EMPTY_ARRAY,
  rubrics = EMPTY_ARRAY,
  admItems = EMPTY_ARRAY,
  plagiarismSources = EMPTY_ARRAY,
  plagiarismMatches = EMPTY_ARRAY,
  onSelectionFinished,
  onAddReply,
  onResolveComment,
  onAddToAdm,
  onVerdict,
  userRole = 'adviser',
  canModerate = true,
  isVerdictSubmitting = false,
}) {
  const [activeMobileTab, setActiveMobileTab] = useState('both'); // 'both' | 'pdf' | 'rubric'
  const [activeRightTab, setActiveRightTab] = useState('rubrics'); // 'rubrics' | 'adm' | 'sources'
  const [layerFilter, setLayerFilter] = useState('all'); // 'all' | 'comments' | 'plagiarism'
  const [localAdmItems, setLocalAdmItems] = useState(admItems);
  const [commentsOpacity, setCommentsOpacity] = useState(80);
  const [plagiarismOpacity, setPlagiarismOpacity] = useState(80);
  const [showOpacityControls, setShowOpacityControls] = useState(false);
  const prevAdmItemsRef = useRef(admItems);

  useEffect(() => {
    if (admItems !== prevAdmItemsRef.current) {
      prevAdmItemsRef.current = admItems;
      if (Array.isArray(admItems)) {
        setLocalAdmItems(admItems);
      }
    }
  }, [admItems]);

  const handleAddToAdmDirective = async (directive) => {
    const optimisticItem = {
      _id: `adm-opt-${Date.now()}`,
      itemNumber: localAdmItems.length + 1,
      category: 'Academic Integrity Directive',
      pageNumber: Number(directive.pageNumbers) || 1,
      commentText: directive.suggestion,
      remarks: directive.suggestion,
      suggestion: directive.suggestion,
      actionTaken: '',
      status: 'pending',
      expectedAction: directive.expectedAction,
      milestone: directive.milestone || 'CAPSTONE_2',
    };
    setLocalAdmItems((prev) => [...prev, optimisticItem]);
    setActiveRightTab('adm');
    toast.success('Directive added to Action Done Matrix (ADM).');

    if (onAddToAdm) {
      try {
        await onAddToAdm(directive);
      } catch (err) {
        console.error('Failed to persist ADM directive:', err);
      }
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-background text-foreground relative">
      {/* Mobile/Tablet Viewport Segmented Bar (< 1024px) */}
      <div
        data-no-print="true"
        className="flex lg:hidden items-center justify-between px-4 py-2 border-b border-border bg-card sticky top-0 z-20"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Evaluation View
        </span>
        <Tabs value={activeMobileTab} onValueChange={setActiveMobileTab} className="space-y-0">
          <TabsList aria-label="Evaluation view" className="h-auto gap-1">
            <TabsTrigger
              value="pdf"
              onClick={() => setActiveMobileTab('pdf')}
              className="min-h-[44px] px-3 text-xs sm:min-h-9"
            >
              <FileText aria-hidden="true" className="size-3" />
              PDF
            </TabsTrigger>
            <TabsTrigger
              value="rubric"
              onClick={() => setActiveMobileTab('rubric')}
              className="min-h-[44px] px-3 text-xs sm:min-h-9"
            >
              <CheckSquare aria-hidden="true" className="size-3" />
              Panel
            </TabsTrigger>
            <TabsTrigger
              value="both"
              onClick={() => setActiveMobileTab('both')}
              className="min-h-[44px] px-3 text-xs sm:min-h-9"
            >
              Stack
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Grid: 55/45 desktop split, fluid stack on mobile/tablet */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[55%_45%] pb-20 print:hidden">
        {/* Left Pane (55%): PDF Viewer Workspace */}
        <section
          className={cn(
            'flex flex-col h-[65vh] lg:h-[calc(100vh-8rem)] border-b lg:border-b-0 lg:border-r border-border overflow-hidden',
            activeMobileTab === 'rubric'
              ? 'invisible absolute h-0 w-0 overflow-hidden lg:visible lg:relative lg:h-[calc(100vh-8rem)] lg:w-auto'
              : 'visible relative',
          )}
        >
          {/* Layer Filter Toolbar */}
          <div
            data-no-print="true"
            className="flex items-center justify-between px-3 py-2 bg-card border-b border-border text-xs shrink-0 flex-wrap gap-2"
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Layers:
              </span>
              <Tabs value={layerFilter} onValueChange={setLayerFilter} className="space-y-0">
                <TabsList
                  aria-label="Evaluation layers"
                  className="h-auto gap-0.5 bg-background text-[11px]"
                >
                  <TabsTrigger
                    value="all"
                    onClick={() => setLayerFilter('all')}
                    className="min-h-[44px] px-2 py-1 text-[11px] sm:min-h-9"
                  >
                    All ({highlights.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="comments"
                    onClick={() => setLayerFilter('comments')}
                    className="min-h-[44px] gap-1 px-2 py-1 text-[11px] sm:min-h-9"
                  >
                    <MessageSquare className="h-2.5 w-2.5" />
                    Comments
                  </TabsTrigger>
                  <TabsTrigger
                    value="plagiarism"
                    onClick={() => setLayerFilter('plagiarism')}
                    className="min-h-[44px] gap-1 px-2 py-1 text-[11px] sm:min-h-9"
                  >
                    <ShieldAlert className="h-2.5 w-2.5" />
                    Plagiarism
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex items-center gap-2">
              {/* Opacity Controls Popover */}
              <Popover open={showOpacityControls} onOpenChange={setShowOpacityControls}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowOpacityControls(true)}
                    className="min-h-[44px] gap-1 px-2 py-1 text-[11px] font-medium sm:min-h-0"
                    title="Adjust overlay opacity"
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                    <span>Opacity</span>
                  </Button>
                </PopoverTrigger>

                <PopoverContent align="end" className="w-60 space-y-3 p-3 text-xs">
                  <div className="flex items-center justify-between pb-1 border-b border-border text-[11px] font-semibold">
                    <span>Overlay Opacity</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Close opacity controls"
                      onClick={() => setShowOpacityControls(false)}
                      className="size-11 min-h-[44px] min-w-[44px] sm:size-8 sm:min-h-8 sm:min-w-8"
                    >
                      <X aria-hidden="true" className="size-3" />
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <Label
                        htmlFor="comments-opacity"
                        className="text-info-foreground font-medium"
                      >
                        Comments
                      </Label>
                      <span className="font-mono text-[10px]">{commentsOpacity}%</span>
                    </div>
                    <Slider
                      id="comments-opacity"
                      min={15}
                      max={100}
                      step={5}
                      value={commentsOpacity}
                      onChange={(e) => setCommentsOpacity(Number(e.target.value))}
                      aria-label="Comments overlay opacity"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <Label
                        htmlFor="plagiarism-opacity"
                        className="text-destructive-text font-medium"
                      >
                        Plagiarism
                      </Label>
                      <span className="font-mono text-[10px]">{plagiarismOpacity}%</span>
                    </div>
                    <Slider
                      id="plagiarism-opacity"
                      min={15}
                      max={100}
                      step={5}
                      value={plagiarismOpacity}
                      onChange={(e) => setPlagiarismOpacity(Number(e.target.value))}
                      aria-label="Plagiarism overlay opacity"
                    />
                  </div>
                </PopoverContent>
              </Popover>

              {/* Print Defense Binder Button */}
              <Button
                type="button"
                variant="outline"
                onClick={() => window.print()}
                className="min-h-[44px] gap-1 px-2 py-1 text-[11px] font-medium sm:min-h-0"
                title="Print Defense Binder Summary"
              >
                <Printer className="h-3 w-3" />
                <span className="hidden sm:inline">Print Binder</span>
              </Button>
            </div>
          </div>

          {/* Core Interactive PDF Canvas */}
          <div className="flex-1 relative overflow-hidden">
            <PdfViewerWorkspace
              pdfUrl={pdfUrl}
              highlights={highlights}
              plagiarismMatches={plagiarismMatches}
              onSelectionFinished={onSelectionFinished}
              onAddReply={onAddReply}
              onResolveComment={onResolveComment}
              onAddToAdm={handleAddToAdmDirective}
              layerFilter={layerFilter}
              commentsOpacity={commentsOpacity}
              plagiarismOpacity={plagiarismOpacity}
              userRole={userRole}
              canComment={canModerate}
            />
          </div>
        </section>

        {/* Right Pane (45%): Rubrics, ADM, Plagiarism Breakdown */}
        <Tabs
          value={activeRightTab}
          onValueChange={setActiveRightTab}
          className="flex flex-col space-y-0"
        >
          <section
            className={cn(
              'flex flex-col min-h-[50vh] lg:h-[calc(100vh-8rem)] overflow-hidden bg-muted/20',
              activeMobileTab === 'pdf'
                ? 'invisible absolute h-0 w-0 overflow-hidden lg:visible lg:relative lg:h-[calc(100vh-8rem)] lg:w-auto'
                : 'visible relative',
            )}
          >
            {/* Right Pane Tabs */}
            <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2 shrink-0">
              <TabsList aria-label="Evaluation panel" className="h-auto gap-1 bg-card p-0">
                <TabsTrigger
                  value="rubrics"
                  className="min-h-[44px] gap-1.5 px-3 text-xs sm:min-h-9"
                  type="button"
                  onClick={() => setActiveRightTab('rubrics')}
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  Rubric Scorecard
                </TabsTrigger>

                <TabsTrigger
                  value="adm"
                  className="min-h-[44px] gap-1.5 px-3 text-xs sm:min-h-9"
                  type="button"
                  onClick={() => setActiveRightTab('adm')}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Action Done Matrix
                  {localAdmItems.length > 0 && (
                    <Badge variant="info" className="ml-1 px-1.5 py-0 text-[10px]">
                      {localAdmItems.length}
                    </Badge>
                  )}
                </TabsTrigger>

                <TabsTrigger
                  value="sources"
                  className="min-h-[44px] gap-1.5 px-3 text-xs sm:min-h-9"
                  type="button"
                  onClick={() => setActiveRightTab('sources')}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Sources
                  {plagiarismSources.length > 0 && (
                    <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-[10px]">
                      {plagiarismSources.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Right Pane Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Rubrics Tab */}
              {activeRightTab === 'rubrics' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <CheckSquare className="h-4 w-4 text-primary" />
                      Committee Evaluation Rubric
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      75% passing threshold enforced
                    </span>
                  </div>

                  {rubrics.length === 0 ? (
                    <EmptyState
                      icon={CheckSquare}
                      title="No rubric criteria configured"
                      description="This defense round does not have any configured rubric criteria."
                      compact
                    />
                  ) : (
                    <div className="space-y-3">
                      {rubrics.map((criterion, cIdx) => (
                        <Card key={criterion.id || cIdx} className="rounded-xl">
                          <CardContent className="space-y-2 p-3.5">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-foreground">
                                {criterion.title || `Criterion ${cIdx + 1}`}
                              </span>
                              <span className="text-xs font-mono text-primary font-medium">
                                Weight: {criterion.weight || 20}%
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {criterion.description || 'Evaluation standard for this milestone.'}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ADM Tab */}
              {activeRightTab === 'adm' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <FileSpreadsheet className="h-4 w-4 text-primary" />
                      Action Done Matrix (ADM)
                    </h3>
                    <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                      Gated by Secretary Endorsement
                    </Badge>
                  </div>

                  {localAdmItems.length === 0 ? (
                    <EmptyState
                      icon={FileSpreadsheet}
                      title="No panel remarks logged"
                      description="Highlight passages on the PDF to add remarks to the Action Done Matrix."
                      compact
                    />
                  ) : (
                    <div className="space-y-2.5">
                      {localAdmItems.map((item, idx) => (
                        <Card key={item._id || idx} className="rounded-lg">
                          <CardContent className="space-y-1 p-3 text-xs">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-foreground">
                                {item.pageNumber
                                  ? `Page ${item.pageNumber}`
                                  : item.itemNumber
                                    ? `Item #${item.itemNumber}`
                                    : 'Page —'}{' '}
                                · {item.category || item.section || 'Remark'}
                              </span>
                              <Badge
                                variant="secondary"
                                className="shrink-0 text-[10px] capitalize"
                              >
                                {item.status || 'Pending'}
                              </Badge>
                            </div>
                            <p className="text-foreground/80 italic">
                              &ldquo;
                              {item.commentText ||
                                item.remarks ||
                                item.comment ||
                                item.panelRemarks ||
                                'Panel remark'}
                              &rdquo;
                            </p>
                            {item.actionTaken && (
                              <p className="text-[11px] text-muted-foreground pt-0.5">
                                <span className="font-semibold text-foreground/70">Action:</span>{' '}
                                {item.actionTaken}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Plagiarism Sources Tab */}
              {activeRightTab === 'sources' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 text-destructive-text" />
                      Plagiarism Matching Sources
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      Vector + Winnowing Corroboration
                    </span>
                  </div>

                  {plagiarismSources.length === 0 ? (
                    <EmptyState
                      icon={ShieldAlert}
                      title="No significant matches detected"
                      description="No significant plagiarism matches were detected in this manuscript."
                      compact
                    />
                  ) : (
                    <div className="space-y-2.5">
                      {plagiarismSources.map((source, sIdx) => (
                        <Card
                          key={source.id || sIdx}
                          className="rounded-xl border-destructive/20 bg-destructive/5"
                        >
                          <CardContent className="space-y-1.5 p-3.5 text-xs">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-foreground">
                                {source.title || 'Archived Paper'}
                              </span>
                              <Badge variant="destructive" className="shrink-0 font-mono">
                                {source.similarityScore || 0}%
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Authors:{' '}
                              {Array.isArray(source.authors)
                                ? source.authors.join(', ')
                                : 'Unknown'}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </Tabs>
      </main>

      {/* Persistent Bottom Verdict Bar */}
      <StickyVerdictBar
        submissionId={submission?._id}
        canSubmitVerdict={canModerate}
        onVerdict={onVerdict}
        isSubmitting={isVerdictSubmitting}
      />

      {/* Print-Only Evaluation & Defense Summary Appendix for Physical Binder */}
      <section
        data-print-only="true"
        className="hidden print:block p-8 space-y-6 bg-white text-black text-sm"
      >
        <div className="border-b-2 border-black pb-4 text-center space-y-1">
          <h1 className="text-xl font-bold tracking-tight uppercase">Bukidnon State University</h1>
          <h2 className="text-sm font-semibold tracking-wider uppercase text-neutral-700">
            College of Technologies · Capstone Management System
          </h2>
          <h3 className="text-base font-bold pt-2">
            Defense Manuscript Evaluation & Action Done Matrix (ADM) Appendix
          </h3>
          <p className="text-xs text-neutral-600">
            Official Hearing Record & Multi-Layer Annotation Audit
          </p>
        </div>

        {/* Manuscript & Defense Metadata */}
        <div className="grid grid-cols-2 gap-4 border border-neutral-300 p-4 rounded text-xs">
          <div>
            <p>
              <span className="font-bold">Project Title:</span>{' '}
              {submission?.title || submission?.projectId?.title || 'Academic Capstone Project'}
            </p>
            <p>
              <span className="font-bold">Team:</span>{' '}
              {submission?.teamId?.name || 'Assigned Capstone Team'}
            </p>
            <p>
              <span className="font-bold">Milestone / Stage:</span>{' '}
              {submission?.stage || submission?.milestone || 'Defense Manuscript'}
            </p>
          </div>
          <div>
            <p>
              <span className="font-bold">Evaluator Role:</span> {userRole?.toUpperCase()}
            </p>
            <p>
              <span className="font-bold">Date Generated:</span>{' '}
              {new Date().toLocaleDateString('en-PH', { dateStyle: 'long' })}
            </p>
            <p>
              <span className="font-bold">Total ADM Directives:</span> {localAdmItems.length}
            </p>
          </div>
        </div>

        {/* 1. Committee Comments & Annotations */}
        <div className="space-y-3 pt-2">
          <h4 className="font-bold text-sm uppercase tracking-wide border-b border-neutral-400 pb-1">
            1. Committee Margin Annotations & Directives
          </h4>
          {highlights.filter(
            (h) => h.type !== 'plagiarism_exact' && h.type !== 'plagiarism_semantic',
          ).length === 0 ? (
            <p className="text-xs italic text-neutral-600">No panelist comments recorded.</p>
          ) : (
            <table className="w-full text-left text-xs border border-neutral-300 border-collapse">
              <thead>
                <tr className="bg-neutral-100 border-b border-neutral-300">
                  <th className="p-2 border-r border-neutral-300 w-16">Page</th>
                  <th className="p-2 border-r border-neutral-300 w-28">Author / Role</th>
                  <th className="p-2 border-r border-neutral-300">Comment / Directive</th>
                  <th className="p-2 w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {highlights
                  .filter((h) => h.type !== 'plagiarism_exact' && h.type !== 'plagiarism_semantic')
                  .map((h, i) => (
                    <tr key={h.id || i} className="border-b border-neutral-200">
                      <td className="p-2 border-r border-neutral-200 font-mono">
                        P. {h.position?.pageNumber || 1}
                      </td>
                      <td className="p-2 border-r border-neutral-200 font-medium">
                        {h.authorName || 'Committee'} ({h.authorRole || 'Faculty'})
                      </td>
                      <td className="p-2 border-r border-neutral-200">
                        <p>{h.comment?.text || h.content?.text || 'Annotation'}</p>
                        {Array.isArray(h.replies) && h.replies.length > 0 && (
                          <div className="mt-1 pl-2 border-l border-neutral-300 text-[11px] text-neutral-600">
                            {h.replies.map((r, ri) => (
                              <p key={ri}>
                                ↳ <span className="font-semibold">{r.authorName}:</span> {r.text}
                              </p>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-2 uppercase text-[10px] font-semibold">
                        {h.status || 'Open'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 2. Action Done Matrix Directives */}
        <div className="space-y-3 pt-2">
          <h4 className="font-bold text-sm uppercase tracking-wide border-b border-neutral-400 pb-1">
            2. Action Done Matrix (ADM) Directives & Remediations
          </h4>
          {localAdmItems.length === 0 ? (
            <p className="text-xs italic text-neutral-600">No Action Done Matrix items logged.</p>
          ) : (
            <table className="w-full text-left text-xs border border-neutral-300 border-collapse">
              <thead>
                <tr className="bg-neutral-100 border-b border-neutral-300">
                  <th className="p-2 border-r border-neutral-300 w-12">#</th>
                  <th className="p-2 border-r border-neutral-300 w-16">Page</th>
                  <th className="p-2 border-r border-neutral-300">Panel Remark / Quoted Issue</th>
                  <th className="p-2 border-r border-neutral-300">Required Remediation</th>
                  <th className="p-2 w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {localAdmItems.map((item, idx) => (
                  <tr key={item._id || idx} className="border-b border-neutral-200">
                    <td className="p-2 border-r border-neutral-200 font-mono">{idx + 1}</td>
                    <td className="p-2 border-r border-neutral-200 font-mono">
                      {item.pageNumber ? `P. ${item.pageNumber}` : '—'}
                    </td>
                    <td className="p-2 border-r border-neutral-200 italic">
                      &ldquo;
                      {item.commentText || item.remarks || item.panelRemarks || 'Panel remark'}
                      &rdquo;
                    </td>
                    <td className="p-2 border-r border-neutral-200">
                      {item.expectedAction ||
                        item.actionTaken ||
                        item.suggestion ||
                        'Properly cite original work or rephrase.'}
                    </td>
                    <td className="p-2 uppercase text-[10px] font-semibold">
                      {item.status || 'Pending'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 3. Originality & Plagiarism Matches */}
        <div className="space-y-3 pt-2">
          <h4 className="font-bold text-sm uppercase tracking-wide border-b border-neutral-400 pb-1">
            3. Originality Corroboration & Matched Literature
          </h4>
          {plagiarismSources.length === 0 ? (
            <p className="text-xs italic text-neutral-600">
              No significant plagiarism matches detected.
            </p>
          ) : (
            <table className="w-full text-left text-xs border border-neutral-300 border-collapse">
              <thead>
                <tr className="bg-neutral-100 border-b border-neutral-300">
                  <th className="p-2 border-r border-neutral-300">Source Title / Reference</th>
                  <th className="p-2 border-r border-neutral-300 w-44">Authors</th>
                  <th className="p-2 w-24 text-right">Similarity</th>
                </tr>
              </thead>
              <tbody>
                {plagiarismSources.map((source, sIdx) => (
                  <tr key={source.id || sIdx} className="border-b border-neutral-200">
                    <td className="p-2 border-r border-neutral-200 font-medium">
                      {source.title || 'Archived Paper'}
                    </td>
                    <td className="p-2 border-r border-neutral-200 text-neutral-600">
                      {Array.isArray(source.authors) ? source.authors.join(', ') : 'Unknown'}
                    </td>
                    <td className="p-2 text-right font-mono font-bold">
                      {source.similarityScore || 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Committee Signature Line */}
        <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs">
          <div className="border-t border-black pt-2">
            <p className="font-bold">Panel Chair Signature</p>
            <p className="text-neutral-500">Date: _______________</p>
          </div>
          <div className="border-t border-black pt-2">
            <p className="font-bold">Adviser Signature</p>
            <p className="text-neutral-500">Date: _______________</p>
          </div>
          <div className="border-t border-black pt-2">
            <p className="font-bold">Secretary Compliance Seal</p>
            <p className="text-neutral-500">Date: _______________</p>
          </div>
        </div>
      </section>
    </div>
  );
}

EvaluationWorkspace.propTypes = {
  submission: PropTypes.object,
  pdfUrl: PropTypes.string.isRequired,
  highlights: PropTypes.arrayOf(PropTypes.object),
  rubrics: PropTypes.arrayOf(PropTypes.object),
  admItems: PropTypes.arrayOf(PropTypes.object),
  plagiarismSources: PropTypes.arrayOf(PropTypes.object),
  plagiarismMatches: PropTypes.arrayOf(PropTypes.object),
  onSelectionFinished: PropTypes.func,
  onAddReply: PropTypes.func,
  onResolveComment: PropTypes.func,
  onAddToAdm: PropTypes.func,
  onVerdict: PropTypes.func,
  userRole: PropTypes.string,
  canModerate: PropTypes.bool,
  isVerdictSubmitting: PropTypes.bool,
};

export default EvaluationWorkspace;
