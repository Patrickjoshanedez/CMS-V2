import { getTextPosition } from 'react-pdf-highlighter-plus';

/**
 * Canonical Turnitin 10-Source Color Palette
 */
export const TURNITIN_SOURCE_PALETTE = [
  '#ef4444', // 1: Red
  '#f97316', // 2: Orange
  '#ca8a04', // 3: Yellow / Dark Amber
  '#10b981', // 4: Emerald
  '#3b82f6', // 5: Blue
  '#a855f7', // 6: Purple
  '#14b8a6', // 7: Teal
  '#ec4899', // 8: Pink
  '#22c55e', // 9: Green
  '#f43f5e', // 10: Rose
];

/**
 * Returns a stable, distinct Turnitin color for a given 1-based source number.
 */
export function getTurnitinSourceColor(sourceNumber) {
  const num = Number(sourceNumber) || 1;
  const index = Math.max(0, num - 1) % TURNITIN_SOURCE_PALETTE.length;
  return TURNITIN_SOURCE_PALETTE[index];
}

/**
 * Decomposes and merges word/token bounding boxes into discrete line rectangles (Method A).
 * Clusters boxes along vertical baselines and merges horizontal overlapping or adjacent boxes.
 *
 * @param {Array<object>} boxes - Array of bounding box objects ({ left, top, width, height, pageNumber } or { x1, y1, x2, y2 }).
 * @param {object} [options] - Configuration options.
 * @param {number} [options.baselineThreshold=4] - Maximum vertical baseline difference (px) to consider boxes on the same line.
 * @returns {Array<object>} Discrete line rectangles sorted from top to bottom.
 */
export function buildTurnitinHighlightRects(boxes = [], options = {}) {
  if (!Array.isArray(boxes) || boxes.length === 0) return [];

  const baselineThreshold = options.baselineThreshold ?? 4;

  const validBoxes = boxes
    .map((b) => {
      const left = Number(b.left ?? b.x1 ?? 0);
      const top = Number(b.top ?? b.y1 ?? 0);
      const width = Number(b.width ?? (b.x2 !== undefined && b.x2 !== null ? b.x2 - b.x1 : 0));
      const height = Number(b.height ?? (b.y2 !== undefined && b.y2 !== null ? b.y2 - b.y1 : 0));
      const pageNumber = Number(b.pageNumber ?? 1);
      return { left, top, width, height, pageNumber };
    })
    .filter((b) => b.width > 0 && b.height > 0);

  if (validBoxes.length === 0) return [];

  // Sort primarily by pageNumber, then by top (vertical baseline), then by left
  validBoxes.sort((a, b) => a.pageNumber - b.pageNumber || a.top - b.top || a.left - b.left);

  const lineClusters = [];
  let currentCluster = [];

  for (const box of validBoxes) {
    if (currentCluster.length === 0) {
      currentCluster.push(box);
      continue;
    }

    const reference = currentCluster[0];
    const samePage = box.pageNumber === reference.pageNumber;
    const baselineDiff = Math.abs(box.top - reference.top);
    const maxDiff = Math.max(baselineThreshold, box.height * 0.45);

    if (samePage && baselineDiff <= maxDiff) {
      currentCluster.push(box);
    } else {
      lineClusters.push(currentCluster);
      currentCluster = [box];
    }
  }
  if (currentCluster.length > 0) {
    lineClusters.push(currentCluster);
  }

  const lineRects = [];
  for (const cluster of lineClusters) {
    cluster.sort((a, b) => a.left - b.left);

    const pageNumber = cluster[0].pageNumber;
    const minLeft = Math.min(...cluster.map((c) => c.left));
    const maxRight = Math.max(...cluster.map((c) => c.left + c.width));
    const minTop = Math.min(...cluster.map((c) => c.top));
    const maxBottom = Math.max(...cluster.map((c) => c.top + c.height));

    lineRects.push({
      left: minLeft,
      top: minTop,
      width: maxRight - minLeft,
      height: maxBottom - minTop,
      pageNumber,
    });
  }

  return lineRects;
}

/**
 * Normalizes academic capstone text for resilient matching across dual-column line wraps,
 * soft hyphens, typographic ligatures, and PDF glyph/kerning boundaries.
 */
