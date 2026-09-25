import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Layers,
  Loader2,
  RefreshCcw,
  X,
  Eye,
  ShieldCheck,
  ClipboardCheck,
  BookOpen,
  Printer,
  Search,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PageSkeleton from '@/components/ui/PageSkeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import SophisticatedDocumentViewer from '@/components/documents/SophisticatedDocumentViewer';
import {
  usePlagiarismReport,
  useSubmission,
  useScanSubmissionArchive,
} from '../../hooks/useSubmissions';

/* ──────────────────────────────────────────────────────────────
   Color palette for source highlighting (Turnitin-style bands)
   Uses translucent RGBA so marks render beautifully in light & dark modes
   ────────────────────────────────────────────────────────────── */
const SOURCE_PALETTE = [
  {
    badgeStyle: {
      background: 'rgba(239, 68, 68, 0.15)',
      color: '#ef4444',
      border: '1px solid rgba(239, 68, 68, 0.35)',
    },
    dot: '#ef4444',
    mark: { background: 'rgba(239, 68, 68, 0.22)', outline: '1px solid rgba(239, 68, 68, 0.45)' },
  },
  {
    badgeStyle: {
      background: 'rgba(249, 115, 22, 0.15)',
      color: '#f97316',
      border: '1px solid rgba(249, 115, 22, 0.35)',
    },
    dot: '#f97316',
    mark: { background: 'rgba(249, 115, 22, 0.22)', outline: '1px solid rgba(249, 115, 22, 0.45)' },
  },
  {
    badgeStyle: {
      background: 'rgba(234, 179, 8, 0.15)',
      color: '#ca8a04',
      border: '1px solid rgba(234, 179, 8, 0.35)',
    },
    dot: '#ca8a04',
    mark: { background: 'rgba(234, 179, 8, 0.22)', outline: '1px solid rgba(234, 179, 8, 0.45)' },
  },
  {
    badgeStyle: {
      background: 'rgba(16, 185, 129, 0.15)',
      color: '#10b981',
      border: '1px solid rgba(16, 185, 129, 0.35)',
    },
    dot: '#10b981',
    mark: { background: 'rgba(16, 185, 129, 0.22)', outline: '1px solid rgba(16, 185, 129, 0.45)' },
  },
  {
    badgeStyle: {
      background: 'rgba(59, 130, 246, 0.15)',
      color: '#3b82f6',
      border: '1px solid rgba(59, 130, 246, 0.35)',
    },
    dot: '#3b82f6',
    mark: { background: 'rgba(59, 130, 246, 0.22)', outline: '1px solid rgba(59, 130, 246, 0.45)' },
  },
  {
    badgeStyle: {
      background: 'rgba(168, 85, 247, 0.15)',
      color: '#a855f7',
      border: '1px solid rgba(168, 85, 247, 0.35)',
    },
    dot: '#a855f7',
    mark: { background: 'rgba(168, 85, 247, 0.22)', outline: '1px solid rgba(168, 85, 247, 0.45)' },
  },
  {
    badgeStyle: {
      background: 'rgba(20, 184, 166, 0.15)',
      color: '#14b8a6',
      border: '1px solid rgba(20, 184, 166, 0.35)',
    },
    dot: '#14b8a6',
    mark: { background: 'rgba(20, 184, 166, 0.22)', outline: '1px solid rgba(20, 184, 166, 0.45)' },
  },
  {
    badgeStyle: {
      background: 'rgba(236, 72, 153, 0.15)',
      color: '#ec4899',
      border: '1px solid rgba(236, 72, 153, 0.35)',
    },
    dot: '#ec4899',
    mark: { background: 'rgba(236, 72, 153, 0.22)', outline: '1px solid rgba(236, 72, 153, 0.45)' },
  },
  {
    badgeStyle: {
      background: 'rgba(34, 197, 94, 0.15)',
      color: '#22c55e',
      border: '1px solid rgba(34, 197, 94, 0.35)',
    },
    dot: '#22c55e',
    mark: { background: 'rgba(34, 197, 94, 0.22)', outline: '1px solid rgba(34, 197, 94, 0.45)' },
  },
  {
    badgeStyle: {
      background: 'rgba(244, 63, 94, 0.15)',
      color: '#f43f5e',
      border: '1px solid rgba(244, 63, 94, 0.35)',
    },
    dot: '#f43f5e',
    mark: { background: 'rgba(244, 63, 94, 0.22)', outline: '1px solid rgba(244, 63, 94, 0.45)' },
  },
];

/* ── Score-gradient highlight system ──────────────────────────────────
   Modulates highlight intensity based on individual block similarity score.
   Keeps source hue (from palette.dot) but varies opacity by score severity.
   ──────────────────────────────────────────────────────────────────── */
function hexToRgba(hex, alpha) {
  const clean = (hex || '#888888').replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

function getScoreHighlightStyle(paletteDot, similarityPercent) {
  // Map 0–100% similarity to opacity band: 0.10 (low) → 0.60 (critical)
  const score = Math.max(0, Math.min(100, similarityPercent)) / 100;
  const bgAlpha = 0.1 + score * 0.5; // 0.10 at 0%, 0.60 at 100%
  const borderAlpha = 0.3 + score * 0.55; // 0.30 → 0.85
  const borderWidth = score >= 0.9 ? '3px' : score >= 0.7 ? '2px' : '1px';
  return {
    background: hexToRgba(paletteDot, bgAlpha),
    outline: `1px solid ${hexToRgba(paletteDot, borderAlpha * 0.5)}`,
    borderBottom: `${borderWidth} solid ${hexToRgba(paletteDot, borderAlpha)}`,
  };
}

/* Derive paraphrase/verbatim/mixed signal from winnow + semantic scores */
function deriveContextSignal(winnowScore, semanticScore) {
  const w = Number(winnowScore ?? 0);
  const s = Number(semanticScore ?? 0);
  if (s >= 0.7 && w < 0.3) return 'paraphrase';
  if (w >= 0.8) return 'verbatim';
  return 'mixed';
}

/* ── Helpers ──────────────────────────────────────────────── */

const clampPercent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(100, numeric));
};

const toSimilarityPercent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric > 1 ? clampPercent(numeric) : clampPercent(numeric * 100);
};

const toSourceId = (match, fallbackIndex) => {
  const metadata =
    match?.source_metadata && typeof match.source_metadata === 'object'
      ? match.source_metadata
      : {};

  const candidate =
    match?.sourceId ||
    match?.submissionId ||
    match?.id ||
    metadata?.document_id ||
    metadata?.title ||
    match?.sourceTitle ||
    match?.projectTitle ||
    match?.title;

  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  if (Number.isFinite(candidate)) return String(candidate);
  return `source-${fallbackIndex}`;
};

const toSourceTitle = (match) => {
  const metadata =
    match?.source_metadata && typeof match.source_metadata === 'object'
      ? match.source_metadata
      : {};

  return (
    match?.sourceTitle ||
    metadata?.title ||
    match?.title ||
    match?.projectTitle ||
    metadata?.document_id ||
    'Unknown source'
  );
};

const toBlockBounds = (block) => {
  const start = Number(
    block?.studentStart ?? block?.start ?? block?.startIndex ?? block?.start_index,
  );
  const end = Number(block?.studentEnd ?? block?.end ?? block?.endIndex ?? block?.end_index);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

  return {
    studentStart: start,
    studentEnd: end,
    sourceStart: Number.isFinite(Number(block?.sourceStart)) ? Number(block.sourceStart) : null,
    sourceEnd: Number.isFinite(Number(block?.sourceEnd)) ? Number(block.sourceEnd) : null,
    matchedText: typeof block?.matchedText === 'string' ? block.matchedText : '',
    sourceText:
      typeof block?.sourceText === 'string'
        ? block.sourceText
        : typeof block?.source_snippet === 'string'
          ? block.source_snippet
          : '',
  };
};

