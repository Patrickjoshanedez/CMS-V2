import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  AlertCircle,
  Eye,
  EyeOff,
  Filter,
  X,
  FileText,
  Clock,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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
      <div className="flex flex-col items-center justify-center p-12 h-full gap-3 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
        <AlertCircle className="h-10 w-10 text-destructive/80" />
        <h4 className="text-base font-semibold text-foreground">Failed to Load Revision Diff</h4>
        <p className="text-xs text-muted-foreground max-w-md">
          {error.message || 'Unable to retrieve document revision data. Please try again.'}
        </p>
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
      <div className="flex flex-col items-center justify-center p-8 h-full text-center max-w-md mx-auto gap-3">
        <FileText className="h-10 w-10 text-muted-foreground/60" />
        <h4 className="text-sm font-semibold text-foreground">No Extractable Text Found</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The document text could not be automatically extracted for diffing. Please make sure the
          uploaded document contains selectable text (DOCX or searchable PDF).
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background select-text" ref={containerRef}>
      {/* ── Top Bar: Comparison Metadata & Granularity Selector ── */}
      <div className="shrink-0 border-b border-border/60 bg-muted/20 px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Versions & Comparison Selector */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 py-1 text-xs">
            <span className="text-muted-foreground font-medium">Comparing:</span>
            <span className="font-semibold text-foreground">v{current?.version}</span>
            <span className="text-[10px] text-muted-foreground">({current?.fileName})</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <select
              value={previous?.id || ''}
              onChange={(e) => onSelectCompareVersion?.(e.target.value)}
              className="bg-transparent font-semibold text-primary cursor-pointer focus:outline-none border-b border-primary/40 hover:border-primary pb-0.5 text-xs"
              aria-label="Select previous version to compare with"
            >
              {availableVersions.map((v) => (
                <option key={v.id} value={v.id} className="bg-popover text-popover-foreground">
                  v{v.version} — {v.fileName}
                </option>
              ))}
            </select>
          </div>

          {/* Granularity Toggle */}
          <div className="hidden md:flex items-center rounded-lg border border-border/60 bg-background/80 p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setGranularity('words')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                granularity === 'words'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Word Diff
            </button>
            <button
              type="button"
              onClick={() => setGranularity('sentences')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                granularity === 'sentences'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sentence Diff
            </button>
            <button
              type="button"
              onClick={() => setGranularity('lines')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                granularity === 'lines'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Line Diff
            </button>
          </div>
        </div>

        {/* Right: Stats Badges & Navigation */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20">
              <PlusCircle className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />+
              {stats.wordsAdded} words
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold border border-rose-500/20">
              <MinusCircle className="h-3 w-3 text-rose-600 dark:text-rose-400" />-
              {stats.wordsRemoved} words
            </span>
            {stats.totalComments > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold border border-blue-500/20">
                <MessageSquare className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                {stats.totalComments} comments
              </span>
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
      <div className="shrink-0 border-b border-border/40 bg-muted/10 px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search in revisions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-7 py-1 text-xs rounded-md border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle show/hide deletion tags */}
          <button
            type="button"
            onClick={() => setShowDeletionMarkers((prev) => !prev)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded border border-border/40"
            title="Toggle inline deletion markers"
          >
            {showDeletionMarkers ? (
              <Eye className="h-3 w-3 text-primary" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">Deletion markers</span>
          </button>

          {/* Filter Mode */}
          <div className="flex items-center rounded-md border border-border/50 bg-background text-[11px] p-0.5">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                filterMode === 'all' ? 'bg-muted text-foreground' : 'text-muted-foreground'
              }`}
            >
              All Text
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('comments')}
              className={`px-2 py-0.5 rounded font-medium transition-colors flex items-center gap-1 ${
                filterMode === 'comments' ? 'bg-muted text-foreground' : 'text-muted-foreground'
              }`}
            >
              <MessageSquare className="h-2.5 w-2.5 text-blue-500" />
              With Comments
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Document Reading Surface ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 font-sans leading-relaxed text-sm bg-[#fafafa] dark:bg-neutral-900 overscroll-contain">
        <div className="max-w-4xl mx-auto bg-card text-card-foreground p-6 sm:p-10 rounded-xl shadow-sm border border-border/70 min-h-[600px] whitespace-pre-wrap font-serif text-[15px] sm:text-[16px] leading-[1.85]">
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
                      ? 'bg-rose-500/25 text-rose-950 dark:text-rose-200 border-rose-500 ring-2 ring-rose-500/30'
                      : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                  }`}
                  title="Click to reveal deleted text"
                >
                  <MinusCircle className="h-3 w-3 text-rose-500" />
                  <span>Deleted</span>
                  {hasComments && (
                    <MessageSquare className="h-2.5 w-2.5 text-blue-500 fill-blue-500" />
                  )}
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
                      ? 'bg-emerald-500/30 text-emerald-950 dark:text-emerald-100 border-emerald-600 ring-2 ring-emerald-500/40 shadow-sm'
                      : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-950 dark:text-emerald-200 border-emerald-500/60'
                    : isSelected
                      ? 'bg-emerald-500/30 text-emerald-950 dark:text-emerald-100 border-emerald-600 ring-2 ring-emerald-500/40 shadow-sm'
                      : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-950 dark:text-emerald-200 border-emerald-500/60'
                }`}
                title={
                  isReplacement
                    ? 'Revised text. Click to reveal original text and panel comments.'
                    : 'Added text. Click for revision details.'
                }
              >
                {chunk.value}
                {hasComments && (
                  <span className="inline-flex items-center gap-0.5 align-middle mx-1 px-1 py-0.2 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-sans font-semibold border border-blue-500/30">
                    <MessageSquare className="h-2.5 w-2.5 fill-blue-500 text-blue-500" />
                    <span>{chunk.annotations.length}</span>
                  </span>
                )}
              </span>
            );
          })}
        </div>
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
                  variant="outline"
                  className={`text-xs px-2 py-0.5 font-sans font-semibold ${
                    activePopover.type === 'replacement'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                      : activePopover.type === 'deletion'
                        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                        : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
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
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-rose-700 dark:text-rose-300 font-semibold">
                    <span className="flex items-center gap-1">
                      <MinusCircle className="h-3.5 w-3.5" />
                      Original Text (v{previous?.version || '1'})
                    </span>
                    <span className="text-[10px] text-rose-600/70 font-mono">
                      Deleted / Replaced
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-rose-950 dark:text-rose-200 line-through leading-relaxed whitespace-pre-wrap font-serif">
                    {activePopover.oldValue}
                  </p>
                </div>
              )}

              {/* New text if added or replaced */}
              {(activePopover.newValue || activePopover.type === 'addition') && (
                <div
                  className={`rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1.5 ${
                    !activePopover.oldValue ? 'md:col-span-2' : ''
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
                    <span className="flex items-center gap-1">
                      <PlusCircle className="h-3.5 w-3.5" />
                      Current Revised Text (v{current?.version || '2'})
                    </span>
                    <span className="text-[10px] text-emerald-600/70 font-mono">
                      Active Version
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-emerald-950 dark:text-emerald-200 font-medium leading-relaxed whitespace-pre-wrap font-serif">
                    {activePopover.newValue}
                  </p>
                </div>
              )}
            </div>

            {/* Anchored Committee Comments */}
            {activePopover.annotations?.length > 0 && (
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
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
                              <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                                <CheckCircle2 className="h-3 w-3" />
                                Resolved
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-semibold">
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
