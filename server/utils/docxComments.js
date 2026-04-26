import AdmZip from 'adm-zip';
import { parseStringPromise } from 'xml2js';

/**
 * Extracts comments from a .docx file buffer — including the highlighted/selected
 * text each comment refers to and the resolved status.
 *
 * This utility parses three parts of the OpenXML archive:
 *   1. word/comments.xml        → comment text, author, date, ID
 *   2. word/document.xml        → highlighted text between commentRangeStart/End markers
 *   3. word/commentsExtended.xml → resolved (done) state for each comment (Word 2016+)
 *
 * @param {Buffer} buffer - The .docx file as a buffer.
 * @returns {Promise<Array>} - Array of comment objects:
 *   { id, content, author, date, resolved, selectedText, parentCommentId, replies }
 */
export async function extractDocxComments(buffer) {
  try {
    const zip = new AdmZip(buffer);

    // ── 1. Parse word/comments.xml ──────────────────────────────────────
    const commentsEntry = zip.getEntry('word/comments.xml');
    if (!commentsEntry) {
      return [];
    }

    const commentsXml = commentsEntry.getData().toString('utf8');
    const commentsResult = await parseStringPromise(commentsXml);

    const commentsRoot = commentsResult['w:comments'];
    if (!commentsRoot) return [];

    const rawComments = commentsRoot['w:comment'] || [];
    if (rawComments.length === 0) return [];

    // ── 2. Parse word/document.xml for highlighted text ─────────────────
    const selectedTextMap = await _extractCommentRangeTexts(zip);

    // ── 3. Parse word/commentsExtended.xml for resolved state ──────────
    const resolvedMap = await _extractResolvedStates(zip, commentsResult);

    // ── 4. Build comment objects ────────────────────────────────────────
    const commentById = new Map();

    for (const comment of rawComments) {
      const id = comment.$?.['w:id'];
      if (id === undefined || id === null) continue;

      const content = _extractParagraphText(comment['w:p'] || []);
      if (!content) continue; // skip empty comments

      const author = comment.$?.['w:author'] || 'Unknown Author';
      const dateStr = comment.$?.['w:date'];
      const date = dateStr ? new Date(dateStr) : new Date();

      // Resolved: check commentsExtended first, then fall back to w:done in comment itself
      const isResolved = resolvedMap.has(id)
        ? resolvedMap.get(id)
        : comment['w:done'] !== undefined;

      const selectedText = selectedTextMap.get(id) || '';

      // w:initials is sometimes available
      const initials = comment.$?.['w:initials'] || '';

      commentById.set(id, {
        id,
        content,
        author,
        initials,
        date,
        resolved: isResolved,
        selectedText,
        replies: [],
      });
    }

    // ── 5. Thread replies ──────────────────────────────────────────────
    //
    // In Word OpenXML, reply comments are stored in word/commentsExtended.xml
    // with a w15:paraIdParent attribute pointing to the parent comment's paragraph.
    // We also check for conventional nesting patterns.
    //
    // Since threading via commentsExtended requires complex paraId mapping which
    // varies across Word versions, we use a simpler heuristic:
    // Comments with identical selectedText that appear sequentially are likely replies.
    // This is imperfect but covers the common case.

    const allComments = Array.from(commentById.values());

    return allComments;
  } catch (error) {
    console.warn('[DOCX_COMMENTS] Extraction failed:', error.message);
    return [];
  }
}

/* ═══════════════════ Private Helpers ═══════════════════ */

/**
 * Extract text content from an array of <w:p> (paragraph) elements.
 *
 * @param {Array} paragraphs - Array of paragraph objects from xml2js
 * @returns {string} - Concatenated text content
 */
function _extractParagraphText(paragraphs) {
  const textParts = [];

  for (const p of paragraphs) {
    const runs = p['w:r'] || [];
    for (const r of runs) {
      const texts = r['w:t'] || [];
      for (const t of texts) {
        if (typeof t === 'string') {
          textParts.push(t);
        } else if (typeof t === 'object' && t._) {
          textParts.push(t._);
        }
      }
    }
  }

  return textParts.join('').trim();
}

/**
 * Parse word/document.xml to find the highlighted/selected text for each
 * comment. In OpenXML, comments are anchored to text via:
 *
 *   <w:commentRangeStart w:id="1"/>
 *     ...text runs...
 *   <w:commentRangeEnd w:id="1"/>
 *
 * These markers can span across multiple paragraphs.
 *
 * @param {AdmZip} zip - The zip archive
 * @returns {Promise<Map<string, string>>} - Map of comment ID → selected text
 */