const toBlocks = (match, text) => {
  const fromMatchedBlocks = Array.isArray(match?.matchedBlocks)
    ? match.matchedBlocks
    : Array.isArray(match?.matched_blocks)
      ? match.matched_blocks
      : null;

  if (Array.isArray(fromMatchedBlocks) && fromMatchedBlocks.length > 0) {
    return fromMatchedBlocks
      .map((block) => toBlockBounds(block))
      .filter(Boolean)
      .map((block) => ({
        ...block,
        matchedText: block.matchedText || text.slice(block.studentStart, block.studentEnd),
      }));
  }

  if (Array.isArray(match?.spans) && match.spans.length > 0) {
    return match.spans
      .map((span) =>
        toBlockBounds({
          studentStart: span?.start ?? span?.startIndex ?? span?.start_index,
          studentEnd: span?.end ?? span?.endIndex ?? span?.end_index,
        }),
      )
      .filter(Boolean)
      .map((block) => ({
        ...block,
        matchedText: text.slice(block.studentStart, block.studentEnd),
      }));
  }

  const fallback = toBlockBounds({
    studentStart: match?.studentStart ?? match?.startIndex ?? match?.start_index,
    studentEnd: match?.studentEnd ?? match?.endIndex ?? match?.end_index,
  });

  if (!fallback) return [];

  return [
    {
      ...fallback,
      matchedText: text.slice(fallback.studentStart, fallback.studentEnd),
      sourceText: typeof match?.source_snippet === 'string' ? match.source_snippet : '',
    },
  ];
};

const normalizeTextMatches = (payload, text) => {
  const rawMatches =
    (Array.isArray(payload?.textMatches) && payload.textMatches) ||
    (Array.isArray(payload?.fullReport?.textMatches) && payload.fullReport.textMatches) ||
    (Array.isArray(payload?.matchedSources) && payload.matchedSources) ||
    (Array.isArray(payload?.fullReport?.matches) && payload.fullReport.matches) ||
    (Array.isArray(payload?.matches) && payload.matches) ||
    [];

  const normalized = rawMatches
    .map((match, index) => {
      const similarityPercentage =
        clampPercent(match?.similarityPercentage) ??
        clampPercent(match?.matchPercentage) ??
        toSimilarityPercent(match?.similarity_score) ??
        toSimilarityPercent(match?.similarity);

      const blocks = toBlocks(match, text).filter(
        (block) =>
          block.studentStart >= 0 &&
          block.studentEnd <= text.length &&
          block.studentEnd > block.studentStart,
      );

      const winnowScore =
        typeof match?.winnow_score === 'number'
          ? match.winnow_score
          : typeof match?.winnowScore === 'number'
            ? match.winnowScore
            : null;
      const semanticScore =
        typeof match?.semantic_score === 'number'
          ? match.semantic_score
          : typeof match?.semanticScore === 'number'
            ? match.semanticScore
            : null;

      return {
        sourceId: toSourceId(match, index),
        sourceTitle: toSourceTitle(match),
        similarityPercentage: similarityPercentage ?? 0,
        winnowScore,
        semanticScore,
        contextSignal: deriveContextSignal(winnowScore, semanticScore),
        matchedBlocks: blocks,
      };
    })
    .filter((match) => match.matchedBlocks.length > 0)
    .sort((left, right) => right.similarityPercentage - left.similarityPercentage);

  return normalized.map((match, index) => ({
    ...match,
    sourceNumber: index + 1,
    palette: SOURCE_PALETTE[index % SOURCE_PALETTE.length],
  }));
};

