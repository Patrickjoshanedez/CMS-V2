import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import AnnotatedText from '@/components/plagiarism/AnnotatedText';
import SimilarityGauge from '@/components/plagiarism/SimilarityGauge';
import SourceDetail from '@/components/plagiarism/SourceDetail';
import SourceList from '@/components/plagiarism/SourceList';
import { getSourceColor, toPercent } from '@/utils/similarityColor';
import useResolvedSelection from '@/hooks/useResolvedSelection';

const TAB_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'lexical', label: 'Lexical' },
  { id: 'semantic', label: 'Semantic' },
];

function normalizeSourceId(value, fallbackIndex) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Number.isFinite(value)) return String(value);
  return `source-${fallbackIndex}`;
}

function normalizeText(value) {
  return typeof value === 'string' ? value : '';
}

function normalizeTextMatches(textMatches) {
  if (!Array.isArray(textMatches)) return [];

  return textMatches
    .flatMap((match, index) => {
      const sourceId = normalizeSourceId(
        match.sourceId ?? match.source_id ?? match.source_key,
        index,
      );
      const similarity = toPercent(
        match.similarity ??
          match.similarity_score ??
          match.similarityPercentage ??
          match.matchPercentage,
      );

      const fallbackSubmittedText = normalizeText(
        match.submittedText ?? match.submitted_text ?? match.matchedText ?? match.matched_text,
      );
      const fallbackMatchedText = normalizeText(
        match.sourceText ??
          match.source_text ??
          match.source_snippet ??
          match.matchedText ??
          match.matched_text,
      );

      const blockEntries = Array.isArray(match.matchedBlocks ?? match.matched_blocks)
        ? (match.matchedBlocks ?? match.matched_blocks)
        : null;

      if (blockEntries && blockEntries.length > 0) {
        return blockEntries
          .map((block, blockIndex) => {
            const startIndex = Number(
              block.studentStart ??
                block.startIndex ??
                block.start ??
                match.startIndex ??
                match.start_index,
            );
            const endIndex = Number(
              block.studentEnd ?? block.endIndex ?? block.end ?? match.endIndex ?? match.end_index,
            );

            if (
              !Number.isFinite(startIndex) ||
              !Number.isFinite(endIndex) ||
              endIndex <= startIndex
            ) {
              return null;
            }

            return {
              ...match,
              sourceId,
              startIndex,
              endIndex,
              similarity,
              submittedText: normalizeText(
                block.matchedText ?? block.submittedText ?? fallbackSubmittedText,
              ),
              matchedText: normalizeText(
                block.sourceText ?? block.matchedText ?? fallbackMatchedText,
              ),
              _blockIndex: blockIndex,
            };
          })
          .filter(Boolean);
      }

      const startIndex = Number(
        match.startIndex ?? match.start_index ?? match.studentStart ?? match.start,
      );
      const endIndex = Number(match.endIndex ?? match.end_index ?? match.studentEnd ?? match.end);

      if (!Number.isFinite(startIndex) || !Number.isFinite(endIndex) || endIndex <= startIndex) {
        return [];
      }

      return {
        ...match,
        sourceId,
        startIndex,
        endIndex,
        similarity,
        submittedText: fallbackSubmittedText,
        matchedText: fallbackMatchedText,
      };
    })
    .filter(Boolean);
}

function normalizeSourceEntries(rawSources, textMatches) {
  const sourceMatchesCount = new Map();

  for (const match of textMatches) {
    sourceMatchesCount.set(match.sourceId, (sourceMatchesCount.get(match.sourceId) || 0) + 1);
  }

  const baseSources = Array.isArray(rawSources)
    ? rawSources.map((source, index) => {
        const sourceId = normalizeSourceId(
          source._id ?? source.id ?? source.sourceId ?? source.source_id ?? source.submissionId,
          index,
        );

        const lexical = toPercent(source.similarity ?? source.lexicalScore ?? source.winnowScore);
        const semantic = toPercent(
          source.semanticSimilarity ?? source.semantic_similarity ?? source.semanticScore,
        );

        return {
          ...source,
          _sourceId: sourceId,
          title:
            normalizeText(source.title ?? source.projectTitle ?? source.sourceTitle) ||
            `Source ${index + 1}`,
          authors: Array.isArray(source.authors) ? source.authors : [],
          year: source.year || 'N/A',
          similarity: lexical,
          semanticSimilarity: semantic,
          finalScore: toPercent(
            source.finalScore ?? source.final_score ?? source.matchPercentage ?? lexical,
          ),
          matchCount:
            Number(source.matchCount) ||
            Number(source.match_count) ||
            (Array.isArray(source.spans) ? source.spans.length : 0) ||
            sourceMatchesCount.get(sourceId) ||
            0,
          sourceColor: getSourceColor(index),
          // ACCURACY: Sources with only semantic similarity (no lexical match) can appear in
          // results if semanticSimilarity > threshold. These will have similarity ≈ 0 but
          // a non-zero finalScore. Label these as "Semantic match only" in the UI.
          // See: archivePlagiarismScan.service.js:496
          semanticOnly: lexical <= 0 && semantic > 0,
        };
      })
    : [];

  const knownIds = new Set(baseSources.map((source) => source._sourceId));
  const syntheticSources = [];

  sourceMatchesCount.forEach((matchCount, sourceId) => {
    if (knownIds.has(sourceId)) return;

    const representative = textMatches.find((match) => match.sourceId === sourceId);
    syntheticSources.push({
      _sourceId: sourceId,
      title: `Source ${sourceId}`,
      authors: [],
      year: 'N/A',
      similarity: toPercent(representative?.similarity),
      semanticSimilarity: 0,
      finalScore: toPercent(representative?.similarity),
      matchCount,
      sourceColor: getSourceColor(baseSources.length + syntheticSources.length),
      semanticOnly: false,
    });
  });

  return [...baseSources, ...syntheticSources];
}

