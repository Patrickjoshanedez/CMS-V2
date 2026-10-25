import React, { useState, useMemo, useRef, useId } from 'react';
import PropTypes from 'prop-types';
import { diffWordsWithSpace, diffSentences, diffLines } from 'diff';
import {
  GitCommit,
  ArrowRight,
  PlusCircle,
  MinusCircle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Search,
  RotateCcw,
  CheckCircle2,
  Eye,
  EyeOff,
  X,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { Spinner } from '@/components/ui/Spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { format } from 'date-fns';

/**
 * Normalize whitespace in strings for reliable fuzzy matching with annotations.
 */
function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Find committee annotations matching a chunk of text.
 */
function findMatchingAnnotations(annotations = [], targetText = '', deletedText = '') {
  if (!Array.isArray(annotations) || annotations.length === 0) return [];
  const targetNorm = normalizeText(targetText);
  const deletedNorm = normalizeText(deletedText);

  return annotations.filter((ann) => {
    const selected = normalizeText(ann.selectedText || '');
    if (!selected) return false;

    // Check if annotation text overlaps with target or deleted text
    if (selected.length > 5) {
      if (
        (targetNorm && (targetNorm.includes(selected) || selected.includes(targetNorm))) ||
        (deletedNorm && (deletedNorm.includes(selected) || selected.includes(deletedNorm)))
      ) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Build paired diff chunks from raw diff output.
 * Pairs consecutive removed + added chunks into a 'replacement' item.
 */
function pairDiffChunks(rawDiff = [], allAnnotations = []) {
  const chunks = [];
  let i = 0;
  let revisionIndex = 0;

  while (i < rawDiff.length) {
    const curr = rawDiff[i];
    const next = rawDiff[i + 1];

    if (curr.removed && next && next.added) {
      // Replacement: old text was modified to new text
      const matchedComments = findMatchingAnnotations(allAnnotations, next.value, curr.value);
      revisionIndex += 1;
      chunks.push({
        id: `rev-${revisionIndex}`,
        type: 'replacement',
        added: true,
        removed: true,
        revNumber: revisionIndex,
        oldValue: curr.value,
        newValue: next.value,
        value: next.value,
        annotations: matchedComments,
      });
      i += 2;
    } else if (curr.added) {
      // Pure addition
      const matchedComments = findMatchingAnnotations(allAnnotations, curr.value, '');
      revisionIndex += 1;
      chunks.push({
        id: `rev-${revisionIndex}`,
        type: 'addition',
        added: true,
        removed: false,
        revNumber: revisionIndex,
        oldValue: null,
        newValue: curr.value,
        value: curr.value,
        annotations: matchedComments,
      });
      i += 1;
    } else if (curr.removed) {
      // Pure deletion
      const matchedComments = findMatchingAnnotations(allAnnotations, '', curr.value);
      revisionIndex += 1;
      chunks.push({
        id: `rev-${revisionIndex}`,
        type: 'deletion',
        added: false,
        removed: true,
        revNumber: revisionIndex,
        oldValue: curr.value,
        newValue: null,
        value: curr.value,
        annotations: matchedComments,
      });
      i += 1;
    } else {
      // Unchanged text
      chunks.push({
        id: `unchanged-${i}`,
        type: 'unchanged',
        added: false,
        removed: false,
        value: curr.value,
        annotations: [],
      });
      i += 1;
    }
  }

  return chunks;
}

export default function RevisionDiffViewer({
  diffData,
  isLoading,
  error,
  onSelectCompareVersion,
  onRefresh,
}) {
  const [granularity, setGranularity] = useState('words'); // 'words' | 'sentences' | 'lines'
  const [activePopover, setActivePopover] = useState(null); // chunk object
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeletionMarkers, setShowDeletionMarkers] = useState(true);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'revisions' | 'comments'
  const [currentRevIndex, setCurrentRevIndex] = useState(0);
  const controlsId = useId();

  const containerRef = useRef(null);
  const revisionRefs = useRef({});

  const current = diffData?.current;
  const previous = diffData?.previous;
  const availableVersions = diffData?.availableVersions || [];

  // Combine annotations from previous and current versions
  const combinedAnnotations = useMemo(() => {
    const prevAnns = previous?.annotations || [];
    const currAnns = current?.annotations || [];
    return [...prevAnns, ...currAnns];
  }, [previous, current]);

  // Compute diff chunks based on selected granularity
  const rawDiff = useMemo(() => {
    const oldText = previous?.extractedText || '';
    const newText = current?.extractedText || '';

    if (!oldText && !newText) return [];

    try {
      if (granularity === 'sentences') {
        return diffSentences(oldText, newText);
      }
      if (granularity === 'lines') {
        return diffLines(oldText, newText);
      }
      return diffWordsWithSpace(oldText, newText);
    } catch (err) {
      console.error('[RevisionDiffViewer] Diff computation failed:', err);
      return [];
    }
  }, [previous?.extractedText, current?.extractedText, granularity]);

  // Process raw diff into paired chunks with comment associations
  const pairedChunks = useMemo(() => {
    return pairDiffChunks(rawDiff, combinedAnnotations);
  }, [rawDiff, combinedAnnotations]);

  // Extract all revision chunks for navigation and statistics
  const revisionList = useMemo(() => {
    return pairedChunks.filter((chunk) => chunk.type !== 'unchanged');
  }, [pairedChunks]);

  // Compute statistics
  const stats = useMemo(() => {
    let wordsAdded = 0;
    let wordsRemoved = 0;
    let totalComments = 0;

    pairedChunks.forEach((chunk) => {
      if (chunk.type === 'addition') {
        wordsAdded += (chunk.newValue?.match(/\S+/g) || []).length;
      } else if (chunk.type === 'deletion') {
        wordsRemoved += (chunk.oldValue?.match(/\S+/g) || []).length;
      } else if (chunk.type === 'replacement') {
        wordsAdded += (chunk.newValue?.match(/\S+/g) || []).length;
      }
      if (chunk.annotations?.length > 0) {
        totalComments += chunk.annotations.length;
      }
    });

    return {
      revisionsCount: revisionList.length,
      wordsAdded,
      wordsRemoved,
      totalComments,
    };
  }, [pairedChunks, revisionList]);

  // Filtered chunks based on search and filters
  const filteredChunks = useMemo(() => {
    if (!searchQuery && filterMode === 'all') return pairedChunks;

    const query = searchQuery.toLowerCase().trim();

    return pairedChunks.map((chunk) => {
      if (chunk.type === 'unchanged') return chunk;

      let matchesFilter = true;
      if (filterMode === 'comments') {
        matchesFilter = (chunk.annotations?.length || 0) > 0;
      } else if (filterMode === 'revisions') {
        matchesFilter = chunk.type !== 'unchanged';
      }

      let matchesSearch = true;
      if (query) {
        const textToSearch = `${chunk.newValue || ''} ${chunk.oldValue || ''}`;
        matchesSearch = textToSearch.toLowerCase().includes(query);
      }

      return {
        ...chunk,
        isHidden: !(matchesFilter && matchesSearch),
      };
    });
  }, [pairedChunks, searchQuery, filterMode]);

  // Scroll to active revision
  const scrollToRevision = (index) => {
    if (index < 0 || index >= revisionList.length) return;
    setCurrentRevIndex(index);
    const targetChunk = revisionList[index];
    if (targetChunk) {
      setActivePopover(targetChunk);
      const el = revisionRefs.current[targetChunk.id];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleNextRevision = () => {
    if (revisionList.length === 0) return;
    const nextIdx = (currentRevIndex + 1) % revisionList.length;
    scrollToRevision(nextIdx);
  };

  const handlePrevRevision = () => {
    if (revisionList.length === 0) return;
    const prevIdx = (currentRevIndex - 1 + revisionList.length) % revisionList.length;
    scrollToRevision(prevIdx);
  };

  if (isLoading) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-3 p-12 text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <Spinner className="size-8 text-primary" />
        <p className="text-sm font-medium">
          Extracting manuscript text and calculating revision diff...
        </p>
        <span className="text-xs text-muted-foreground/70">
          Comparing word-level changes across versions
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full gap-3 text-center">
        <Alert variant="destructive" className="max-w-md text-left">
          <AlertTitle>Failed to Load Revision Diff</AlertTitle>
          <AlertDescription>
            {error.message || 'Unable to retrieve document revision data. Please try again.'}
          </AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={onRefresh} className="text-xs gap-1.5 mt-2">
          <RotateCcw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  if (!previous) {
    return (
      <div className="flex flex-col items-center justify-center p-12 h-full text-center max-w-md mx-auto gap-4">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          <GitCommit className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">
            Initial Submission (v{current?.version || 1})
          </h3>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            This is the team&apos;s first uploaded version for this manuscript. Revision diffing
            tracks changes, additions, deletions, and committee comment resolutions when a revised
            version (v2+) is uploaded.
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-left w-full text-xs space-y-1.5 text-muted-foreground">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>How Revision Diffing Works in CMS-V2:</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            1. Proponents upload revised files (v2, v3) based on panel & adviser defense remarks.
          </p>
          <p className="text-[11px] leading-relaxed">
            2. The system compares the new file against the previous version like Git code diffing
            (+ / -).
          </p>
          <p className="text-[11px] leading-relaxed">
            3. Clicking any highlighted revised passage reveals the original deleted text and
            anchored panel comments.
          </p>
        </div>
      </div>
    );
  }

  if (!current?.extractedText && !previous?.extractedText) {
    return (
      <EmptyState
        icon={FileText}
        title="No Extractable Text Found"
        description="The document text could not be automatically extracted for diffing. Please make sure the uploaded document contains selectable text (DOCX or searchable PDF)."
        compact
        className="mx-auto max-w-md"
      />
    );
  }

  return (
    <div
      className="flex h-full min-h-0 min-w-0 flex-col bg-background select-text"
      ref={containerRef}
    >
      {/* ── Top Bar: Comparison Metadata & Granularity Selector ── */}
      <div className="shrink-0 border-b border-border/60 bg-muted/20 px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 [&_button]:min-h-[44px] [&_button]:min-w-[44px] sm:[&_button]:min-h-0 sm:[&_button]:min-w-0">
        {/* Left: Versions & Comparison Selector */}
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 text-xs">
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 py-1 text-xs">
            <span className="text-muted-foreground font-medium">Comparing:</span>
            <span className="font-semibold text-foreground">v{current?.version}</span>
            <span className="min-w-0 max-w-full break-all text-[10px] text-muted-foreground">
              ({current?.fileName})
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Select
              value={previous?.id || undefined}
              onValueChange={(versionId) => onSelectCompareVersion?.(versionId)}
            >
              <SelectTrigger
                aria-label="Select previous version to compare with"
                className="h-9 min-h-9 w-auto min-w-0 max-w-[min(14rem,45vw)] border-0 bg-transparent px-1 text-xs font-semibold text-primary shadow-none"
              >
                <SelectValue className="truncate" />
              </SelectTrigger>
              <SelectContent className="max-w-[calc(100vw-2rem)]">
                {availableVersions.map((version) => (
                  <SelectItem key={version.id} value={version.id}>
                    v{version.version} — {version.fileName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Granularity Toggle */}
          <RadioGroup
            value={granularity}
            onValueChange={setGranularity}
            className="inline-flex min-w-0 flex-wrap items-center rounded-lg border border-border/60 bg-background/80 p-0.5 text-[11px]"
            aria-label="Diff granularity"
          >
            {[
              ['words', 'Word Diff'],
              ['sentences', 'Sentence Diff'],
              ['lines', 'Line Diff'],
            ].map(([value, label]) => (
              <label
                key={value}
                htmlFor={`${controlsId}-granularity-${value}`}
                className={`cursor-pointer rounded-md px-2 py-1 font-medium transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${
                  granularity === value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <RadioGroupItem
                  id={`${controlsId}-granularity-${value}`}
                  value={value}
                  aria-label={label}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </RadioGroup>
        </div>

        {/* Right: Stats Badges & Navigation */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
            <Badge variant="success" className="gap-1 rounded-full font-semibold">
              <PlusCircle className="h-3 w-3" aria-hidden="true" />+{stats.wordsAdded} words
            </Badge>
            <Badge variant="destructive" className="gap-1 rounded-full font-semibold">
              <MinusCircle className="h-3 w-3" aria-hidden="true" />−{stats.wordsRemoved} words
            </Badge>
            {stats.totalComments > 0 && (
              <Badge variant="info" className="gap-1 rounded-full font-semibold">
                <MessageSquare className="h-3 w-3" aria-hidden="true" />
                {stats.totalComments} comments
              </Badge>
            )}
          </div>

          {/* Revision Jump Arrows */}
          {revisionList.length > 0 && (
            <div className="flex items-center gap-1 border-l border-border/60 pl-2">
              <span className="text-[11px] font-mono text-muted-foreground hidden xs:inline">
                {currentRevIndex + 1}/{revisionList.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevRevision}
                className="h-7 w-7 p-0 border-border/60"
                title="Previous change"
                aria-label="Previous change"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextRevision}
                className="h-7 w-7 p-0 border-border/60"
                title="Next change"
                aria-label="Next change"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Sub-header: Search & Quick Filters ── */}
      <div className="shrink-0 border-b border-border/40 bg-muted/10 px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs [&_button]:min-h-[44px] [&_button]:min-w-[44px] sm:[&_button]:min-h-0 sm:[&_button]:min-w-0">
        <div className="flex min-w-0 items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search in revisions..."
              aria-label="Search in revisions"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-h-[44px] h-10 w-full rounded-md border-border/60 bg-background py-1 pl-8 pr-8 text-xs sm:min-h-0 sm:h-8"
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery('')}
                className="absolute right-1 top-1/2 size-7 min-h-7 min-w-7 -translate-y-1/2 p-0 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle show/hide deletion tags */}
          <Button
            type="button"
            variant={showDeletionMarkers ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowDeletionMarkers((prev) => !prev)}
            className="h-8 gap-1 px-2 text-[11px]"
            title="Toggle inline deletion markers"
            aria-pressed={showDeletionMarkers}
          >
            {showDeletionMarkers ? (
              <Eye className="h-3 w-3 text-primary" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">Deletion markers</span>
          </Button>

          {/* Filter Mode */}
          <RadioGroup
            value={filterMode}
            onValueChange={setFilterMode}
            className="inline-flex min-w-0 items-center rounded-md border border-border/50 bg-background p-0.5 text-[11px]"
            aria-label="Revision content filter"
          >
            {[
              ['all', 'All Text'],
              ['comments', 'With Comments'],
            ].map(([value, label]) => (
              <label
                key={value}
                htmlFor={`${controlsId}-filter-${value}`}
                className={`flex min-h-8 cursor-pointer items-center gap-1 rounded px-2 py-0.5 font-medium transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${
                  filterMode === value
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <RadioGroupItem
                  id={`${controlsId}-filter-${value}`}
                  value={value}
                  aria-label={label}
                  className="sr-only"
                />
                {value === 'comments' && (
                  <MessageSquare className="h-3 w-3 text-info" aria-hidden="true" />
                )}
                {label}
              </label>
            ))}
          </RadioGroup>
        </div>
      </div>

      {/* ── Main Document Reading Surface ── */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 p-4 font-sans text-sm leading-relaxed overscroll-contain sm:p-6 lg:p-8">
        <Card className="mx-auto min-h-[600px] max-w-4xl whitespace-pre-wrap rounded-xl border-border/70 bg-card p-6 font-serif text-[15px] leading-[1.85] text-card-foreground shadow-sm content-visibility-section sm:p-10 sm:text-base">
          {filteredChunks.map((chunk) => {
            if (chunk.isHidden) return null;

            if (chunk.type === 'unchanged') {
              return <span key={chunk.id}>{chunk.value}</span>;
            }

            const hasComments = (chunk.annotations?.length || 0) > 0;
            const isSelected = activePopover?.id === chunk.id;

            if (chunk.type === 'deletion') {
              if (!showDeletionMarkers) return null;
              return (
                <span
                  key={chunk.id}
                  ref={(el) => {
                    revisionRefs.current[chunk.id] = el;
                  }}
                  onClick={() => setActivePopover(chunk)}
                  className={`inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded text-[11px] font-sans font-medium cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-destructive/20 text-destructive border-destructive ring-2 ring-destructive/30'
                      : 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/15'
                  }`}
                  title="Click to reveal deleted text"
                >
                  <MinusCircle className="h-3 w-3 text-destructive" />
                  <span>Deleted</span>
                  {hasComments && <MessageSquare className="h-2.5 w-2.5 fill-info text-info" />}
                </span>
              );
            }

            // Replacement or Addition
            const isReplacement = chunk.type === 'replacement';

            return (
              <span
                key={chunk.id}
                ref={(el) => {
                  revisionRefs.current[chunk.id] = el;
                }}
                onClick={() => setActivePopover(chunk)}
                className={`inline rounded-sm px-1 py-0.5 cursor-pointer transition-all duration-150 border-b-2 ${
                  isReplacement
                    ? isSelected
                      ? 'bg-success/20 text-success-foreground border-success ring-2 ring-success/40 shadow-sm'
                      : 'bg-success/10 hover:bg-success/15 text-success-foreground border-success/60'
                    : isSelected
                      ? 'bg-success/20 text-success-foreground border-success ring-2 ring-success/40 shadow-sm'
                      : 'bg-success/10 hover:bg-success/15 text-success-foreground border-success/60'
                }`}
                title={
                  isReplacement
                    ? 'Revised text. Click to reveal original text and panel comments.'
                    : 'Added text. Click for revision details.'
                }
              >
                {chunk.value}
                {hasComments && (
                  <Badge
                    variant="info"
                    className="mx-1 inline-flex h-4 items-center gap-0.5 rounded-full px-1 py-0 font-sans text-[10px] align-middle"
                  >
                    <MessageSquare className="h-2.5 w-2.5 fill-info text-info" aria-hidden="true" />
                    <span>{chunk.annotations.length}</span>
                  </Badge>
                )}
              </span>
            );
          })}
        </Card>
      </div>

      {/* ── Click-to-Reveal Popover Modal / Inspection Drawer ── */}
      {activePopover && (
        <div
          role="dialog"
          aria-label="Revision Details"
          className="shrink-0 border-t border-border/80 bg-card shadow-2xl p-4 sm:p-5 max-h-[350px] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200 transition-all border-t-2 border-t-primary/30"
        >
          <div className="max-w-4xl mx-auto space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
              <div className="flex items-center gap-2">
                <Badge
                  variant={activePopover.type === 'deletion' ? 'destructive' : 'success'}
                  className={`text-xs px-2 py-0.5 font-sans font-semibold ${
                    activePopover.type === 'replacement'
                      ? 'bg-success/10 text-success-foreground border-success/30'
                      : activePopover.type === 'deletion'
                        ? ''
                        : 'bg-success/10 text-success-foreground border-success/30'
                  }`}
                >
                  {activePopover.type === 'replacement'
                    ? 'Revised Replacement (v1 → v2)'
                    : activePopover.type === 'deletion'
                      ? 'Removed Passage (-)'
                      : 'New Addition (+)'}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  Revision #{activePopover.revNumber} of {revisionList.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevRevision}
                  className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                >
                  <ChevronUp className="h-3.5 w-3.5 mr-1" />
                  Prev
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextRevision}
                  className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                >
                  Next
                  <ChevronDown className="h-3.5 w-3.5 ml-1" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActivePopover(null)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  aria-label="Close revision details"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Old text if removed or replaced */}
              {(activePopover.oldValue || activePopover.type === 'deletion') && (
                <div className="space-y-1.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-destructive">
                    <span className="flex items-center gap-1">
                      <MinusCircle className="h-3.5 w-3.5" />
                      Original Text (v{previous?.version || '1'})
                    </span>
                    <span className="font-mono text-[10px] text-destructive/80">
                      Deleted / Replaced
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap font-serif text-xs leading-relaxed text-destructive line-through sm:text-sm">
                    {activePopover.oldValue}
                  </p>
                </div>
              )}

              {/* New text if added or replaced */}
              {(activePopover.newValue || activePopover.type === 'addition') && (
                <div
                  className={`space-y-1.5 rounded-lg border border-success/30 bg-success/5 p-3 ${
                    !activePopover.oldValue ? 'md:col-span-2' : ''
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold text-success-foreground">
                    <span className="flex items-center gap-1">
                      <PlusCircle className="h-3.5 w-3.5" />
                      Current Revised Text (v{current?.version || '2'})
                    </span>
                    <span className="font-mono text-[10px] text-success-foreground/80">
                      Active Version
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap font-serif text-xs font-medium leading-relaxed text-success-foreground sm:text-sm">
                    {activePopover.newValue}
                  </p>
                </div>
              )}
            </div>

            {/* Anchored Committee Comments */}
            {activePopover.annotations?.length > 0 && (
              <div className="space-y-2.5 rounded-lg border border-info/30 bg-info/5 p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-info">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>
                    Committee Review Remarks Anchored to this Section (
                    {activePopover.annotations.length})
                  </span>
                </div>

                <div className="space-y-2">
                  {activePopover.annotations.map((ann, idx) => {
                    const author = ann.userId || {};
                    const authorName =
                      [author.firstName, author.lastName].filter(Boolean).join(' ') ||
                      author.email ||
                      'Committee Member';
                    const roleLabel = author.role ? author.role.toUpperCase() : 'FACULTY';

                    return (
                      <div
                        key={ann._id || idx}
                        className="rounded-md border border-border/60 bg-background/80 p-2.5 text-xs space-y-1.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{authorName}</span>
                            <Badge
                              variant="secondary"
                              className="text-[9px] px-1 py-0 h-4 uppercase"
                            >
                              {roleLabel}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            {ann.resolved ? (
                              <span className="inline-flex items-center gap-0.5 font-semibold text-success">
                                <CheckCircle2 className="h-3 w-3" />
                                Resolved
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 font-semibold text-warning">
                                <Clock className="h-3 w-3" />
                                Open
                              </span>
                            )}
                            {ann.createdAt && (
                              <span>{format(new Date(ann.createdAt), 'MMM d, yyyy')}</span>
                            )}
                          </div>
                        </div>

                        <p className="text-foreground leading-relaxed pl-2 border-l-2 border-primary/30">
                          {ann.content}
                        </p>

                        {/* Threaded Replies */}
                        {ann.replies?.length > 0 && (
                          <div className="pl-3 mt-1.5 pt-1.5 border-t border-border/40 space-y-1">
                            {ann.replies.map((reply, rIdx) => (
                              <div
                                key={reply._id || rIdx}
                                className="text-[11px] text-muted-foreground flex gap-1.5"
                              >
                                <span className="font-medium text-foreground">
                                  {[reply.userId?.firstName, reply.userId?.lastName]
                                    .filter(Boolean)
                                    .join(' ') || 'Reply'}
                                  :
                                </span>
                                <span>{reply.content}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

RevisionDiffViewer.propTypes = {
  diffData: PropTypes.shape({
    current: PropTypes.object,
    previous: PropTypes.object,
    availableVersions: PropTypes.array,
  }),
  isLoading: PropTypes.bool,
  error: PropTypes.object,
  onSelectCompareVersion: PropTypes.func,
  onRefresh: PropTypes.func,
};
