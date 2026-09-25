/**
 * PlagiarismChecker Component
 *
 * UI for displaying and triggering plagiarism analysis.
 * Used by advisers/instructors/panelists when reviewing submissions.
 *
 * Features:
 *  - Trigger plagiarism check
 *  - Poll for results
 *  - Display similarity percentage with color coding
 *  - Show matched sources/passages
 *  - Prevent approval until plagiarism check is complete
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { ROLES } from '@cms/shared';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Play,
  Sparkles,
  Loader2,
  FileText,
  Brain,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Zap,
  ShieldCheck,
  Database,
} from 'lucide-react';
import { buildTopSourceColorMap } from '../../hooks/useSubmissions';
const logger = console;

/**
 * @typedef {Object} PlagiarismMatch
 * @property {string} id
 * @property {string} title
 * @property {string} [url]
 * @property {string} [excerpt]
 * @property {number} similarity
 */

/**
 * @typedef {Object} PlagiarismResult
 * @property {PlagiarismMatch[]} [matchedSources]
 * @property {PlagiarismMatch[]} [text_matches]
 * @property {number} [originalityScore]
 * @property {number} [similarity_percentage]
 * @property {'queued'|'processing'|'pending'|'completed'|'failed'} status
 * @property {string} [processedAt]
 * @property {boolean} [warning_flag]
 */

const clampPercentage = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(100, parsed));
};

const normalizeStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (['queued', 'processing', 'pending', 'completed', 'failed'].includes(normalized)) {
    return normalized;
  }
  return null;
};

const inferCorpusState = (resultPayload) => {
  const explicitCorpus =
    resultPayload?.corpus && typeof resultPayload.corpus === 'object' ? resultPayload.corpus : null;

  const reportSource = resultPayload?.fullReport ?? resultPayload;
  const report =
    reportSource && typeof reportSource === 'object'
      ? reportSource.rawData && typeof reportSource.rawData === 'object'
        ? reportSource.rawData
        : reportSource
      : null;

  const indexedAt = explicitCorpus?.indexedAt || report?.indexedAt || null;
  const removedFromCorpusAt =
    explicitCorpus?.removedFromCorpusAt || report?.removedFromCorpusAt || null;
  const indexedAtTs = indexedAt ? Date.parse(indexedAt) : NaN;
  const removedAtTs = removedFromCorpusAt ? Date.parse(removedFromCorpusAt) : NaN;

  let isIndexed = false;
  if (indexedAt && !removedFromCorpusAt) {
    isIndexed = true;
  } else if (indexedAt && removedFromCorpusAt) {
    if (!Number.isNaN(indexedAtTs) && !Number.isNaN(removedAtTs)) {
      isIndexed = indexedAtTs > removedAtTs;
    }
  }

  return {
    indexedAt,
    removedFromCorpusAt,
    isIndexed,
    known:
      typeof explicitCorpus?.known === 'boolean'
        ? explicitCorpus.known
        : Boolean(indexedAt || removedFromCorpusAt),
  };
};

