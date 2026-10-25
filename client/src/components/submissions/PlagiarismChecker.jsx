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
import { usePlagiarismScanStore } from '@/stores/plagiarismScanStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Progress } from '@/components/ui/Progress';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Play,
  FileText,
  Brain,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Zap,
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
  if (percentage < 15) return 'text-success-foreground'; // Low similarity
  if (percentage < 30) return 'text-warning-foreground'; // Medium
  if (percentage < 50) return 'text-chart-6'; // High
  return 'text-destructive-text'; // Very high
};

/**
 * Background color for similarity card
 * @param {number} percentage
 * @returns {string}
 */
const getSimilarityBg = (percentage) => {
  if (percentage < 15) return 'bg-success/10 border-success/25 text-success-foreground';
  if (percentage < 30) return 'bg-warning/10 border-warning/30 text-warning-foreground';
  if (percentage < 50) return 'bg-chart-6/10 border-chart-6/25 text-foreground';
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
      usePlagiarismScanStore.getState().startSubmissionScan({
        submissionId,
        title: submissionTitle,
      });
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
      if (usePlagiarismScanStore.getState().submissionId === submissionId) {
        usePlagiarismScanStore.getState().completeSubmissionScan({
          submissionId,
          title: submissionTitle,
          result: plagiarismResult,
        });
      }
      onCheckComplete?.(plagiarismResult);
    }
  }, [
    status,
    plagiarismResult,
    onCheckComplete,
    startPolling,
    stopPolling,
    submissionId,
    submissionTitle,
  ]);

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
    <Card className="rounded-xl p-5 mb-6 shadow-xs text-card-foreground">
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
        <Card
          className={cn(
            'rounded-lg p-3 text-sm shadow-none',
            getSimilarityBg(similarityPercentage),
          )}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm font-medium">
              Originality: <strong>{originalityScore?.toFixed(1) ?? '—'}%</strong>
              <span className="ml-2 text-muted-foreground">
                ({similarityPercentage.toFixed(1)}% similarity)
              </span>
            </p>
            {warningFlag && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive-text">
                <AlertTriangle className="h-3.5 w-3.5" />
                Warning: High Similarity
              </span>
            )}
          </div>
        </Card>
      )}

      {!isExpanded && hasFailed && (
        <Alert variant="destructive" className="p-3 pl-10">
          <AlertDescription className="text-sm">
            Plagiarism check failed: <strong>{failureMessage}</strong>
          </AlertDescription>
        </Alert>
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
                    <Spinner className="h-4 w-4" aria-hidden="true" />
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
                className="w-full gap-2 border-warning/30 text-warning-foreground hover:bg-warning/10"
                title={
                  canSettleWithMock
                    ? 'Settle now using a temporary mock originality score'
                    : 'Only advisers/instructors can settle with mock score'
                }
              >
                <Zap className="h-4 w-4 text-warning" />
                <span>Settle With Mock Score</span>
              </Button>
            </div>
          )}

          {/* Processing State (Quiet Micro-Indicator) */}
          {isProcessing && (
            <Alert variant="info" className="flex items-center gap-3 p-3.5 pl-10 text-foreground">
              <Spinner className="h-4 w-4 shrink-0" aria-hidden="true" />
              <AlertDescription className="text-xs sm:text-sm text-muted-foreground">
                {status === 'queued'
                  ? 'Plagiarism check queued. Waiting for worker assignment...'
                  : 'Analyzing submission with Winnowing n-grams and dense vector embeddings...'}
              </AlertDescription>
            </Alert>
          )}

          {/* Failed State */}
          {hasFailed && (
            <Alert variant="destructive" className="p-3.5 pl-10">
              <AlertTitle className="text-sm font-semibold">Plagiarism check failed</AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground">
                {failureMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Template Resources Banner */}
          {(proposalTemplateUrl || admTemplateUrl) && (
            <Card className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 p-2.5 shadow-none">
              <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span>Department Document Templates:</span>
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {proposalTemplateUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="min-h-[44px] gap-1 text-xs"
                  >
                    <a href={proposalTemplateUrl} target="_blank" rel="noopener noreferrer">
                      <span>Proposal Manuscript Template</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                )}
                {admTemplateUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="min-h-[44px] gap-1 text-xs"
                  >
                    <a href={admTemplateUrl} target="_blank" rel="noopener noreferrer">
                      <span>Action Done Matrix (ADM)</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Dual-Pipeline Tabs: Exact Similarity (Winnowing) vs Semantic Plagiarism (PyTorch) */}
          {hasResult && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
              <TabsList className="h-auto w-full flex-wrap justify-start overflow-visible rounded-none border-b border-border/70 bg-transparent p-0">
                <TabsTrigger
                  value="similarity"
                  className="min-h-[44px] min-w-0 flex-1 whitespace-normal rounded-none px-2 text-center text-xs"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Exact Text Similarity (Winnowing)</span>
                </TabsTrigger>
                <TabsTrigger
                  value="plagiarism"
                  className="min-h-[44px] min-w-0 flex-1 whitespace-normal rounded-none px-2 text-center text-xs"
                >
                  <Brain className="h-3.5 w-3.5" />
                  <span>Semantic Plagiarism (Vector Embeddings)</span>
                </TabsTrigger>
              </TabsList>

              {/* Result Display */}
              <TabsContent value={activeTab} className="!mt-0 !space-y-0">
                <Card
                  className={cn(
                    'rounded-xl p-4 shadow-none',
                    getSimilarityBg(similarityPercentage),
                  )}
                >
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
                    <Progress
                      value={similarityPercentage}
                      max={100}
                      aria-label="Similarity percentage"
                      className="h-1.5 bg-muted/60"
                      indicatorClassName={cn(
                        similarityPercentage < 15
                          ? 'bg-success'
                          : similarityPercentage < 30
                            ? 'bg-warning'
                            : similarityPercentage < 50
                              ? 'bg-chart-6'
                              : 'bg-destructive',
                      )}
                    />

                    {/* Guideline Text */}
                    <div className="text-xs text-muted-foreground font-medium mt-2 flex items-center gap-1.5">
                      {similarityPercentage < 15 && (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          <span>
                            Low similarity — conforms to institutional originality standards
                          </span>
                        </>
                      )}
                      {similarityPercentage >= 15 && similarityPercentage < 30 && (
                        <>
                          <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                          <span>Moderate similarity — adviser / panel review suggested</span>
                        </>
                      )}
                      {similarityPercentage >= 30 && similarityPercentage < 50 && (
                        <>
                          <AlertTriangle className="h-3.5 w-3.5 text-chart-6" />
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
                    <Alert variant="destructive" className="mb-4 p-3 pl-10">
                      <AlertTitle className="text-sm font-semibold text-destructive-text">
                        High Plagiarism Risk Detected
                      </AlertTitle>
                      <AlertDescription className="text-xs text-muted-foreground">
                        This submission exceeds the acceptable similarity threshold and may require
                        rejection or revision request.
                      </AlertDescription>
                    </Alert>
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
                    <p className="text-xs font-medium text-warning-foreground mt-2">
                      This result was generated in mock mode for temporary review unblock.
                    </p>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {/* Faculty Corpus Controls */}
          {canManageCorpus && (
            <Card className="space-y-2.5 rounded-xl bg-muted/20 p-3.5 shadow-none">
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
                    {corpusActionPending && <Spinner className="mr-1.5 h-3 w-3" />}
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
                    {corpusActionPending && <Spinner className="mr-1.5 h-3 w-3" />}
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
            </Card>
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
                    <Card
                      key={match.id}
                      className="rounded-lg bg-muted/40 p-2.5 shadow-none hover:border-border"
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
                    </Card>
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
            <Alert variant="success" className="p-3 pl-10">
              <AlertDescription className="text-xs font-medium sm:text-sm">
                No plagiarism detected. Submission appears to be original.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </Card>
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