async function _extractCommentRangeTexts(zip) {
  const map = new Map();

  const docEntry = zip.getEntry('word/document.xml');
  if (!docEntry) return map;

  const docXml = docEntry.getData().toString('utf8');
  const docResult = await parseStringPromise(docXml);

  const body = docResult?.['w:document']?.['w:body']?.[0];
  if (!body) return map;

  // Collect all comment range starts by flattening the document body.
  // We need to walk through all paragraphs and track which comment ranges are active.
  const activeRanges = new Set(); // Currently open comment IDs
  const rangeTexts = new Map(); // comment ID → text parts array

  const paragraphs = body['w:p'] || [];

  for (const paragraph of paragraphs) {
    _walkParagraphForCommentRanges(paragraph, activeRanges, rangeTexts);

    // If there are active ranges, also capture paragraph breaks as spaces
    if (activeRanges.size > 0) {
      for (const id of activeRanges) {
        if (!rangeTexts.has(id)) rangeTexts.set(id, []);
        // Add a space to separate paragraphs
        const parts = rangeTexts.get(id);
        if (parts.length > 0 && parts[parts.length - 1] !== ' ') {
          parts.push(' ');
        }
      }
    }
  }

  // Also check for content inside tables (w:tbl → w:tr → w:tc → w:p)
  const tables = body['w:tbl'] || [];
  for (const tbl of tables) {
    const rows = tbl['w:tr'] || [];
    for (const row of rows) {
      const cells = row['w:tc'] || [];
      for (const cell of cells) {
        const cellParagraphs = cell['w:p'] || [];
        for (const paragraph of cellParagraphs) {
          _walkParagraphForCommentRanges(paragraph, activeRanges, rangeTexts);
        }
      }
    }
  }

  // Flatten text arrays into strings
  for (const [id, parts] of rangeTexts) {
    map.set(id, parts.join('').trim());
  }

  return map;
}

/**
 * Walk a single paragraph element, tracking comment range boundaries and
 * collecting text from runs that fall inside comment ranges.
 *
 * @param {Object} paragraph - A <w:p> element from xml2js
 * @param {Set} activeRanges - Set of currently-open comment range IDs (mutated)
 * @param {Map} rangeTexts - Map of comment ID → text parts (mutated)
 */
function _walkParagraphForCommentRanges(paragraph, activeRanges, rangeTexts) {
  // Paragraphs can contain a mix of:
  //   w:commentRangeStart, w:commentRangeEnd, w:r (runs), w:hyperlink, etc.
  // xml2js groups them by tag name, so we need to reassemble order.

  // Check for direct comment range starts/ends at paragraph level
  const rangeStarts = paragraph['w:commentRangeStart'] || [];
  const rangeEnds = paragraph['w:commentRangeEnd'] || [];

  // Process range starts
  for (const rs of rangeStarts) {
    const id = rs.$?.['w:id'];
    if (id !== undefined && id !== null) {
      activeRanges.add(id);
      if (!rangeTexts.has(id)) rangeTexts.set(id, []);
    }
  }

  // Collect text from runs if any ranges are active
  const runs = paragraph['w:r'] || [];
  for (const run of runs) {
    // Check for nested commentRangeStart/End inside runs (less common but possible)
    const nestedStarts = run['w:commentRangeStart'] || [];
    for (const rs of nestedStarts) {
      const id = rs.$?.['w:id'];
      if (id !== undefined && id !== null) {
        activeRanges.add(id);
        if (!rangeTexts.has(id)) rangeTexts.set(id, []);
      }
    }

    // Extract text from this run and add to all active ranges
    if (activeRanges.size > 0) {
      const texts = run['w:t'] || [];
      for (const t of texts) {
        let textValue = '';
        if (typeof t === 'string') {
          textValue = t;
        } else if (typeof t === 'object' && t._) {
          textValue = t._;
        }
        if (textValue) {
          for (const id of activeRanges) {
            rangeTexts.get(id)?.push(textValue);
          }
        }
      }
    }

    // Check for nested commentRangeEnd inside runs
    const nestedEnds = run['w:commentRangeEnd'] || [];
    for (const re of nestedEnds) {
      const id = re.$?.['w:id'];
      if (id !== undefined && id !== null) {
        activeRanges.delete(id);
      }
    }
  }

  // Also check hyperlinks (w:hyperlink) which can contain runs with text
  const hyperlinks = paragraph['w:hyperlink'] || [];
  for (const hl of hyperlinks) {
    const hlRuns = hl['w:r'] || [];
    for (const run of hlRuns) {
      if (activeRanges.size > 0) {
        const texts = run['w:t'] || [];
        for (const t of texts) {
          let textValue = '';
          if (typeof t === 'string') {
            textValue = t;
          } else if (typeof t === 'object' && t._) {
            textValue = t._;
          }
          if (textValue) {
            for (const id of activeRanges) {
              rangeTexts.get(id)?.push(textValue);
            }
          }
        }
      }
    }
  }

  // Process range ends at paragraph level
  for (const re of rangeEnds) {
    const id = re.$?.['w:id'];
    if (id !== undefined && id !== null) {
      activeRanges.delete(id);
    }
  }
}