const parseApiError = async (response, fallbackMessage) => {
  try {
    const payload = await response.json();
    return payload?.error?.message || payload?.message || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
};

const toSourceKey = (source = {}, fallbackIndex = 0) => {
  const candidate = source.id || source.documentId || source.submissionId || source.title;
  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  if (Number.isFinite(candidate)) return String(candidate);
  return `source-${fallbackIndex}`;
};

/**
 * Color-coded similarity indicator
 * @param {number} percentage
 * @returns {string}
 */
const getSimilarityColor = (percentage) => {
  if (percentage < 15) return 'text-emerald-600 dark:text-emerald-400'; // Low similarity
  if (percentage < 30) return 'text-amber-600 dark:text-amber-400'; // Medium
  if (percentage < 50) return 'text-orange-600 dark:text-orange-400'; // High
  return 'text-destructive'; // Very high
};

/**
 * Background color for similarity card
 * @param {number} percentage
 * @returns {string}
 */
const getSimilarityBg = (percentage) => {
  if (percentage < 15)
    return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-200';
  if (percentage < 30)
    return 'bg-amber-500/10 border-amber-500/20 text-amber-950 dark:text-amber-200';
  if (percentage < 50)
    return 'bg-orange-500/10 border-orange-500/20 text-orange-950 dark:text-orange-200';
  return 'bg-destructive/10 border-destructive/20 text-destructive-foreground';
};

/**
 * Main Component
 */
const PlagiarismChecker = ({
  submissionId,
  submissionTitle,
  onCheckComplete,
  onCheckStart,
  disabled = false,
  showMatchDetails = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('similarity');
  const [corpusActionError, setCorpusActionError] = useState('');
  const pollingRef = useRef(null);
  const userRole = useAuthStore((state) => state.user?.role);
  const {
    plagiarismWarningThreshold = 15,
    plagiarismRejectThreshold = 25,
    getTemplateUrl,
    fetchSettings,
  } = useSettingsStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const proposalTemplateUrl = getTemplateUrl('proposal_template');
  const admTemplateUrl = getTemplateUrl('adm_form');

  const canManageCorpus =
    userRole === ROLES.ADVISER || userRole === ROLES.FACULTY || userRole === ROLES.INSTRUCTOR;
  const canSettleWithMock = canManageCorpus;

  // ───────────────────────────────────────────────────────────────────────
  // Fetch Current Plagiarism Result
  // ───────────────────────────────────────────────────────────────────────

  const {
    data: plagiarismResult,
    isLoading: _isLoadingResult,
    refetch: refetchResult,
  } = useQuery({
    queryKey: ['plagiarism', submissionId],
    queryFn: async () => {
      const response = await fetch(`/api/submissions/${submissionId}/plagiarism/result`);
      if (!response.ok) {
        throw new Error(await parseApiError(response, 'Failed to fetch plagiarism result'));
      }
      const payload = await response.json();
      return payload?.data || payload;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: false, // Manual polling
  });

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;

    pollingRef.current = setInterval(() => {
      refetchResult();
    }, 2000);
  }, [refetchResult]);

  const stopPolling = useCallback(() => {
    if (!pollingRef.current) return;
    clearInterval(pollingRef.current);
    pollingRef.current = null;
  }, []);

  // ───────────────────────────────────────────────────────────────────────
  // Trigger Plagiarism Check
  // ───────────────────────────────────────────────────────────────────────

  const { mutate: triggerCheck, isPending: isChecking } = useMutation({
    mutationFn: async (payload) => {
      const response = await fetch(`/api/submissions/${submissionId}/plagiarism/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, 'Failed to start plagiarism check'));
      }
      return response.json();
    },
    onSuccess: () => {
      logger.info(`Plagiarism check started for submission: ${submissionId}`);
      onCheckStart?.();
      startPolling();
    },
    onError: (error) => {
      logger.error(`Error starting plagiarism check: ${error.message}`);
    },
  });

  const { mutate: addToCorpus, isPending: isAddingToCorpus } = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/submissions/${submissionId}/plagiarism/index`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, 'Failed to add submission to corpus'));
      }

      return response.json();
    },
    onSuccess: async () => {
      setCorpusActionError('');
      await refetchResult();
    },
    onError: (error) => {
      setCorpusActionError(error.message || 'Failed to add submission to corpus');
    },
  });

  const { mutate: removeFromCorpus, isPending: isRemovingFromCorpus } = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/submissions/${submissionId}/plagiarism/index`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, 'Failed to remove submission from corpus'));
      }

      return response.json();
    },
    onSuccess: async () => {
      setCorpusActionError('');
      await refetchResult();
    },
    onError: (error) => {
      setCorpusActionError(error.message || 'Failed to remove submission from corpus');
    },
  });

  // ───────────────────────────────────────────────────────────────────────
  // Handle Check Complete
  // ───────────────────────────────────────────────────────────────────────

  const status = normalizeStatus(plagiarismResult?.status);

  useEffect(() => {
    if (status === 'queued' || status === 'processing' || status === 'pending') {
      startPolling();
    }

    if (status === 'completed' || status === 'failed') {
      stopPolling();
    }

    if (status === 'completed') {
      onCheckComplete?.(plagiarismResult);
    }
  }, [status, plagiarismResult, onCheckComplete, startPolling, stopPolling]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // ───────────────────────────────────────────────────────────────────────
  // Handlers
  // ───────────────────────────────────────────────────────────────────────

  const handleTriggerCheck = async () => {
    const detectedTitle =
      typeof plagiarismResult?.detectedTitle === 'string' ? plagiarismResult.detectedTitle : '';
    const detectedAbstract =
      typeof plagiarismResult?.detectedAbstract === 'string'
        ? plagiarismResult.detectedAbstract
        : '';

    triggerCheck({
      title: detectedTitle || submissionTitle || undefined,
      abstract: detectedAbstract || undefined,
    });
  };

  const handleSettleWithMock = async () => {
    const detectedTitle =
      typeof plagiarismResult?.detectedTitle === 'string' ? plagiarismResult.detectedTitle : '';
    const detectedAbstract =
      typeof plagiarismResult?.detectedAbstract === 'string'
        ? plagiarismResult.detectedAbstract
        : '';

    triggerCheck({
      title: detectedTitle || submissionTitle || undefined,
      abstract: detectedAbstract || undefined,
      mode: 'mock',
    });
  };

  // ───────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────

  const hasResult = status === 'completed';
  const hasFailed = status === 'failed';
  const isProcessing = isChecking || ['queued', 'processing', 'pending'].includes(status);
  const rawMode =
    plagiarismResult?.mode ||
    plagiarismResult?.fullReport?.mode ||
    plagiarismResult?.fullReport?.rawData?.mode ||
    null;
  const isMockResult = String(rawMode || '')
    .toLowerCase()
    .startsWith('mock');

  const directOriginality = clampPercentage(plagiarismResult?.originalityScore);
  const legacySimilarity = clampPercentage(plagiarismResult?.similarity_percentage);

  const originalityScore =
    directOriginality ??
    (legacySimilarity === null ? null : clampPercentage(100 - legacySimilarity));

  const similarityPercentage =
    originalityScore === null
      ? legacySimilarity || 0
      : clampPercentage(100 - originalityScore) || 0;

  const rawMatches = Array.isArray(plagiarismResult?.matchedSources)
    ? plagiarismResult.matchedSources
    : Array.isArray(plagiarismResult?.text_matches)
      ? plagiarismResult.text_matches
      : [];

  const textMatches = rawMatches.filter(Boolean).map((match, idx) => ({
    id: match.id || match.documentId || match.submissionId || `match-${idx}`,
    title: match.title || 'Untitled source',
    sourceKey: toSourceKey(match, idx),
    url: match.url || '',
    excerpt: match.excerpt || match.sourceSnippet || '',
    similarity: clampPercentage(match.similarity ?? match.matchPercentage) || 0,
  }));

  const paletteInput = textMatches.map((match) => ({
    id: match.sourceKey,
    similarity_score: (match.similarity || 0) / 100,
    source_metadata: {
      title: match.title,
      document_id: match.sourceKey,
    },
  }));

  const { sourceMap } = buildTopSourceColorMap(paletteInput, 10);

  const colorizedMatches = textMatches.map((match, index) => {
    const sourceStyle = sourceMap.get(match.sourceKey);
    return {
      ...match,
      sourceNumber: sourceStyle?.sourceNumber ?? index + 1,
      badgeClass: sourceStyle?.badgeClass || 'border-border bg-muted text-muted-foreground',
    };
  });

  const matchCount = Number(colorizedMatches?.length ?? 0);
  const warningFlag = Boolean(plagiarismResult?.warning_flag ?? plagiarismResult?.warningFlag);
  const checkedAt = plagiarismResult?.processedAt || plagiarismResult?.checked_at;
  const failureMessage = plagiarismResult?.error || 'Plagiarism check failed. Please try again.';
  const corpusState = inferCorpusState(plagiarismResult);
  const isIndexedInCorpus = corpusState.isIndexed;
  const isCorpusStateKnown = corpusState.known;
  const corpusActionPending = isAddingToCorpus || isRemovingFromCorpus;

  const handleAddToCorpus = useCallback(() => {
    setCorpusActionError('');
    addToCorpus();
  }, [addToCorpus]);

  const handleRemoveFromCorpus = useCallback(() => {
    setCorpusActionError('');
    removeFromCorpus();
  }, [removeFromCorpus]);

  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 mb-6 shadow-xs text-card-foreground">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 text-base sm:text-lg font-semibold text-foreground">
            <Search className="h-5 w-5 text-primary" />
            <span>Plagiarism Analysis</span>
          </div>
          {hasResult && (
            <Badge
              variant="outline"
              className={cn('font-bold text-xs', getSimilarityColor(similarityPercentage))}
            >
              {similarityPercentage.toFixed(1)}% Similarity
            </Badge>
          )}
          {hasResult && isMockResult && (
            <Badge variant="warning" className="text-[10px] font-semibold uppercase tracking-wider">
              Mock Result
            </Badge>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-1.5 text-xs font-medium"
          disabled={disabled}
        >
          {isExpanded ? (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              <span>Collapse</span>
            </>
          ) : (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <span>Expand</span>
            </>
          )}
        </Button>
      </div>

      {/* Collapsed Summary */}
      {!isExpanded && hasResult && (
        <div className={cn('p-3 rounded-lg border text-sm', getSimilarityBg(similarityPercentage))}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm font-medium">
              Originality: <strong>{originalityScore?.toFixed(1) ?? '—'}%</strong>
              <span className="ml-2 text-muted-foreground">
                ({similarityPercentage.toFixed(1)}% similarity)
              </span>
            </p>
            {warningFlag && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                Warning: High Similarity
              </span>
            )}
          </div>
        </div>
      )}

      {!isExpanded && hasFailed && (
        <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive-foreground">
          <p className="text-sm">
            Plagiarism check failed: <strong>{failureMessage}</strong>
          </p>
        </div>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Action Button */}
          {!hasResult && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                onClick={handleTriggerCheck}
                disabled={disabled || isChecking || isProcessing}
                className="w-full gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Checking Manuscript...</span>
                  </>
                ) : hasFailed ? (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    <span>Retry Plagiarism Check</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Start Plagiarism Check</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleSettleWithMock}
                disabled={disabled || isChecking || !canSettleWithMock}
                className="w-full gap-2 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                title={
                  canSettleWithMock
                    ? 'Settle now using a temporary mock originality score'
                    : 'Only advisers/instructors can settle with mock score'
                }
              >
                <Zap className="h-4 w-4 text-amber-500" />
                <span>Settle With Mock Score</span>
              </Button>
            </div>
          )}

          {/* Processing State (Quiet Micro-Indicator) */}
          {isProcessing && (
            <div className="flex items-center gap-3 p-3.5 rounded-lg bg-primary/5 border border-primary/20 text-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              <p className="text-xs sm:text-sm text-muted-foreground">
                {status === 'queued'
                  ? 'Plagiarism check queued. Waiting for worker assignment...'
                  : 'Analyzing submission with Winnowing n-grams and dense vector embeddings...'}
              </p>
            </div>
          )}

          {/* Failed State */}
          {hasFailed && (
            <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive-foreground">
              <p className="text-sm font-semibold">Plagiarism check failed</p>
              <p className="text-xs text-muted-foreground mt-1">{failureMessage}</p>
            </div>
          )}

          {/* Template Resources Banner */}
          {(proposalTemplateUrl || admTemplateUrl) && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/60">
              <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span>Department Document Templates:</span>
              </span>
              <div className="flex items-center gap-2">
                {proposalTemplateUrl && (
                  <a
                    href={proposalTemplateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline bg-background px-2 py-1 rounded border border-border/70"
                  >
                    <span>Proposal Manuscript Template</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {admTemplateUrl && (
                  <a
                    href={admTemplateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline bg-background px-2 py-1 rounded border border-border/70"
                  >
                    <span>Action Done Matrix (ADM)</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Dual-Pipeline Tabs: Exact Similarity (Winnowing) vs Semantic Plagiarism (PyTorch) */}
          {hasResult && (
            <div className="flex border-b border-border/70 mb-3 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('similarity')}
                className={cn(
                  'flex items-center gap-1.5 py-2 px-3 text-xs font-semibold border-b-2 transition-colors',
                  activeTab === 'similarity'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Exact Text Similarity (Winnowing)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('plagiarism')}
                className={cn(
                  'flex items-center gap-1.5 py-2 px-3 text-xs font-semibold border-b-2 transition-colors',
                  activeTab === 'plagiarism'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <Brain className="h-3.5 w-3.5" />
                <span>Semantic Plagiarism (Vector Embeddings)</span>
              </button>
            </div>
          )}

          {/* Result Display */}
          {hasResult && (
            <div className={cn('p-4 rounded-xl border', getSimilarityBg(similarityPercentage))}>
              {/* Similarity Percentage */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-foreground">
                    {activeTab === 'similarity'
                      ? 'Exact Text Overlap Index'
                      : 'Semantic Neural Originality Score'}
                  </span>
                  <span
                    className={cn(
                      'text-2xl font-bold tracking-tight',
                      getSimilarityColor(similarityPercentage),
                    )}
                  >
                    {originalityScore?.toFixed(1) ?? '—'}%
                  </span>
                </div>

                <p className="text-xs text-muted-foreground font-medium mb-2">
                  {activeTab === 'similarity'
                    ? `Syntactic exact text overlap: ${similarityPercentage.toFixed(1)}% (Threshold: ${plagiarismWarningThreshold}%)`
                    : `Dense vector cosine similarity: ${similarityPercentage.toFixed(1)}% (Reject cutoff: ${plagiarismRejectThreshold}%)`}
                </p>

                {/* Progress Bar (Subtle & Slim) */}
                <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all duration-300',
                      similarityPercentage < 15
                        ? 'bg-emerald-500'
                        : similarityPercentage < 30
                          ? 'bg-amber-500'
                          : similarityPercentage < 50
                            ? 'bg-orange-500'
                            : 'bg-destructive',
                    )}
                    style={{ width: `${Math.min(similarityPercentage, 100)}%` }}
                  />
                </div>

                {/* Guideline Text */}
                <div className="text-xs text-muted-foreground font-medium mt-2 flex items-center gap-1.5">
                  {similarityPercentage < 15 && (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Low similarity — conforms to institutional originality standards</span>
                    </>
                  )}
                  {similarityPercentage >= 15 && similarityPercentage < 30 && (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      <span>Moderate similarity — adviser / panel review suggested</span>
                    </>
                  )}
                  {similarityPercentage >= 30 && similarityPercentage < 50 && (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                      <span>High similarity — careful manuscript inspection needed</span>
                    </>
                  )}
                  {similarityPercentage >= 50 && (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                      <span>Very high similarity — potential plagiarism detected</span>
                    </>
                  )}
                </div>
              </div>

              {/* Warning Flag */}
              {warningFlag && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg mb-4 flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-destructive">
                      High Plagiarism Risk Detected
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      This submission exceeds the acceptable similarity threshold and may require
                      rejection or revision request.
                    </p>
                  </div>
                </div>
              )}

              {colorizedMatches.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {colorizedMatches.slice(0, 5).map((match) => (
                    <span
                      key={`chip-${match.sourceKey}`}
                      className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-card px-2 py-0.5 text-xs text-card-foreground shadow-2xs"
                    >
                      <span
                        className={cn(
                          'inline-flex h-4 min-w-4 items-center justify-center rounded border px-1 text-[10px] font-semibold',
                          match.badgeClass,
                        )}
                      >
                        {match.sourceNumber}
                      </span>
                      <span className="max-w-[10rem] truncate">{match.title}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Checked At */}
              {checkedAt && (
                <p className="text-xs text-muted-foreground">
                  Checked on {new Date(checkedAt).toLocaleString()}
                </p>
              )}

              {isMockResult && (
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mt-2">
                  This result was generated in mock mode for temporary review unblock.
                </p>
              )}
            </div>
          )}

          {/* Faculty Corpus Controls */}
          {canManageCorpus && (
            <div className="space-y-2.5 p-3.5 rounded-xl border border-border/70 bg-muted/20">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Corpus Management</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {isCorpusStateKnown && isIndexedInCorpus
                  ? 'This submission is currently part of the department plagiarism corpus.'
                  : isCorpusStateKnown
                    ? 'This submission is currently not indexed in the plagiarism corpus.'
                    : 'Corpus membership status is currently unknown. You can re-index it to refresh state.'}
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {isCorpusStateKnown && isIndexedInCorpus ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveFromCorpus}
                    disabled={corpusActionPending}
                    className="border-destructive/30 text-destructive hover:bg-destructive/10 text-xs"
                  >
                    {corpusActionPending && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                    <span>Remove from Corpus</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddToCorpus}
                    disabled={corpusActionPending}
                    className="border-primary/30 text-primary hover:bg-primary/10 text-xs"
                  >
                    {corpusActionPending && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                    <span>Add to Corpus</span>
                  </Button>
                )}
              </div>

              {corpusState.indexedAt && (
                <p className="text-xs text-muted-foreground">
                  Indexed at: {new Date(corpusState.indexedAt).toLocaleString()}
                </p>
              )}
              {corpusState.removedFromCorpusAt && (
                <p className="text-xs text-muted-foreground">
                  Removed from corpus at:{' '}
                  {new Date(corpusState.removedFromCorpusAt).toLocaleString()}
                </p>
              )}
              {corpusActionError && (
                <p className="text-xs font-medium text-destructive">{corpusActionError}</p>
              )}
            </div>
          )}

          {/* Matched Sources */}
          {hasResult && showMatchDetails && matchCount > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground text-sm">
                Matched Sources ({matchCount})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {colorizedMatches.slice(0, 5).map((match) => {
                  const matchSimilarity = Number(match?.similarity ?? 0);

                  return (
                    <div
                      key={match.id}
                      className="p-2.5 bg-muted/40 rounded-lg border border-border/60 hover:border-border transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={cn(
                              'inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 text-[10px] font-semibold',
                              match.badgeClass,
                            )}
                          >
                            {match.sourceNumber}
                          </span>
                          <a
                            href={match.url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs sm:text-sm font-medium text-primary hover:underline truncate"
                          >
                            {match.title}
                          </a>
                        </div>
                        <span className="text-xs font-bold text-foreground shrink-0">
                          {matchSimilarity.toFixed(1)}%
                        </span>
                      </div>
                      {match.excerpt && (
                        <p className="text-xs text-muted-foreground italic truncate">
                          &quot;{match.excerpt}&quot;
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              {matchCount > 5 && (
                <p className="text-xs text-muted-foreground">+{matchCount - 5} more matches</p>
              )}
            </div>
          )}

          {/* No Matches Message */}
          {hasResult && matchCount === 0 && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2 text-emerald-950 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <p className="text-xs sm:text-sm font-medium">
                No plagiarism detected. Submission appears to be original.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

PlagiarismChecker.propTypes = {
  submissionId: PropTypes.string.isRequired,
  submissionTitle: PropTypes.string.isRequired,
  onCheckComplete: PropTypes.func,
  onCheckStart: PropTypes.func,
  disabled: PropTypes.bool,
  showMatchDetails: PropTypes.bool,
};

export default React.memo(PlagiarismChecker);