export default function PlagiarismReportPage({ reportData, fileName, onBack }) {
  const [activeTab, setActiveTab] = useState('all');
  const [sourceDetailId, setSourceDetailId] = useState(null);
  const [highlightedSourceId, setHighlightedSourceId] = useState(null);
  const [jumpTarget, setJumpTarget] = useState(null);

  const sourceNodeMapRef = useRef(new Map());

  const extractedText = normalizeText(reportData?.extractedText);
  const normalizedMatches = useMemo(
    () => normalizeTextMatches(reportData?.textMatches || []),
    [reportData?.textMatches],
  );

  const allSources = useMemo(
    () =>
      normalizeSourceEntries(
        reportData?.sources || reportData?.matchedSources || [],
        normalizedMatches,
      ),
    [reportData?.sources, reportData?.matchedSources, normalizedMatches],
  );

  const sourceColorMap = useMemo(
    () =>
      allSources.reduce((accumulator, source) => {
        accumulator[source._sourceId] = source.sourceColor;
        return accumulator;
      }, {}),
    [allSources],
  );

  // ACCURACY: Overall similarity is character-interval based, NOT an average of source scores.
  // It = matchedCharacters / totalExtractedCharacters * 100
  // Do NOT recompute it from sources array — use the value from overallSimilarity directly.
  // See: archivePlagiarismScan.service.js:628–642
  const overallSimilarity = toPercent(
    reportData?.overallSimilarity ??
      reportData?.overallScore ??
      reportData?.fullReport?.plagiarism_score,
  );
  const originalityScore = toPercent(reportData?.originalityScore ?? 100 - overallSimilarity);

  // ACCURACY: Do not display `similarity` (lexical only) as the primary score.
  // Always use `finalScore` which is the blended lexical + semantic result.
  // See: archivePlagiarismScan.service.js:532–536
  const filteredSources = useMemo(() => {
    const sorted = [...allSources];

    if (activeTab === 'lexical') {
      sorted.sort((left, right) => right.similarity - left.similarity);
      return sorted;
    }

    if (activeTab === 'semantic') {
      sorted.sort((left, right) => right.semanticSimilarity - left.semanticSimilarity);
      return sorted;
    }

    sorted.sort((left, right) => right.finalScore - left.finalScore);
    return sorted;
  }, [activeTab, allSources]);

  const activeSource = useMemo(
    () => allSources.find((source) => source._sourceId === sourceDetailId) || null,
    [allSources, sourceDetailId],
  );

  const activeSourceMatches = useMemo(
    () => normalizedMatches.filter((match) => match.sourceId === sourceDetailId),
    [normalizedMatches, sourceDetailId],
  );

  const { resolvedValue: resolvedActiveSourceId, setSelectedValue: setActiveSourceId } =
    useResolvedSelection(null, filteredSources[0]?._sourceId || null);

  const charCount = extractedText.length;
  const wordCount = extractedText.trim() ? extractedText.trim().split(/\s+/).length : 0;

  useEffect(() => {
    if (!resolvedActiveSourceId) return;
    const node = sourceNodeMapRef.current.get(resolvedActiveSourceId);
    node?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [resolvedActiveSourceId, sourceDetailId]);

  const handleSelectSourceFromText = (sourceId) => {
    setActiveSourceId(sourceId);
    setSourceDetailId(null);
  };

  const handleSelectSourceFromList = (sourceId) => {
    setActiveSourceId(sourceId);
    setSourceDetailId(sourceId);
  };

  const handleJumpToMatch = (match) => {
    setActiveSourceId(match.sourceId);
    setSourceDetailId(null);
    setJumpTarget({
      sourceId: match.sourceId,
      startIndex: match.startIndex,
      nonce: Date.now(),
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <header className="sticky top-0 z-20 rounded-xl bg-[var(--color-sidebar)] px-4 py-3 text-white shadow-lg">
          <div className="grid items-center gap-4 lg:grid-cols-[auto_1fr_auto]">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-md border border-white/20 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <div className="flex min-w-0 items-center justify-center gap-2 text-center [font-family:var(--font-body)]">
              <FileText className="h-4 w-4 shrink-0 text-[var(--color-sidebar-text)]" />
              <p className="truncate text-sm font-semibold text-white">
                {fileName || 'Submitted document'}
              </p>
            </div>

            <div className="top-bar-actions flex items-center justify-end gap-3">
              <SimilarityGauge value={overallSimilarity} />
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-white/20 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-white/10"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
            </div>
          </div>
        </header>

        <section className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 [font-family:var(--font-body)]">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--color-ok)_14%,white)] px-3 py-1 text-xs font-semibold text-[var(--color-ok)]">
              <span className="h-2 w-2 rounded-full bg-[var(--color-ok)]" />
              {Math.round(originalityScore)}% Original
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--color-accent)_12%,white)] px-3 py-1 text-xs font-semibold text-[var(--color-accent)]">
              <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
              {Math.round(overallSimilarity)}% Matched content
            </div>
            <p className="ml-auto text-xs font-medium text-[var(--color-text-secondary)]">
              {wordCount.toLocaleString()} words | {allSources.length} sources
            </p>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.95fr)]">
          <section className="flex min-h-[70vh] flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 [font-family:var(--font-body)]">
              <h2 className="text-lg text-[var(--color-text-primary)] [font-family:var(--font-display)]">
                Submitted Document
              </h2>
              <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                {charCount.toLocaleString()} characters | {wordCount.toLocaleString()} words
              </p>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[11px] [font-family:var(--font-body)]">
              <span className="font-semibold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
                Similarity Legend
              </span>
              <span className="inline-flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                <span className="h-2 w-3 rounded-sm bg-[color-mix(in_srgb,var(--color-ok)_24%,white)]" />
                Low 0-15%
              </span>
              <span className="inline-flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                <span className="h-2 w-3 rounded-sm bg-[color-mix(in_srgb,var(--color-warn)_24%,white)]" />
                Moderate 16-40%
              </span>
              <span className="inline-flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                <span className="h-2 w-3 rounded-sm bg-[color-mix(in_srgb,var(--color-high)_24%,white)]" />
                High 41-70%
              </span>
              <span className="inline-flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                <span className="h-2 w-3 rounded-sm bg-[color-mix(in_srgb,var(--color-accent)_20%,white)]" />
                Critical 71-100%
              </span>
            </div>

            <AnnotatedText
              extractedText={extractedText}
              textMatches={normalizedMatches}
              sourceColorMap={sourceColorMap}
              activeSourceId={resolvedActiveSourceId}
              highlightedSourceId={highlightedSourceId}
              jumpTarget={jumpTarget}
              onSelectSource={handleSelectSourceFromText}
            />
          </section>

          <aside className="source-panel flex min-h-[70vh] flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <div className="mb-2 flex items-center justify-between px-1 [font-family:var(--font-body)]">
              <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
                Sources
              </h3>
              <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                {filteredSources.length} found
              </p>
            </div>

            <div className="mb-3 grid grid-cols-3 gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-1 [font-family:var(--font-body)]">
              {TAB_OPTIONS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSourceDetailId(null);
                  }}
                  className={[
                    'rounded-md px-2 py-2 text-xs font-semibold transition-colors',
                    activeTab === tab.id
                      ? 'bg-white text-[var(--color-text-primary)] shadow-sm'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-auto pr-1">
              {sourceDetailId ? (
                <SourceDetail
                  source={activeSource}
                  matches={activeSourceMatches}
                  onBackToList={() => setSourceDetailId(null)}
                  onJumpToMatch={handleJumpToMatch}
                />
              ) : (
                <SourceList
                  sources={filteredSources}
                  activeSourceId={resolvedActiveSourceId}
                  onSelectSource={handleSelectSourceFromList}
                  onHoverSource={setHighlightedSourceId}
                  onLeaveSource={() => setHighlightedSourceId(null)}
                  registerSourceNode={(sourceId, node) => {
                    if (!node) {
                      sourceNodeMapRef.current.delete(sourceId);
                      return;
                    }
                    sourceNodeMapRef.current.set(sourceId, node);
                  }}
                />
              )}
            </div>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}