const mergeIntervals = (intervals) => {
  const normalized = intervals
    .filter((interval) => interval.end > interval.start)
    .sort((left, right) => left.start - right.start || left.end - right.end);

  if (normalized.length === 0) return [];

  const merged = [normalized[0]];
  for (let index = 1; index < normalized.length; index += 1) {
    const current = normalized[index];
    const previous = merged[merged.length - 1];
    if (current.start <= previous.end) {
      previous.end = Math.max(previous.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
};

const computeCoveragePercent = (textLength, matches) => {
  if (!Number.isFinite(textLength) || textLength <= 0) return 0;

  const intervals = matches.flatMap((match) =>
    match.matchedBlocks.map((block) => ({ start: block.studentStart, end: block.studentEnd })),
  );

  const covered = mergeIntervals(intervals).reduce(
    (sum, interval) => sum + (interval.end - interval.start),
    0,
  );
  return clampPercent((covered / textLength) * 100) ?? 0;
};

const flattenHighlights = (matches) =>
  matches.flatMap((match) =>
    match.matchedBlocks.map((block, blockIndex) => ({
      key: `${match.sourceId}-${block.studentStart}-${block.studentEnd}-${blockIndex}`,
      sourceId: match.sourceId,
      sourceTitle: match.sourceTitle,
      sourceNumber: match.sourceNumber,
      similarityPercentage: match.similarityPercentage,
      winnowScore: match.winnowScore,
      semanticScore: match.semanticScore,
      contextSignal: match.contextSignal,
      studentStart: block.studentStart,
      studentEnd: block.studentEnd,
      matchedText: block.matchedText,
      sourceText: block.sourceText,
      sourceStart: block.sourceStart,
      sourceEnd: block.sourceEnd,
      palette: match.palette,
    })),
  );

const classifyAcademicLine = (trimmed, index) => {
  if (trimmed.length > 120) return 'body';

  if (/^<Title.*>$/i.test(trimmed) || (index === 0 && trimmed.length < 150)) {
    return 'cover-title';
  }
  if (/^(A\s+)?(Capstone|Research|Thesis|Special)\s+Project\s+by/i.test(trimmed)) {
    return 'cover-byline';
  }
  if (/^<Name\s*\d*>$/i.test(trimmed)) {
    return 'cover-author';
  }
  if (/Submitted to\b|College of\b|Department of\b|Bukidnon State University/i.test(trimmed)) {
    return 'cover-affiliation';
  }
  if (/In Partial Fulfillment\b|Requirements for the Degree\b|^<Degree>$/i.test(trimmed)) {
    return 'cover-fulfillment';
  }
  if (
    /^<Month and year.*>$/i.test(trimmed) ||
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/i.test(
      trimmed,
    )
  ) {
    return 'cover-date';
  }
  if (/^APPROVAL SHEET$/i.test(trimmed)) {
    return 'approval-heading';
  }
  if (/^This capstone project entitled/i.test(trimmed)) {
    return 'approval-body';
  }
  if (/^(Capstone Project Adviser|Chair,\s*Defense Panel|Panel Member)$/i.test(trimmed)) {
    return 'approval-role';
  }
  if (/^<(Adviser|Chair|Panelist\s*\d*)\s*\(CAPSLOCK\)>$/i.test(trimmed)) {
    return 'approval-name';
  }
  if (
    /^(DEDICATION|ACKNOWLEDGMENTS?|TABLE OF CONTENTS|LIST OF TABLES|LIST OF FIGURES|ABSTRACT|CHAPTER\s+\d+|INTRODUCTION|REVIEW OF RELATED LITERATURE|METHODOLOGY|RESULTS AND DISCUSSION|SUMMARY,\s*CONCLUSIONS,\s*AND\s*RECOMMENDATIONS|REFERENCES|BIBLIOGRAPHY)$/i.test(
      trimmed,
    )
  ) {
    return 'section-heading';
  }
  if (/^\d+\.\d+(\.\d+)?\s+/.test(trimmed)) {
    return 'subheading';
  }
  return 'body';
};

const paginateLines = (structuredLines) => {
  const pages = [];
  let currentPageLines = [];
  let currentPageType = 'cover';
  let currentPageNumber = 1;

  const pushCurrentPage = () => {
    if (currentPageLines.length > 0) {
      pages.push({
        id: `page-${currentPageNumber}`,
        pageNumber: currentPageNumber,
        pageType: currentPageType,
        lines: [...currentPageLines],
      });
      currentPageNumber += 1;
      currentPageLines = [];
    }
  };

  for (let i = 0; i < structuredLines.length; i++) {
    const line = structuredLines[i];
    const isExplicitBreak = line.text.includes('\x0c') || line.text.includes('\f');
    const isApprovalStart = line.type === 'approval-heading' || /^APPROVAL SHEET/i.test(line.text);
    const isMajorSection =
      (line.type === 'section-heading' || line.type === 'subheading') &&
      /^(DEDICATION|ACKNOWLEDGMENTS?|TABLE OF CONTENTS|LIST OF TABLES|LIST OF FIGURES|ABSTRACT|CHAPTER\s+\d+|REFERENCES|APPENDICES|BIBLIOGRAPHY)/i.test(
        line.text,
      );

    if (isApprovalStart) {
      pushCurrentPage();
      currentPageType = 'approval';
    } else if (isMajorSection) {
      pushCurrentPage();
      currentPageType = /^CHAPTER/i.test(line.text) ? 'chapter' : 'section';
    } else if (isExplicitBreak) {
      pushCurrentPage();
      currentPageType = 'standard';
    } else if (
      currentPageType === 'cover' &&
      !line.type.startsWith('cover-') &&
      line.type !== 'body'
    ) {
      pushCurrentPage();
      currentPageType = 'standard';
    } else if (
      currentPageType !== 'cover' &&
      currentPageType !== 'approval' &&
      currentPageLines.length >= 35
    ) {
      pushCurrentPage();
      currentPageType = 'standard';
    }

    currentPageLines.push(line);
  }

  pushCurrentPage();
  return pages.length > 0 ? pages : [{ id: 'page-1', pageNumber: 1, pageType: 'cover', lines: [] }];
};

const fragmentLine = (lineText, lineStart, lineEnd, highlights) => {
  const intersecting = highlights.filter(
    (h) => h.studentEnd > lineStart && h.studentStart < lineEnd,
  );
  if (intersecting.length === 0) {
    return [{ key: `plain-${lineStart}-${lineEnd}`, text: lineText, highlight: null }];
  }

  const sorted = [...intersecting].sort((a, b) => a.studentStart - b.studentStart);
  const fragments = [];
  let cursor = 0;

  for (const h of sorted) {
    const relStart = Math.max(0, h.studentStart - lineStart);
    const relEnd = Math.min(lineText.length, h.studentEnd - lineStart);

    if (relStart > cursor) {
      fragments.push({
        key: `plain-${lineStart + cursor}-${lineStart + relStart}`,
        text: lineText.slice(cursor, relStart),
        highlight: null,
      });
    }

    if (relEnd > relStart) {
      fragments.push({
        key: `highlight-${lineStart + relStart}-${lineStart + relEnd}-${h.key}`,
        text: lineText.slice(relStart, relEnd),
        highlight: h,
      });
    }
    cursor = Math.max(cursor, relEnd);
  }

  if (cursor < lineText.length) {
    fragments.push({
      key: `plain-${lineStart + cursor}-${lineEnd}`,
      text: lineText.slice(cursor),
      highlight: null,
    });
  }

  return fragments;
};

const buildTextSegments = (text, highlights) => {
  if (!text) return [];
  if (!Array.isArray(highlights) || highlights.length === 0) {
    return [{ key: 'plain-0', text, highlight: null }];
  }

  const breakpoints = new Set([0, text.length]);
  for (const highlight of highlights) {
    breakpoints.add(highlight.studentStart);
    breakpoints.add(highlight.studentEnd);
  }

  const sorted = [...breakpoints]
    .filter((value) => value >= 0 && value <= text.length)
    .sort((a, b) => a - b);
  const segments = [];

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const start = sorted[index];
    const end = sorted[index + 1];
    if (end <= start) continue;

    const chunk = text.slice(start, end);
    const active = highlights.filter(
      (highlight) => highlight.studentStart < end && highlight.studentEnd > start,
    );

    if (active.length === 0) {
      segments.push({ key: `plain-${start}-${end}`, text: chunk, highlight: null });
      continue;
    }

    active.sort((left, right) => {
      if (right.similarityPercentage !== left.similarityPercentage) {
        return right.similarityPercentage - left.similarityPercentage;
      }
      return right.studentEnd - right.studentStart - (left.studentEnd - left.studentStart);
    });

    segments.push({
      key: `highlight-${start}-${end}-${active[0].key}`,
      text: chunk,
      highlight: active[0],
    });
  }

  return segments;
};

/* ── Utility: resolve similarity color from CMS tokens ─────── */
function getSimilarityStatus(percent) {
  if (percent >= 50) {
    return {
      color: '#ef4444',
      textClass: 'text-rose-600 dark:text-rose-400',
      bgClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
      badgeVariant: 'destructive',
      label: 'High Similarity (≥ 50%)',
      statusText: 'Action Required',
    };
  }
  if (percent >= 25) {
    return {
      color: '#f59e0b',
      textClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
      badgeVariant: 'warning',
      label: 'Moderate Similarity (25–49%)',
      statusText: 'Review Recommended',
    };
  }
  return {
    color: '#10b981',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    badgeVariant: 'secondary',
    label: 'Compliant (< 25%)',
    statusText: 'Passes BukSU Standard',
  };
}

/* ──────────────────────────────────────────────────────────────────────
   Signal badge config
   ────────────────────────────────────────────────────────────────────── */
const SIGNAL_CONFIG = {
  verbatim: {
    label: 'VERBATIM',
    className: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  },
  paraphrase: {
    label: 'PARAPHRASE',
    className: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30',
  },
  mixed: {
    label: 'MIXED',
    className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
};

/* ──────────────────────────────────────────────────────────────
   SourceRow sub-component
   ────────────────────────────────────────────────────────────── */
function SourceRow({ source, isActive, onSelect }) {
  const percentage = Math.round(source.similarityPercentage);
  const status = getSimilarityStatus(percentage);
  const signal = SIGNAL_CONFIG[source.contextSignal] || SIGNAL_CONFIG.mixed;
  const hasScoreBreakdown = source.winnowScore !== null || source.semanticScore !== null;
  const winnowPct = source.winnowScore !== null ? Math.round(source.winnowScore * 100) : null;
  const semanticPct = source.semanticScore !== null ? Math.round(source.semanticScore * 100) : null;

  return (
    <button
      type="button"
      onClick={() => onSelect(source.sourceId)}
      className={cn(
        'w-full rounded-lg border p-3 text-left transition-all',
        isActive
          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
          : 'border-border/60 bg-card hover:border-border hover:bg-muted/40',
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Numbered badge */}
        <span
          className="mt-0.5 inline-flex h-6 min-w-[1.5rem] shrink-0 items-center justify-center rounded-full border text-[11px] font-bold"
          style={source.palette.badgeStyle}
        >
          {source.sourceNumber}
        </span>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-1.5">
            <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground flex-1">
              {source.sourceTitle}
            </p>
            {/* Context signal badge */}
            <span
              className={cn(
                'shrink-0 inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                signal.className,
              )}
            >
              {signal.label}
            </span>
          </div>

          {/* Blended similarity bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">
                {source.matchedBlocks.length} match{source.matchedBlocks.length !== 1 ? 'es' : ''}
              </span>
              <span className={cn('font-semibold', status.textClass)}>{percentage}%</span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-muted"
              title={`Blended score: ${percentage}%`}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${percentage}%`, backgroundColor: status.color }}
              />
            </div>
          </div>

          {/* Dual signal bars: Exact Overlap + Semantic Match */}
          {hasScoreBreakdown && (
            <div className="space-y-0.5 pt-0.5">
              {winnowPct !== null && (
                <div className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-[9px] text-muted-foreground">Exact</span>
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${winnowPct}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-[9px] font-mono text-muted-foreground">
                    {winnowPct}%
                  </span>
                </div>
              )}
              {semanticPct !== null && (
                <div className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-[9px] text-muted-foreground">Semantic</span>
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${semanticPct}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-[9px] font-mono text-muted-foreground">
                    {semanticPct}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────
   Main component
   ────────────────────────────────────────────────────────────── */
function PlagiarismReportPage({
  file = null,
  fileName: propFileName = '',
  reportData = null,
  originalText = '',
  onReset = null,
  onBack = null,
  initialCanvasMode,
}) {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const highlightRefs = useRef(new Map());
  const canvasContainerRef = useRef(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [sourceSearch, setSourceSearch] = useState('');
  const [showHighlights, setShowHighlights] = useState(true);
  const [paperMode, setPaperMode] = useState('paper');
  const [zoomLevel, setZoomLevel] = useState(100);

  const { data, isLoading, isError, error } = usePlagiarismReport(submissionId, {
    enabled: !reportData,
  });

  const { data: submission } = useSubmission(submissionId, {
    enabled: !!submissionId,
  });

  const payload = reportData || data || null;

  const effectiveFile = file || submission?.file || null;
  const submissionFileName =
    propFileName ||
    effectiveFile?.name ||
    submission?.fileName ||
    payload?.submissionFileName ||
    payload?.fileName ||
    'Submitted Document';

  const isDocx =
    submissionFileName.toLowerCase().endsWith('.docx') ||
    submissionFileName.toLowerCase().endsWith('.doc') ||
    Boolean(effectiveFile?.type?.includes('wordprocessingml')) ||
    Boolean(submission?.fileType?.includes('wordprocessingml'));
  const isPdf =
    submissionFileName.toLowerCase().endsWith('.pdf') ||
    Boolean(effectiveFile?.type?.includes('pdf')) ||
    Boolean(submission?.fileType?.includes('pdf'));

  const viewerSubmission = useMemo(() => {
    if (submission) return submission;
    if (effectiveFile || payload) {
      return {
        _id: payload?._id || payload?.id || 'archive-document',
        fileName: submissionFileName,
        fileSize: effectiveFile?.size || payload?.fileSize || 0,
        fileType:
          effectiveFile?.type ||
          (isDocx
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/pdf'),
        originalityScore:
          payload?.originalityScore !== undefined && payload?.originalityScore !== null
            ? payload.originalityScore
            : payload?.overallScore !== undefined
              ? 100 - payload.overallScore
              : null,
        chapter: payload?.chapter || 1,
        version: payload?.version || 1,
        status: 'reviewed',
      };
    }
    return null;
  }, [submission, effectiveFile, payload, submissionFileName, isDocx]);

  const hasBinaryDocument = Boolean(effectiveFile || (submissionId && !originalText));
  const [canvasMode, setCanvasMode] = useState(
    initialCanvasMode || (hasBinaryDocument ? 'document' : 'extracted'),
  );

  const scanMutation = useScanSubmissionArchive();

  const text = useMemo(() => {
    if (typeof originalText === 'string' && originalText.trim()) return originalText;
    if (typeof payload?.originalText === 'string' && payload.originalText.trim())
      return payload.originalText;
    if (typeof payload?.extractedText === 'string' && payload.extractedText.trim())
      return payload.extractedText;
    return '';
  }, [originalText, payload]);

  const sources = useMemo(() => normalizeTextMatches(payload, text), [payload, text]);
  const allHighlights = useMemo(() => flattenHighlights(sources), [sources]);

  const [activeSourceId, setActiveSourceId] = useState(null);
  const [activeHighlightKey, setActiveHighlightKey] = useState(null);

  const resolvedActiveSourceId = useMemo(() => {
    if (sources.length === 0) return null;
    if (activeSourceId && sources.some((source) => source.sourceId === activeSourceId)) {
      return activeSourceId;
    }
    return sources[0].sourceId;
  }, [sources, activeSourceId]);

  const visibleHighlights = useMemo(
    () =>
      resolvedActiveSourceId
        ? allHighlights.filter((highlight) => highlight.sourceId === resolvedActiveSourceId)
        : allHighlights,
    [allHighlights, resolvedActiveSourceId],
  );

  const textSegments = useMemo(
    () => buildTextSegments(text, visibleHighlights),
    [text, visibleHighlights],
  );

  const structuredLines = useMemo(() => {
    if (!text) return [];
    const rawLines = text.split('\n');
    const result = [];
    let cursor = 0;

    for (let i = 0; i < rawLines.length; i++) {
      const rawLine = rawLines[i];
      const trimmed = rawLine.trim();
      const lineStart = cursor;
      const lineEnd = cursor + rawLine.length;
      cursor += rawLine.length + 1;

      if (trimmed.length === 0) continue;

      const type = classifyAcademicLine(trimmed, result.length);
      const fragments = fragmentLine(trimmed, lineStart, lineEnd, visibleHighlights);

      result.push({
        id: `line-${i}-${lineStart}`,
        text: trimmed,
        start: lineStart,
        end: lineEnd,
        type,
        fragments,
      });
    }

    return result;
  }, [text, visibleHighlights]);

  const pages = useMemo(() => paginateLines(structuredLines), [structuredLines]);
  const [currentPage, setCurrentPage] = useState(1);

  const activeSource = useMemo(
    () => sources.find((source) => source.sourceId === resolvedActiveSourceId) || null,
    [sources, resolvedActiveSourceId],
  );

  const activeHighlight = useMemo(() => {
    if (!activeSource) return null;
    const direct = allHighlights.find((highlight) => highlight.key === activeHighlightKey);
    if (direct && direct.sourceId === activeSource.sourceId) return direct;
    return allHighlights.find((highlight) => highlight.sourceId === activeSource.sourceId) || null;
  }, [allHighlights, activeHighlightKey, activeSource]);

  useEffect(() => {
    if (!activeHighlight) return;
    const node = highlightRefs.current.get(activeHighlight.key);
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      const parentSection = node.closest('[data-page-number]');
      if (parentSection) {
        const pNum = Number(parentSection.getAttribute('data-page-number'));
        if (pNum) setCurrentPage(pNum);
      }
    }
  }, [activeHighlight]);

  const scrollToPage = (pageNum) => {
    if (!canvasContainerRef.current) return;
    const target = canvasContainerRef.current.querySelector(`[data-page-number="${pageNum}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentPage(pageNum);
    }
  };

  const handleCanvasScroll = () => {
    if (!canvasContainerRef.current) return;
    const sections = canvasContainerRef.current.querySelectorAll('[data-page-number]');
    const containerTop = canvasContainerRef.current.getBoundingClientRect().top;

    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      if (rect.top - containerTop <= 200 && rect.bottom - containerTop > 100) {
        const pNum = Number(section.getAttribute('data-page-number'));
        if (pNum && pNum !== currentPage) {
          setCurrentPage(pNum);
        }
        break;
      }
    }
  };

  const renderLineFragments = (line) =>
    line.fragments.map((frag) => {
      if (!frag.highlight || !showHighlights) {
        return <span key={frag.key}>{frag.text}</span>;
      }

      const isActive = activeHighlight?.key === frag.highlight.key;
      const scoreStyle = getScoreHighlightStyle(
        frag.highlight.palette.dot,
        frag.highlight.similarityPercentage,
      );

      return (
        <mark
          key={frag.key}
          id={`highlight-${frag.highlight.key}`}
          ref={(node) => {
            if (node) highlightRefs.current.set(frag.highlight.key, node);
            else highlightRefs.current.delete(frag.highlight.key);
          }}
          tabIndex={0}
          role="button"
          aria-label={`Source ${frag.highlight.sourceNumber}: ${frag.highlight.sourceTitle}, ${Math.round(frag.highlight.similarityPercentage)}% match`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleHighlightClick(frag.highlight);
            }
          }}
          className={cn(
            'cursor-pointer rounded px-1 py-0.5 transition-all outline-none focus:ring-2 focus:ring-primary',
            paperMode === 'paper' ? 'text-slate-950' : 'text-foreground',
            isActive
              ? 'ring-2 ring-primary ring-offset-2 shadow-sm font-medium'
              : 'hover:opacity-80',
          )}
          style={scoreStyle}
          onClick={() => handleHighlightClick(frag.highlight)}
          title={`[${frag.highlight.sourceNumber}] ${frag.highlight.sourceTitle} — ${Math.round(frag.highlight.similarityPercentage)}%`}
        >
          <sup
            className={cn(
              'mr-0.5 inline-flex items-center justify-center rounded px-1 text-[9px] font-bold border',
              paperMode === 'paper'
                ? 'bg-white/90 border-slate-300 text-slate-900'
                : 'bg-background/80 border-border/60 text-foreground',
            )}
          >
            {frag.highlight.sourceNumber}
          </sup>
          {frag.text}
        </mark>
      );
    });

  const overallScore = useMemo(() => {
    const direct =
      clampPercent(payload?.overallScore) ??
      clampPercent(payload?.overallSimilarity) ??
      toSimilarityPercent(payload?.similarityScore) ??
      toSimilarityPercent(payload?.similarity_score) ??
      clampPercent(payload?.fullReport?.overallScore) ??
      clampPercent(payload?.fullReport?.plagiarism_score);

    if (direct !== null) return direct;

    const fromOriginality = clampPercent(payload?.originalityScore);
    if (fromOriginality !== null) return clampPercent(100 - fromOriginality) ?? 0;

    return computeCoveragePercent(text.length, sources);
  }, [payload, sources, text.length]);

  const originalityScore = Math.max(0, Math.min(100, 100 - overallScore));
  const processedAt = payload?.processedAt || payload?.fullReport?.checked_at || null;
  const status = getSimilarityStatus(overallScore);

  const wordCount = useMemo(() => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  }, [text]);

  const filteredSources = useMemo(() => {
    if (!sourceSearch.trim()) return sources;
    const q = sourceSearch.toLowerCase();
    return sources.filter((s) => s.sourceTitle.toLowerCase().includes(q));
  }, [sources, sourceSearch]);

  const handleSourceSelect = (sourceId) => {
    setActiveSourceId(sourceId);
    const firstHighlight = allHighlights.find((highlight) => highlight.sourceId === sourceId);
    if (firstHighlight) setActiveHighlightKey(firstHighlight.key);
  };

  const handleHighlightClick = (highlight) => {
    setActiveSourceId(highlight.sourceId);
    setActiveHighlightKey(highlight.key);
  };

  const handleRescan = () => {
    if (typeof onReset === 'function') {
      onReset();
      return;
    }
    if (submissionId) {
      scanMutation.mutate(submissionId, {
        onSuccess: () => {
          toast.success('Archive scan updated successfully!');
        },
        onError: (err) => {
          toast.error(err?.response?.data?.message || 'Failed to scan submission against archive.');
        },
      });
    }
  };

  /* ── Loading state ─────────────────────────────────────── */
  if (isLoading && !reportData) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  /* ── Error state ───────────────────────────────────────── */
  if (isError && !reportData) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg space-y-4 py-8">
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              {error?.response?.data?.message ||
                error?.message ||
                'Failed to load plagiarism report.'}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Submissions
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  /* ── Main report view ──────────────────────────────────── */
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1800px] space-y-4">
        {/* ── Top Header Toolbar ── */}
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (typeof onBack === 'function') onBack();
                else if (typeof onReset === 'function') onReset();
                else navigate(-1);
              }}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <div className="h-4 w-px bg-border hidden sm:block" />

            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h1 className="text-base font-bold text-foreground">
                  Plagiarism & Similarity Intelligence Report
                </h1>
                <Badge variant={status.badgeVariant} className="text-xs">
                  {status.statusText}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {submissionFileName} · Phase {submission?.capstonePhase ?? '1–4'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRescan}
              disabled={scanMutation.isPending}
              className="gap-1.5"
            >
              <RefreshCcw className={cn('h-4 w-4', scanMutation.isPending && 'animate-spin')} />
              {scanMutation.isPending ? 'Scanning...' : 'Re-scan Archive'}
            </Button>

            {(submission || viewerSubmission) && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setViewerOpen(true)}
                className="gap-1.5 shadow-sm"
              >
                <BookOpen className="h-4 w-4" />
                Inspect in Reader
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              title="Print / Export Report"
            >
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* ── Executive KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Similarity Score */}
          <Card className="border-border/60 bg-card shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Similarity Index
                </p>
                <div className="flex items-baseline gap-2">
                  <span className={cn('text-3xl font-extrabold', status.textClass)}>
                    {Math.round(overallScore)}%
                  </span>
                  <span className="text-xs text-muted-foreground">/ 25% max target</span>
                </div>
                <p className="text-xs text-muted-foreground">{status.label}</p>
              </div>
              <div className="relative h-14 w-14 shrink-0">
                <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90">
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    className="stroke-muted"
                    strokeWidth="3.5"
                    fill="transparent"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    stroke={status.color}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 16}`}
                    strokeDashoffset={`${2 * Math.PI * 16 * (1 - overallScore / 100)}`}
                    fill="transparent"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
                  {Math.round(overallScore)}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Originality Score */}
          <Card className="border-border/60 bg-card shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Original Content
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {Math.round(originalityScore)}%
                  </span>
                  <span className="text-xs text-muted-foreground">originality ratio</span>
                </div>
                <p className="text-xs text-muted-foreground">Verified Academic Authenticity</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Sources & Corpus */}
          <Card className="border-border/60 bg-card shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Archive Matched Sources
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground">{sources.length}</span>
                  <span className="text-xs text-muted-foreground">
                    {sources.length === 1 ? 'source' : 'sources'} identified
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {wordCount.toLocaleString()} words ·{' '}
                  {processedAt ? new Date(processedAt).toLocaleDateString() : 'Active scan'}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Layers className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Main grid: document canvas + sidebar ── */}
        <div
          className="grid grid-cols-1 overflow-hidden rounded-xl border border-border/60 bg-card xl:grid-cols-[1fr_380px]"
          style={{ minHeight: '75vh' }}
        >
          {/* Document canvas (Turnitin "paper" look) */}
          <div className="flex flex-col overflow-hidden bg-muted/20">
            {/* Canvas Sub-Header Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-4 py-2 text-xs">
              {/* Left: Document Mode Switcher & Highlights Toggle */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-background/80 p-0.5 shadow-2xs">
                  <button
                    type="button"
                    data-testid="canvasmode-document-btn"
                    onClick={() => setCanvasMode('document')}
                    className={cn(
                      'rounded px-2.5 py-1 text-xs font-medium transition-all flex items-center gap-1.5',
                      canvasMode === 'document'
                        ? 'bg-card font-semibold text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                    title="Render authentic PDF/Word document with complete styling, fonts, and margins"
                  >
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <span>Original Document</span>
                  </button>
                  <button
                    type="button"
                    data-testid="canvasmode-extracted-btn"
                    onClick={() => setCanvasMode('extracted')}
                    className={cn(
                      'rounded px-2.5 py-1 text-xs font-medium transition-all flex items-center gap-1.5',
                      canvasMode === 'extracted'
                        ? 'bg-card font-semibold text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                    title="View extracted text line-by-line"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Extracted Text</span>
                  </button>
                </div>

                {canvasMode === 'extracted' && (
                  <>
                    <div className="h-4 w-px bg-border/60" />

                    <button
                      type="button"
                      data-testid="toggle-highlights-btn"
                      onClick={() => setShowHighlights((prev) => !prev)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-all text-xs border',
                        showHighlights
                          ? 'bg-primary/10 border-primary/30 text-primary font-semibold shadow-2xs'
                          : 'bg-background/80 border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                      title="Toggle originality highlights overlay"
                    >
                      <Sparkles className={cn('h-3.5 w-3.5', showHighlights && 'text-primary')} />
                      <span>Highlights: {showHighlights ? 'ON' : 'OFF'}</span>
                    </button>
                  </>
                )}
              </div>

              {/* Right: Page Navigator, Paper Mode & Zoom (Extracted mode only) */}
              {canvasMode === 'extracted' && (
                <div className="flex items-center gap-2.5">
                  {/* Page Navigator */}
                  {pages.length > 1 && (
                    <div className="flex items-center gap-1 bg-background/80 px-2 py-0.5 rounded-lg border border-border/60 text-xs font-mono">
                      <button
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
                        className="h-5 w-5 rounded hover:bg-muted disabled:opacity-30 flex items-center justify-center text-foreground transition-colors"
                        title="Previous Page"
                        aria-label="Previous Page"
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </button>
                      <span className="font-semibold text-foreground text-[11px] px-1">
                        Page {currentPage} of {pages.length}
                      </span>
                      <button
                        type="button"
                        disabled={currentPage >= pages.length}
                        onClick={() => scrollToPage(Math.min(pages.length, currentPage + 1))}
                        className="h-5 w-5 rounded hover:bg-muted disabled:opacity-30 flex items-center justify-center text-foreground transition-colors"
                        title="Next Page"
                        aria-label="Next Page"
                      >
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-background/80 p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setPaperMode('paper')}
                      className={cn(
                        'rounded px-2.5 py-0.5 text-[11px] font-medium transition-all',
                        paperMode === 'paper'
                          ? 'bg-card font-semibold text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                      title="Authentic Paper Sheet View"
                    >
                      Paper Sheet
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaperMode('theme')}
                      className={cn(
                        'rounded px-2.5 py-0.5 text-[11px] font-medium transition-all',
                        paperMode === 'theme'
                          ? 'bg-card font-semibold text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                      title="Theme Card View"
                    >
                      Theme
                    </button>
                  </div>

                  {/* Zoom controls */}
                  <div className="flex items-center gap-1 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(z - 10, 50))}
                      disabled={zoomLevel <= 50}
                      className="h-6 w-6 rounded border border-border/60 bg-background hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                      title="Zoom out"
                    >
                      <ZoomOut className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(100)}
                      className="min-w-[2.75rem] px-1 text-center font-semibold text-foreground hover:underline"
                      title="Reset zoom"
                    >
                      {zoomLevel}%
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(z + 10, 300))}
                      disabled={zoomLevel >= 300}
                      className="h-6 w-6 rounded border border-border/60 bg-background hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                      title="Zoom in"
                    >
                      <ZoomIn className="h-3 w-3" />
                    </button>
                    <div className="flex items-center gap-0.5 ml-1">
                      {[150, 200, 250, 300].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setZoomLevel(lvl)}
                          className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                            zoomLevel === lvl
                              ? 'bg-primary text-primary-foreground font-bold border-primary'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted border-border/50'
                          }`}
                          title={`Zoom to ${lvl}%`}
                          aria-label={`Zoom ${lvl}%`}
                        >
                          {lvl}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Similarity Legend strip — extracted mode only */}
            {canvasMode === 'extracted' && showHighlights && (
              <div className="flex flex-wrap items-center gap-3 border-b border-border/40 bg-muted/20 px-4 py-1.5 text-[10px] text-muted-foreground">
                <span className="font-semibold text-foreground">Highlight intensity:</span>
                <span className="flex items-center gap-1">
                  <span
                    className="inline-block h-2.5 w-5 rounded-sm"
                    style={{
                      background: 'rgba(234,179,8,0.25)',
                      border: '1px solid rgba(234,179,8,0.5)',
                    }}
                  />
                  Low (≤50%)
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className="inline-block h-2.5 w-5 rounded-sm"
                    style={{
                      background: 'rgba(249,115,22,0.35)',
                      border: '1px solid rgba(249,115,22,0.7)',
                    }}
                  />
                  Medium (50–70%)
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className="inline-block h-2.5 w-5 rounded-sm"
                    style={{
                      background: 'rgba(244,63,94,0.42)',
                      border: '2px solid rgba(244,63,94,0.8)',
                    }}
                  />
                  High (70–90%)
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className="inline-block h-2.5 w-5 rounded-sm"
                    style={{
                      background: 'rgba(185,28,28,0.50)',
                      border: '3px solid rgba(185,28,28,0.9)',
                    }}
                  />
                  Critical (≥90%)
                </span>
                <span className="mx-1 h-3 w-px bg-border/60" />
                <span className="flex items-center gap-1">
                  <span
                    className="inline-block h-2.5 w-5 rounded-sm"
                    style={{
                      background: 'rgba(124,58,237,0.20)',
                      borderBottom: '2px dashed rgba(124,58,237,0.8)',
                    }}
                  />
                  Paraphrase
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className="inline-block h-2.5 w-5 rounded-sm"
                    style={{
                      background: 'rgba(220,38,38,0.28)',
                      borderBottom: '3px double rgba(220,38,38,0.8)',
                    }}
                  />
                  Verbatim
                </span>
              </div>
            )}

            {/* Canvas Body */}
            {canvasMode === 'document' ? (
              <div className="flex-1 w-full min-h-[75vh] flex flex-col overflow-hidden bg-background">
                <SophisticatedDocumentViewer
                  embedded={true}
                  isPlagiarismReport={true}
                  hideIdentity={true}
                  showRevisionDiff={false}
                  showComments={false}
                  submission={viewerSubmission}
                  file={effectiveFile}
                  fileUrl={submissionId ? `/api/submissions/${submissionId}/file` : null}
                  fileName={submissionFileName}
                  initialViewMode="manuscript"
                  plagiarismMatches={
                    allHighlights.length > 0
                      ? allHighlights
                      : payload?.matches || payload?.fullReport?.matches || []
                  }
                  activeHighlightId={activeHighlightKey || resolvedActiveSourceId}
                  onHighlightClick={(h) => {
                    const targetId = h.meta?.matchedSourceId || h.sourceId;
                    if (targetId) {
                      handleSourceSelect(targetId);
                    }
                  }}
                  className="h-full w-full min-h-[75vh]"
                />
              </div>
            ) : (
              <div
                ref={canvasContainerRef}
                onScroll={handleCanvasScroll}
                className="flex-1 overflow-auto p-4 sm:p-10 flex flex-col items-center gap-10 bg-slate-900/60 dark:bg-slate-950"
                style={{ maxHeight: '76vh', scrollBehavior: 'smooth' }}
                tabIndex={0}
                role="region"
                aria-label="Manuscript Pages Canvas"
              >
                {text && pages.length > 0 ? (
                  <article
                    data-paper-canvas={paperMode === 'paper' ? 'paper' : 'theme'}
                    className={cn(
                      'w-full flex flex-col items-center gap-10 select-text transition-all',
                      paperMode === 'paper' ? 'bg-white text-[#0f172a]' : 'bg-card text-foreground',
                    )}
                    style={{ background: 'transparent' }}
                  >
                    {pages.map((page) => {
                      const isCover = page.pageType === 'cover';
                      const isApproval = page.pageType === 'approval';

                      const titleLines = page.lines.filter((l) => l.type === 'cover-title');
                      const authorLines = page.lines.filter(
                        (l) => l.type === 'cover-byline' || l.type === 'cover-author',
                      );
                      const affiliationLines = page.lines.filter(
                        (l) =>
                          l.type === 'cover-affiliation' ||
                          l.type === 'cover-fulfillment' ||
                          l.type === 'cover-date',
                      );
                      const otherCoverLines = page.lines.filter(
                        (l) => !l.type.startsWith('cover-'),
                      );

                      return (
                        <section
                          key={page.id}
                          id={page.id}
                          data-page-number={page.pageNumber}
                          data-paper-sheet={paperMode === 'paper' ? 'true' : undefined}
                          role="region"
                          aria-label={`Manuscript Page ${page.pageNumber}`}
                          className={cn(
                            'w-full max-w-[8.5in] min-h-[11in] rounded-sm transition-all duration-200 select-text flex flex-col justify-between shadow-2xl ring-1',
                            paperMode === 'paper'
                              ? 'bg-white text-[#0f172a] border border-slate-200/90 ring-black/10'
                              : 'bg-card text-foreground border border-border/80 ring-border/20',
                          )}
                          style={{
                            fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif',
                            fontSize: `${(11.5 * zoomLevel) / 100}pt`,
                            lineHeight: '1.85',
                            padding: 'clamp(1.25rem, 4vw, 1in)',
                            boxSizing: 'border-box',
                            position: 'relative',
                            color: paperMode === 'paper' ? '#0f172a' : undefined,
                          }}
                        >
                          {isCover ? (
                            <div className="flex-1 flex flex-col justify-between py-2 text-center">
                              {/* Top: Title */}
                              <div className="my-auto pt-6">
                                {titleLines.map((line) => (
                                  <h1
                                    key={line.id}
                                    className={cn(
                                      'text-center font-bold text-lg sm:text-xl md:text-2xl tracking-tight uppercase max-w-2xl mx-auto my-4',
                                      paperMode === 'paper' ? 'text-slate-950' : 'text-foreground',
                                    )}
                                  >
                                    {renderLineFragments(line)}
                                  </h1>
                                ))}
                              </div>

                              {/* Middle: Byline & Authors */}
                              <div className="my-auto py-8">
                                {authorLines.map((line) => {
                                  if (line.type === 'cover-byline') {
                                    return (
                                      <p
                                        key={line.id}
                                        className={cn(
                                          'text-center text-xs sm:text-sm font-semibold uppercase tracking-widest my-3',
                                          paperMode === 'paper'
                                            ? 'text-slate-500'
                                            : 'text-muted-foreground',
                                        )}
                                      >
                                        {renderLineFragments(line)}
                                      </p>
                                    );
                                  }
                                  return (
                                    <p
                                      key={line.id}
                                      className={cn(
                                        'text-center font-semibold text-sm sm:text-base my-0.5 leading-snug',
                                        paperMode === 'paper'
                                          ? 'text-slate-800'
                                          : 'text-foreground',
                                      )}
                                    >
                                      {renderLineFragments(line)}
                                    </p>
                                  );
                                })}
                              </div>

                              {/* Bottom: Affiliation & Fulfillment */}
                              <div className="my-auto pb-4">
                                {affiliationLines.map((line) => {
                                  if (line.type === 'cover-affiliation') {
                                    return (
                                      <p
                                        key={line.id}
                                        className={cn(
                                          'text-center font-medium text-xs sm:text-sm my-1 max-w-xl mx-auto leading-relaxed',
                                          paperMode === 'paper'
                                            ? 'text-slate-700'
                                            : 'text-foreground',
                                        )}
                                      >
                                        {renderLineFragments(line)}
                                      </p>
                                    );
                                  }
                                  if (line.type === 'cover-fulfillment') {
                                    return (
                                      <p
                                        key={line.id}
                                        className={cn(
                                          'text-center text-xs sm:text-sm italic my-1 max-w-md mx-auto leading-relaxed',
                                          paperMode === 'paper'
                                            ? 'text-slate-600'
                                            : 'text-muted-foreground',
                                        )}
                                      >
                                        {renderLineFragments(line)}
                                      </p>
                                    );
                                  }
                                  return (
                                    <p
                                      key={line.id}
                                      className={cn(
                                        'text-center text-xs font-medium my-3',
                                        paperMode === 'paper'
                                          ? 'text-slate-500'
                                          : 'text-muted-foreground',
                                      )}
                                    >
                                      {renderLineFragments(line)}
                                    </p>
                                  );
                                })}
                                {otherCoverLines.map((line) => (
                                  <p key={line.id} className="text-center text-xs my-1">
                                    {renderLineFragments(line)}
                                  </p>
                                ))}
                              </div>
                            </div>
                          ) : isApproval ? (
                            <div className="flex-1 flex flex-col justify-start py-2">
                              {page.lines.map((line) => {
                                if (
                                  line.type === 'approval-heading' ||
                                  /^APPROVAL SHEET$/i.test(line.text)
                                ) {
                                  return (
                                    <h2
                                      key={line.id}
                                      className={cn(
                                        'text-center font-bold text-base sm:text-lg uppercase tracking-wider mb-8 pb-3 border-b',
                                        paperMode === 'paper'
                                          ? 'text-slate-950 border-slate-200'
                                          : 'text-foreground border-border/40',
                                      )}
                                    >
                                      {renderLineFragments(line)}
                                    </h2>
                                  );
                                }
                                if (
                                  line.type === 'approval-body' ||
                                  /^This capstone/i.test(line.text)
                                ) {
                                  return (
                                    <p
                                      key={line.id}
                                      className={cn(
                                        'text-justify mb-10 indent-8 leading-[1.85] text-sm sm:text-base',
                                        paperMode === 'paper'
                                          ? 'text-slate-800'
                                          : 'text-foreground',
                                      )}
                                    >
                                      {renderLineFragments(line)}
                                    </p>
                                  );
                                }
                                if (line.type === 'approval-name') {
                                  return (
                                    <div key={line.id} className="text-center my-2">
                                      <p className="font-bold underline text-sm sm:text-base tracking-wide">
                                        {renderLineFragments(line)}
                                      </p>
                                    </div>
                                  );
                                }
                                if (line.type === 'approval-role') {
                                  return (
                                    <div key={line.id} className="text-center mb-6">
                                      <p className="text-xs text-muted-foreground italic">
                                        {renderLineFragments(line)}
                                      </p>
                                    </div>
                                  );
                                }
                                return (
                                  <p key={line.id} className="mb-4 text-justify indent-6">
                                    {renderLineFragments(line)}
                                  </p>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex-1 flex flex-col justify-start">
                              {page.lines.map((line) => {
                                let Tag = 'p';
                                let lineClass =
                                  'text-left sm:text-justify mb-4 indent-8 leading-[1.85]';

                                if (line.type === 'section-heading') {
                                  Tag = 'h2';
                                  lineClass = cn(
                                    'text-center font-bold text-base sm:text-lg uppercase tracking-wider mt-4 mb-6 pt-2',
                                    paperMode === 'paper' ? 'text-slate-950' : 'text-foreground',
                                  );
                                } else if (line.type === 'subheading') {
                                  Tag = 'h3';
                                  lineClass = cn(
                                    'text-left font-bold text-sm sm:text-base mt-6 mb-3',
                                    paperMode === 'paper' ? 'text-slate-900' : 'text-foreground',
                                  );
                                }

                                return (
                                  <Tag key={line.id} className={lineClass}>
                                    {renderLineFragments(line)}
                                  </Tag>
                                );
                              })}
                            </div>
                          )}

                          {/* Paper Page Footer Stamp */}
                          <div
                            className={cn(
                              'mt-auto pt-4 text-center text-[10px] font-mono select-none border-t',
                              paperMode === 'paper'
                                ? 'text-slate-400 border-slate-100'
                                : 'text-muted-foreground border-border/30',
                            )}
                          >
                            Page {page.pageNumber} of {pages.length}
                          </div>
                        </section>
                      );
                    })}
                  </article>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
                    <FileText className="mb-3 h-12 w-12 opacity-30" />
                    <p className="text-sm font-semibold text-foreground">
                      No extracted text available
                    </p>
                    <p className="mt-1 text-xs">
                      The document text could not be extracted for visual analysis.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sources sidebar */}
          <aside
            className="flex flex-col border-l border-border/60 bg-card overflow-hidden"
            style={{ maxHeight: '78vh', minHeight: '300px' }}
          >
            {/* Sidebar header */}
            <div className="flex flex-col gap-2.5 border-b border-border/60 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Match Overview</h3>
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {sources.length} {sources.length === 1 ? 'source' : 'sources'}
                </span>
              </div>

              {/* Source search filter */}
              {sources.length > 2 && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filter sources by title..."
                    value={sourceSearch}
                    onChange={(e) => setSourceSearch(e.target.value)}
                    className="w-full rounded-md border border-border/60 bg-muted/40 pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}
            </div>

            {/* Active source detail panel with contextual score breakdown */}
            {activeSource &&
              activeHighlight &&
              (() => {
                const signal = SIGNAL_CONFIG[activeSource.contextSignal] || SIGNAL_CONFIG.mixed;
                const winnowPct =
                  activeSource.winnowScore !== null
                    ? Math.round(activeSource.winnowScore * 100)
                    : null;
                const semanticPct =
                  activeSource.semanticScore !== null
                    ? Math.round(activeSource.semanticScore * 100)
                    : null;
                const blendedPct = Math.round(activeSource.similarityPercentage);
                const detailStatus = getSimilarityStatus(blendedPct);

                return (
                  <div className="border-b border-border/60 bg-muted/30">
                    {/* Panel header */}
                    <div className="flex items-start justify-between gap-2 p-3.5 pb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border text-[10px] font-bold"
                            style={activeSource.palette.badgeStyle}
                          >
                            {activeSource.sourceNumber}
                          </span>
                          <p className="line-clamp-1 text-sm font-semibold text-foreground">
                            {activeSource.sourceTitle}
                          </p>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                              signal.className,
                            )}
                          >
                            {signal.label}
                          </span>
                          <span className={cn('text-[11px] font-semibold', detailStatus.textClass)}>
                            {blendedPct}% blended
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveHighlightKey(null)}
                        className="h-6 w-6 shrink-0 rounded-md text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
                        aria-label="Close detail"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Score breakdown bars */}
                    <div className="px-3.5 pb-2.5 space-y-1.5">
                      {/* Blended */}
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="w-16 shrink-0 text-muted-foreground">Blended</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${blendedPct}%`, backgroundColor: detailStatus.color }}
                          />
                        </div>
                        <span
                          className={cn(
                            'w-7 shrink-0 text-right font-mono font-semibold',
                            detailStatus.textClass,
                          )}
                        >
                          {blendedPct}%
                        </span>
                      </div>
                      {/* Exact Overlap */}
                      {winnowPct !== null && (
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="w-16 shrink-0 text-muted-foreground">Exact</span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-amber-500 transition-all"
                              style={{ width: `${winnowPct}%` }}
                            />
                          </div>
                          <span className="w-7 shrink-0 text-right font-mono text-muted-foreground">
                            {winnowPct}%
                          </span>
                        </div>
                      )}
                      {/* Semantic */}
                      {semanticPct !== null && (
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="w-16 shrink-0 text-muted-foreground">Semantic</span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all"
                              style={{ width: `${semanticPct}%` }}
                            />
                          </div>
                          <span className="w-7 shrink-0 text-right font-mono text-muted-foreground">
                            {semanticPct}%
                          </span>
                        </div>
                      )}

                      {/* Contextual explanation */}
                      {activeSource.contextSignal === 'paraphrase' && (
                        <p className="text-[9px] leading-snug text-violet-600 dark:text-violet-400 italic mt-0.5">
                          High semantic overlap detected with low verbatim copying — possible
                          paraphrase.
                        </p>
                      )}
                      {activeSource.contextSignal === 'verbatim' && (
                        <p className="text-[9px] leading-snug text-rose-600 dark:text-rose-400 italic mt-0.5">
                          Exact literal copying detected via n-gram fingerprinting.
                        </p>
                      )}
                    </div>

                    {/* Side-by-side text comparison */}
                    <div className="space-y-2 px-3.5 pb-3.5">
                      <div className="rounded-lg border border-border/60 bg-card p-2.5 shadow-sm">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Your Manuscript Excerpt
                        </p>
                        <p className="text-xs leading-relaxed text-foreground font-serif">
                          {activeHighlight.matchedText || 'Text unavailable.'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-card p-2.5 shadow-sm">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Archive Source Match
                        </p>
                        <p className="text-xs leading-relaxed text-foreground font-serif">
                          {activeHighlight.sourceText || (
                            <span className="flex items-center gap-1.5 italic text-muted-foreground">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                              Source excerpt not available for this match.
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

            {/* Source list — scrollable flex-1 region */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
              {filteredSources.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-500/60" />
                  <p className="text-sm font-semibold text-foreground">
                    {sourceSearch ? 'No matching sources' : 'No matches found'}
                  </p>
                  <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
                    {sourceSearch
                      ? 'Try adjusting your search keywords.'
                      : 'This submission has no indexed plagiarism matches in the BukSU archive.'}
                  </p>
                </div>
              ) : (
                filteredSources.map((source) => (
                  <SourceRow
                    key={source.sourceId}
                    source={source}
                    isActive={source.sourceId === resolvedActiveSourceId}
                    onSelect={handleSourceSelect}
                  />
                ))
              )}
            </div>

            {/* Sidebar footer hint */}
            {sources.length > 0 && (
              <div className="border-t border-border/60 bg-muted/20 px-4 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                Click any source above to highlight its instances in the document canvas.
              </div>
            )}
          </aside>
        </div>

        {/* ── Sophisticated Document Viewer Integration ── */}
        {(submission || viewerSubmission) && (
          <SophisticatedDocumentViewer
            open={viewerOpen}
            onOpenChange={setViewerOpen}
            isPlagiarismReport={true}
            hideIdentity={true}
            showRevisionDiff={false}
            showComments={false}
            submission={viewerSubmission}
            file={effectiveFile}
            fileUrl={submission?._id ? `/api/submissions/${submission._id}/file` : null}
            fileName={submissionFileName}
            initialViewMode="manuscript"
            plagiarismMatches={
              allHighlights.length > 0
                ? allHighlights
                : payload?.matches || payload?.fullReport?.matches || []
            }
            activeHighlightId={activeHighlightKey || resolvedActiveSourceId}
            onHighlightClick={(h) => {
              const targetId = h.meta?.matchedSourceId || h.sourceId;
              if (targetId) {
                handleSourceSelect(targetId);
              }
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

export default PlagiarismReportPage;
