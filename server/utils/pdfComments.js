import { PDFDocument, PDFName, PDFString, PDFHexString, PDFArray, PDFDict, PDFRef } from 'pdf-lib';

/**
 * Extracts annotation comments from a PDF file buffer.
 *
 * PDF annotations include text notes, highlights with pop-up comments, and
 * other markup types. This extractor focuses on user-facing comments:
 *   - Text annotations (sticky notes)
 *   - Highlight, underline, strikeout annotations with associated text
 *   - FreeText annotations
 *
 * @param {Buffer} buffer - The PDF file as a buffer.
 * @returns {Promise<Array>} - Array of comment objects:
 *   { content, author, date, resolved, selectedText, page }
 */
export async function extractPdfComments(buffer) {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();
    const comments = [];

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const annots = page.node.lookup(PDFName.of('Annots'));

      if (!annots || !(annots instanceof PDFArray)) continue;

      for (let j = 0; j < annots.size(); j++) {
        try {
          const annotRef = annots.get(j);
          const annot = annotRef instanceof PDFRef ? pdfDoc.context.lookup(annotRef) : annotRef;

          if (!(annot instanceof PDFDict)) continue;

          const subtypeName = annot.lookup(PDFName.of('Subtype'));
          const subtype = subtypeName?.toString?.() || '';

          // Only extract comment-type annotations
          const commentSubtypes = [
            '/Text', // Sticky note
            '/Highlight', // Highlight with comment
            '/Underline', // Underline with comment
            '/StrikeOut', // Strikeout with comment
            '/FreeText', // Free text annotation
            '/Popup', // Popup annotation (typically linked to another)
            '/Caret', // Caret insertion point
            '/Squiggly', // Squiggly underline
          ];

          if (!commentSubtypes.includes(subtype)) continue;

          // Skip Popup annotations — they're linked to parent annotations
          if (subtype === '/Popup') continue;

          const content = _extractPdfString(annot.lookup(PDFName.of('Contents')));
          if (!content) continue; // Skip annotations without text content

          const author = _extractPdfString(annot.lookup(PDFName.of('T'))) || 'Unknown Author';
          const dateRaw = _extractPdfString(annot.lookup(PDFName.of('M')));
          const date = dateRaw ? _parsePdfDate(dateRaw) : new Date();

          // Check review status — PDF annotations can have a review state
          // stored in the State/StateModel entries
          const stateVal = _extractPdfString(annot.lookup(PDFName.of('State')));
          const stateModel = _extractPdfString(annot.lookup(PDFName.of('StateModel')));
          const isResolved =
            (stateModel === 'Review' && stateVal === 'Completed') ||
            (stateModel === 'Review' && stateVal === 'Accepted') ||
            stateVal === 'Completed' ||
            stateVal === 'Accepted';

          // For highlight/underline/strikeout, try to extract the marked text
          // via QuadPoints + page content stream (complex — we use a simpler fallback)
          let selectedText = '';

          // RC (Rich Content) sometimes contains the selected text
          const rcContent = _extractPdfString(annot.lookup(PDFName.of('RC')));
          if (rcContent) {
            // Strip HTML/XML tags from rich content
            selectedText = rcContent.replace(/<[^>]*>/g, '').trim();
            // Don't use RC if it's identical to content (it's the comment itself)
            if (selectedText === content) selectedText = '';
          }

          // Subject field sometimes indicates the annotation type
          const subject = _extractPdfString(annot.lookup(PDFName.of('Subj'))) || '';

          comments.push({
            content,
            author,
            date,
            resolved: isResolved,
            selectedText,
            page: i + 1,
            annotationType: subtype.replace('/', ''),
            subject,
          });
        } catch (annotError) {
          // Skip malformed annotations
          console.warn(
            `[PDF_COMMENTS] Skipped malformed annotation on page ${i + 1}:`,
            annotError.message,
          );
        }
      }
    }

    return comments;
  } catch (error) {
    console.warn('[PDF_COMMENTS] Extraction failed:', error.message);
    return [];
  }
}

/* ═══════════════════ Private Helpers ═══════════════════ */

/**
 * Extract a string value from a PDF object (handles PDFString, PDFHexString, etc.)
 */
function _extractPdfString(obj) {
  if (!obj) return '';
  if (obj instanceof PDFString) return obj.decodeText();
  if (obj instanceof PDFHexString) return obj.decodeText();
  if (typeof obj === 'string') return obj;
  if (typeof obj?.toString === 'function') {
    const s = obj.toString();
    // Clean up PDF name notation
    return s.startsWith('/') ? s.slice(1) : s;
  }
  return '';
}

/**
 * Parse PDF date format (D:YYYYMMDDHHmmSSOHH'mm') into a JavaScript Date.
 *
 * @param {string} pdfDate - PDF date string
 * @returns {Date}
 */
function _parsePdfDate(pdfDate) {
  if (!pdfDate) return new Date();

  // Remove the "D:" prefix
  const s = pdfDate.replace(/^D:/, '');

  // Extract components: YYYYMMDDHHmmSS followed by timezone
  const match = s.match(
    /^(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?([+-Z])?(\d{2})?'?(\d{2})?'?$/,
  );

  if (!match) {
    // Try to parse as ISO or natural date
    const fallback = new Date(pdfDate);
    return isNaN(fallback.getTime()) ? new Date() : fallback;
  }

  const [, year, month, day, hour, minute, second, tzSign, tzHour, tzMinute] = match;

  let isoStr = `${year}-${month || '01'}-${day || '01'}T${hour || '00'}:${minute || '00'}:${second || '00'}`;

  if (tzSign === 'Z') {
    isoStr += 'Z';
  } else if (tzSign) {
    isoStr += `${tzSign}${tzHour || '00'}:${tzMinute || '00'}`;
  }

  const parsed = new Date(isoStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}