export function normalizeText(str) {
  if (!str || typeof str !== 'string') return '';
  return (
    str
      // Strip soft hyphens (\u00ad) and zero-width characters
      .replace(/\u00ad|\u200b|\u200c|\u200d|\ufeff/g, '')
      // Collapse line-end dual-column hyphens: e.g. "algo-\n rithm" -> "algorithm"
      .replace(/(\w+)-\s*[\r\n]+\s*(\w+)/g, '$1$2')
      // Replace non-breaking spaces with standard space
      .replace(/[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g, ' ')
      // Normalize typographic ligatures
      .replace(/\uFB00/g, 'ff')
      .replace(/\uFB01/g, 'fi')
      .replace(/\uFB02/g, 'fl')
      .replace(/\uFB03/g, 'ffi')
      .replace(/\uFB04/g, 'ffl')
      .replace(/\uFB05/g, 'ft')
      .replace(/\uFB06/g, 'st')
      .replace(/[\u00E6\u00C6]/g, 'ae')
      .replace(/[\u0153\u0152]/g, 'oe')
      // Normalize typographic quotes and dashes
      .replace(/[\u2018\u2019\u201a\u201b]/g, "'")
      .replace(/[\u201C\u201D\u201e\u201f]/g, '"')
      .replace(/[\u2013\u2014\u2015]/g, '-')
      // Replace remaining newlines with spaces
      .replace(/[\r\n]+/g, ' ')
      // Collapse multiple spaces
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
  );
}

const documentHighlightCache = new WeakMap();

/**
 * Maps raw backend plagiarism report matches to viewport-independent highlight overlays.
 *
 * @param {object} pdfDocument - Loaded PDF.js document proxy.
 * @param {Array<object>} plagiarismMatches - Array of suspect match spans from the report.
 * @returns {Promise<Array<object>>} Unified highlight objects ready for PdfHighlighter.
 */
export async function resolvePlagiarismHighlights(pdfDocument, plagiarismMatches = []) {
  if (!pdfDocument || !Array.isArray(plagiarismMatches) || plagiarismMatches.length === 0) {
    return [];
  }

  const cached = documentHighlightCache.get(pdfDocument);
  if (cached && cached.matchesCount === plagiarismMatches.length) {
    return cached.highlights;
  }

  const highlights = [];

  // Helper to extract suspect spans from various match schemas (flat highlights, textMatches with matchedBlocks, or raw spans)
  const candidateSpans = [];
  for (let index = 0; index < plagiarismMatches.length; index += 1) {
    const match = plagiarismMatches[index];
    if (!match) continue;

    if (Array.isArray(match.matchedBlocks) && match.matchedBlocks.length > 0) {
      for (let b = 0; b < match.matchedBlocks.length; b += 1) {
        const block = match.matchedBlocks[b];
        const spanText = block.matchedText || block.text || '';
        if (spanText && spanText.trim().length > 0) {
          candidateSpans.push({
            parentMatch: match,
            text: spanText.trim(),
            index,
            blockIndex: b,
            offset: block.studentStart ?? b,
          });
        }
      }
    } else {
      const candidates =
        Array.isArray(match.candidateTexts) && match.candidateTexts.length > 0
          ? match.candidateTexts
          : [
              match.matchedText,
              match.suspectText,
              match.text,
              match.source_snippet,
              match.sourceText,
              match.sourceTitle,
            ].filter(Boolean);

      const spanText = candidates[0] || '';
      if (spanText && spanText.trim().length > 0) {
        candidateSpans.push({
          parentMatch: match,
          text: spanText.trim(),
          candidateTexts: candidates,
          index,
          blockIndex: 0,
          offset: match.studentStart ?? index,
        });
      }
    }
  }

  for (let s = 0; s < candidateSpans.length; s += 1) {
    const {
      parentMatch,
      text: suspectText,
      candidateTexts: spanCandidates,
      index,
      blockIndex,
      offset,
    } = candidateSpans[s];

    try {
      // Gather all candidate query strings for this span
      const candidateList = [
        suspectText,
        ...(Array.isArray(spanCandidates) ? spanCandidates : []),
        ...(Array.isArray(parentMatch.candidateTexts) ? parentMatch.candidateTexts : []),
        parentMatch.sourceTitle,
        parentMatch.matchedText,
      ].filter(
        (t, i, arr) => typeof t === 'string' && t.trim().length >= 3 && arr.indexOf(t) === i,
      );

      let textPosition = null;
      let resolvedText = suspectText;

      for (const rawCandidate of candidateList) {
        // Pre-clean suspect text: collapse hyphenated breaks and ligatures while preserving case
        const cleanedText = rawCandidate
          .replace(/[\u00ad\u200b\ufeff]/g, '')
          .replace(/(\w+)-\s*[\r\n]+\s*(\w+)/g, '$1$2')
          .replace(/\uFB00/g, 'ff')
          .replace(/\uFB01/g, 'fi')
          .replace(/\uFB02/g, 'fl')
          .replace(/\uFB03/g, 'ffi')
          .replace(/\uFB04/g, 'ffl')
          .replace(/[\u00E6\u00C6]/g, 'ae')
          .replace(/[\u0153\u0152]/g, 'oe')
          .replace(/\s+/g, ' ')
          .trim();

        if (cleanedText.length < 3) continue;

        // 1. Try exact or fuzzy position on the full cleaned candidate
        let pos = await getTextPosition(pdfDocument, cleanedText, {
          normalizeWhitespace: true,
          ignoreHyphens: true,
          fuzzyThreshold: 0.85,
        });

        // 2. If full string failed, try individual sentences
        if ((!pos || !pos.position) && cleanedText.length > 50) {
          const sentences = cleanedText
            .split(/(?<=[.?!])\s+/)
            .map((item) => item.trim())
            .filter((item) => item.length >= 25);

          for (const sentence of sentences) {
            const subPos = await getTextPosition(pdfDocument, sentence, {
              normalizeWhitespace: true,
              ignoreHyphens: true,
              fuzzyThreshold: 0.85,
            });
            if (subPos && subPos.position) {
              pos = subPos;
              resolvedText = sentence;
              break;
            }
          }
        }

        // 3. If still not found and candidate has >= 4 words, try leading phrase (4-6 words)
        if (!pos || !pos.position) {
          const words = cleanedText.split(/\s+/).filter(Boolean);
          if (words.length >= 4) {
            const leadingPhrase = words.slice(0, Math.min(6, words.length)).join(' ');
            if (leadingPhrase.length >= 15) {
              const phrasePos = await getTextPosition(pdfDocument, leadingPhrase, {
                normalizeWhitespace: true,
                ignoreHyphens: true,
                fuzzyThreshold: 0.85,
              });
              if (phrasePos && phrasePos.position) {
                pos = phrasePos;
                resolvedText = leadingPhrase;
              }
            }
          }
        }

        if (pos && pos.position) {
          textPosition = pos;
          resolvedText = pos.matchedText || resolvedText;
          break;
        }
      }

      if (textPosition && textPosition.position) {
        const rawScore = Number(
          parentMatch.similarityPercentage || parentMatch.similarityScore || parentMatch.score || 0,
        );
        const score = rawScore > 1 ? rawScore / 100 : rawScore;
        const winnow = Number(parentMatch.winnowScore || parentMatch.winnow_score || 0);
        const semantic = Number(parentMatch.semanticScore || parentMatch.semantic_score || 0);

        // Determine score-tier CSS class
        let scoreTierClass;
        if (score >= 0.9) scoreTierClass = 'highlight-plagiarism--critical';
        else if (score >= 0.7) scoreTierClass = 'highlight-plagiarism--high';
        else if (score >= 0.5) scoreTierClass = 'highlight-plagiarism--medium';
        else scoreTierClass = 'highlight-plagiarism--low';

        // Contextual signal: paraphrase (high semantic, low verbatim) vs verbatim
        const contextSignal =
          parentMatch.contextSignal ||
          (semantic >= 0.7 && winnow < 0.3 ? 'paraphrase' : winnow >= 0.8 ? 'verbatim' : 'mixed');

        const sourceNumber =
          parentMatch.sourceNumber ??
          (parentMatch.sourceIndex !== undefined && parentMatch.sourceIndex !== null
            ? parentMatch.sourceIndex + 1
            : index + 1);

        const sourceColor =
          parentMatch.palette?.dot ||
          parentMatch.palette?.color ||
          getTurnitinSourceColor(sourceNumber);

        const resolvedPalette = parentMatch.palette || {
          dot: sourceColor,
          color: sourceColor,
          badgeStyle: {
            background: `${sourceColor}26`,
            color: sourceColor,
            border: `1px solid ${sourceColor}59`,
          },
          mark: {
            background: `${sourceColor}38`,
            outline: `1px solid ${sourceColor}73`,
          },
        };

        const pageNum = textPosition.pageNumber || textPosition.position?.pageNumber || 1;
        let rawRects = (textPosition.position.rects || []).map((r) => ({
          ...r,
          pageNumber: r.pageNumber || pageNum,
        }));
        if (rawRects.length === 0 && textPosition.position.boundingRect) {
          rawRects = [{ ...textPosition.position.boundingRect, pageNumber: pageNum }];
        }

        const normalizedPosition = {
          ...textPosition.position,
          pageNumber: pageNum,
          boundingRect: {
            ...textPosition.position.boundingRect,
            pageNumber: textPosition.position.boundingRect?.pageNumber || pageNum,
          },
          rects: rawRects,
        };

        highlights.push({
          id: `plag-${parentMatch.sourceId || 'match'}-${index}-${blockIndex}-${offset}`,
          type: parentMatch.isExact ? 'plagiarism_exact' : 'plagiarism_semantic',
          position: normalizedPosition,
          content: {
            text: textPosition.matchedText || suspectText,
          },
          meta: {
            similarityScore: Math.round(score * 100),
            matchedSourceId: parentMatch.sourceId || parentMatch.matchedProjectId || null,
            projectId: parentMatch.projectId || parentMatch.sourceId || null,
            sourceUrl: parentMatch.sourceUrl || null,
            doi: parentMatch.doi || null,
            isArchive: Boolean(parentMatch.isArchive),
            sourceNumber,
            sourceColor,
            sourceTitle:
              parentMatch.sourceTitle ||
              parentMatch.projectTitle ||
              'Archived Institutional Manuscript',
            sourceAuthors: parentMatch.sourceAuthors || parentMatch.authors || [],
            isExact: Boolean(parentMatch.isExact),
            pageNumber: textPosition.position.pageNumber,
            winnowScore: Math.round(winnow * 100),
            semanticScore: Math.round(semantic * 100),
            contextSignal,
            scoreTierClass,
            palette: resolvedPalette,
          },
        });
      }
    } catch (err) {
      console.warn('[resolvePlagiarismHighlights] Failed to ground match in PDF text layer:', err);
    }
  }

  documentHighlightCache.set(pdfDocument, {
    matchesCount: plagiarismMatches.length,
    highlights,
  });

  return highlights;
}

/**
 * Checks if two bounding rectangles overlap on the same page.
 */
export function areRectsOverlapping(r1, r2) {
  if (!r1 || !r2) return false;
  return !(r1.x2 < r2.x1 || r1.x1 > r2.x2 || r1.y2 < r2.y1 || r1.y1 > r2.y2);
}

/**
 * Detects overlapping highlights across layers (e.g., faculty comments overlapping with plagiarism matches).
 * Enriches highlights with overlap metadata and references.
 *
 * @param {Array<object>} highlights - Array of UnifiedHighlight objects.
 * @returns {Array<object>} Enriched array with overlap indicators.
 */
export function annotateOverlappingHighlights(highlights = []) {
  if (!Array.isArray(highlights) || highlights.length <= 1) {
    return highlights;
  }

  const enriched = highlights.map((h) => ({
    ...h,
    isOverlap: false,
    overlappingHighlights: [],
  }));

  for (let i = 0; i < enriched.length; i += 1) {
    for (let j = i + 1; j < enriched.length; j += 1) {
      const h1 = enriched[i];
      const h2 = enriched[j];

      const p1 = h1.position?.pageNumber;
      const p2 = h2.position?.pageNumber;

      if (p1 && p2 && p1 === p2) {
        const b1 = h1.position?.boundingRect;
        const b2 = h2.position?.boundingRect;

        if (areRectsOverlapping(b1, b2)) {
          // Cross-layer overlap (e.g. faculty comment vs plagiarism match)
          const isCrossLayer =
            (h1.type === 'faculty_comment' && h2.type.startsWith('plagiarism_')) ||
            (h2.type === 'faculty_comment' && h1.type.startsWith('plagiarism_'));

          h1.isOverlap = true;
          h1.overlappingHighlights.push(h2);

          h2.isOverlap = true;
          h2.overlappingHighlights.push(h1);

          if (isCrossLayer) {
            h1.isCrossLayerOverlap = true;
            h2.isCrossLayerOverlap = true;
          }
        }
      }
    }
  }

  return enriched;
}
