import { getTextPosition } from 'react-pdf-highlighter-plus';

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
      const spanText =
        match.matchedText ||
        match.suspectText ||
        match.text ||
        match.source_snippet ||
        match.sourceText ||
        '';
      if (spanText && spanText.trim().length > 0) {
        candidateSpans.push({
          parentMatch: match,
          text: spanText.trim(),
          index,
          blockIndex: 0,
          offset: match.studentStart ?? index,
        });
      }
    }
  }

  for (let s = 0; s < candidateSpans.length; s += 1) {
    const { parentMatch, text: suspectText, index, blockIndex, offset } = candidateSpans[s];

    try {
      // Pre-clean suspect text: collapse hyphenated breaks and ligatures while preserving case
      const cleanedText = suspectText
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

      // Use react-pdf-highlighter-plus getTextPosition to locate text quote in PDF pages
      let textPosition = await getTextPosition(pdfDocument, cleanedText, {
        normalizeWhitespace: true,
        ignoreHyphens: true,
        fuzzyThreshold: 0.85,
      });

      // If full text position failed and text is long, fallback to primary sentence search
      if ((!textPosition || !textPosition.position) && cleanedText.length > 70) {
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
            textPosition = subPos;
            break;
          }
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

        highlights.push({
          id: `plag-${parentMatch.sourceId || 'match'}-${index}-${blockIndex}-${offset}`,
          type: parentMatch.isExact ? 'plagiarism_exact' : 'plagiarism_semantic',
          position: textPosition.position,
          content: {
            text: textPosition.matchedText || suspectText,
          },
          meta: {
            similarityScore: Math.round(score * 100),
            matchedSourceId: parentMatch.sourceId || parentMatch.matchedProjectId || null,
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
            palette: parentMatch.palette || null,
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