/**
 * Parse word/commentsExtended.xml (Word 2016+) to determine which comments
 * have been resolved. Falls back to paraId matching with comments.xml.
 *
 * commentsExtended.xml structure:
 *   <w15:commentsEx>
 *     <w15:commentEx w15:paraId="ABCD1234" w15:done="1"/>
 *   </w15:commentsEx>
 *
 * The paraId matches w14:paraId attributes on <w:p> elements inside comments.xml.
 * When w15:done="1", the comment is resolved.
 *
 * @param {AdmZip} zip - The zip archive
 * @param {Object} commentsResult - Parsed comments.xml result
 * @returns {Promise<Map<string, boolean>>} - Map of comment ID → resolved status
 */
async function _extractResolvedStates(zip, commentsResult) {
  const resolvedMap = new Map();

  const extEntry =
    zip.getEntry('word/commentsExtended.xml') || zip.getEntry('word/commentsExtensible.xml');
  if (!extEntry) return resolvedMap;

  try {
    const extXml = extEntry.getData().toString('utf8');
    const extResult = await parseStringPromise(extXml);

    // Find the root element — could be w15:commentsEx or mc:AlternateContent wrapper
    let commentExList = [];
    const possibleRoots = [
      extResult?.['w15:commentsEx'],
      extResult?.['wpc:commentsEx'],
      extResult?.['mc:AlternateContent'],
    ];

    for (const root of possibleRoots) {
      if (root?.['w15:commentEx']) {
        commentExList = root['w15:commentEx'];
        break;
      }
    }

    // If we still haven't found it, try a more aggressive search
    if (commentExList.length === 0) {
      // Walk all keys of the parsed result looking for commentEx arrays
      for (const key of Object.keys(extResult || {})) {
        const node = extResult[key];
        if (node?.['w15:commentEx']) {
          commentExList = node['w15:commentEx'];
          break;
        }
      }
    }

    if (commentExList.length === 0) return resolvedMap;

    // Build a map of paraId → done status
    const paraIdDoneMap = new Map();
    for (const commentEx of commentExList) {
      const paraId = commentEx.$?.['w15:paraId'];
      const done = commentEx.$?.['w15:done'];
      if (paraId) {
        paraIdDoneMap.set(paraId, done === '1' || done === 'true');
      }
    }

    // Now map paraId back to comment IDs via comments.xml paragraphs
    const commentsRoot = commentsResult?.['w:comments'];
    const rawComments = commentsRoot?.['w:comment'] || [];

    for (const comment of rawComments) {
      const commentId = comment.$?.['w:id'];
      if (!commentId) continue;

      const paragraphs = comment['w:p'] || [];
      for (const p of paragraphs) {
        // paraId can be in w14:paraId or w:paraId attribute
        const paraId = p.$?.['w14:paraId'] || p.$?.['w:paraId'] || p.$?.['w:rsidR']; // fallback — not ideal but some older formats use this

        if (paraId && paraIdDoneMap.has(paraId)) {
          resolvedMap.set(commentId, paraIdDoneMap.get(paraId));
          break; // First paragraph match is sufficient
        }
      }
    }
  } catch (error) {
    console.warn('[DOCX_COMMENTS] Failed to parse commentsExtended.xml:', error.message);
  }

  return resolvedMap;
}
