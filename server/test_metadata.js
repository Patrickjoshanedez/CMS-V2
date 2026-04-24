import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { extractPdfMetadataFromFile } from './utils/pdfMetadataExtractor.js';

dotenv.config();

process.env.PDF_METADATA_ENABLE_GLM_OCR = process.env.PDF_METADATA_ENABLE_GLM_OCR || 'true';
process.env.PDF_METADATA_GLM_STRATEGY = process.env.PDF_METADATA_GLM_STRATEGY || 'always';
process.env.PDF_METADATA_ENABLE_PLAGIARISM_PREPROCESS =
  process.env.PDF_METADATA_ENABLE_PLAGIARISM_PREPROCESS || 'true';
process.env.PDF_METADATA_GLM_MODEL = process.env.PDF_METADATA_GLM_MODEL || 'glm-ocr:latest';
process.env.PDF_METADATA_REVIEW_GATE_ENABLED = process.env.PDF_METADATA_REVIEW_GATE_ENABLED || 'true';
process.env.OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, '..');
const fixturesPath = path.join(scriptDir, 'metadata_gold_set.json');
const samplePdfDir = path.join(workspaceRoot, 'sampleacademicpdf');
const reportPath = path.join(scriptDir, 'parsed-test-results-glm.txt');
const jsonReportPath = path.join(scriptDir, 'metadata-regression-report.json');
const reviewQueuePath = path.join(scriptDir, 'metadata-review-queue.json');

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDoi(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
    .replace(/^doi:\s*/, '')
    .trim();
}

function normalizeAuthors(authors) {
  if (!Array.isArray(authors)) return [];
  return authors.map((author) => normalizeText(author)).filter(Boolean);
}

function compareString(expected, actual) {
  if (!expected) return { match: true, reason: 'not_scored' };
  const isMatch = normalizeText(expected) === normalizeText(actual);
  return { match: isMatch, reason: isMatch ? 'exact' : 'mismatch' };
}

function compareYear(expected, actual) {
  if (!expected) return { match: true, reason: 'not_scored' };
  return { match: Number(expected) === Number(actual), reason: Number(expected) === Number(actual) ? 'exact' : 'mismatch' };
}

function compareDoi(expected, actual) {
  if (!expected) return { match: true, reason: 'not_scored' };
  const isMatch = normalizeDoi(expected) === normalizeDoi(actual);
  return { match: isMatch, reason: isMatch ? 'exact' : 'mismatch' };
}

function compareAuthors(expected, actual) {
  if (!Array.isArray(expected) || expected.length === 0) return { match: true, reason: 'not_scored' };
  const expectedNormalized = normalizeAuthors(expected);
  const actualNormalized = normalizeAuthors(actual);
  const allMatched = expectedNormalized.every((author) => actualNormalized.includes(author));
  return { match: allMatched, reason: allMatched ? 'contains_all_expected' : 'missing_expected_author' };
}

function buildReviewItem(fileName, expected, actual, comparisons) {
  const failedFields = Object.entries(comparisons)
    .filter(([, value]) => !value.match)
    .map(([field]) => field);
  return {
    fileName,
    failedFields,
    expected,
    extracted: actual,
    confidence: actual.confidence || {},
    fieldSources: actual.fieldSources || {},
    review: actual.review || null,
  };
}

async function runTest() {
  const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));
  const uniqueDocs = new Map();
  for (const doc of fixtures.documents || []) {
    uniqueDocs.set(doc.fileName, doc);
  }

  const docs = [...uniqueDocs.values()];
  const report = {
    generatedAt: new Date().toISOString(),
    model: process.env.PDF_METADATA_GLM_MODEL,
    strategy: process.env.PDF_METADATA_GLM_STRATEGY,
    documents: [],
    totals: {
      scoredFields: 0,
      passedFields: 0,
      failedFields: 0,
      accuracy: 0,
      requiresManualReview: 0,
    },
  };
  const reviewQueue = [];
  const textOutput = [];

  textOutput.push('=====================================================');
  textOutput.push(' GLM-OCR METADATA REGRESSION REPORT');
  textOutput.push('=====================================================');

  for (const doc of docs) {
    const pdfPath = path.join(samplePdfDir, doc.fileName);
    const fileName = path.basename(pdfPath);
    textOutput.push('');
    textOutput.push(`Testing file: ${fileName}`);
    textOutput.push('-----------------------------------------------------');

    if (!fs.existsSync(pdfPath)) {
      textOutput.push(`File not found: ${pdfPath}`);
      continue;
    }

    const startedAt = Date.now();
    const extracted = await extractPdfMetadataFromFile(pdfPath);
    const elapsedMs = Date.now() - startedAt;

    const comparisons = {
      title: compareString(doc.title, extracted.title),
      authors: compareAuthors(doc.authors, extracted.authors),
      publicationYear: compareYear(doc.publicationYear, extracted.publicationYear),
      doi: compareDoi(doc.doi, extracted.doi),
      publicationVenue: compareString(doc.publicationVenue, extracted.publicationVenue || extracted.venue),
    };

    for (const [field, comparison] of Object.entries(comparisons)) {
      if (comparison.reason === 'not_scored') continue;
      report.totals.scoredFields += 1;
      if (comparison.match) {
        report.totals.passedFields += 1;
      } else {
        report.totals.failedFields += 1;
      }
      textOutput.push(`Field ${field}: ${comparison.match ? 'PASS' : 'FAIL'} (${comparison.reason})`);
    }

    const requiresReview =
      Boolean(extracted.review?.required) || Object.values(comparisons).some((entry) => !entry.match);
    if (requiresReview) {
      reviewQueue.push(buildReviewItem(fileName, doc, extracted, comparisons));
      report.totals.requiresManualReview += 1;
    }

    textOutput.push(`Extraction Time: ${elapsedMs}ms`);
    textOutput.push(`Provider: ${extracted.extractionProvider}`);
    textOutput.push(`Review Required: ${requiresReview ? 'YES' : 'NO'}`);
    textOutput.push(`Title: ${extracted.title}`);
    textOutput.push(`Authors: ${(extracted.authors || []).join(', ')}`);
    textOutput.push(`Year: ${extracted.publicationYear ?? ''}`);
    textOutput.push(`DOI: ${extracted.doi || ''}`);
    textOutput.push(`Venue: ${extracted.publicationVenue || extracted.venue || ''}`);
    textOutput.push(`Keywords: ${(extracted.keywords || []).join(', ')}`);
    textOutput.push(`Abstract preview (${extracted.abstract?.length || 0} chars):`);
    textOutput.push(
      extracted.abstract?.substring(0, 500) + ((extracted.abstract?.length || 0) > 500 ? '...' : ''),
    );
    textOutput.push('Confidence:');
    textOutput.push(JSON.stringify(extracted.confidence || {}, null, 2));

    report.documents.push({
      fileName,
      elapsedMs,
      extracted,
      expected: doc,
      comparisons,
      requiresReview,
    });
  }

  report.totals.accuracy =
    report.totals.scoredFields === 0
      ? 0
      : Number((report.totals.passedFields / report.totals.scoredFields).toFixed(4));

  textOutput.push('');
  textOutput.push('================== TOTALS ==================');
  textOutput.push(`Scored fields: ${report.totals.scoredFields}`);
  textOutput.push(`Passed fields: ${report.totals.passedFields}`);
  textOutput.push(`Failed fields: ${report.totals.failedFields}`);
  textOutput.push(`Field-level accuracy: ${(report.totals.accuracy * 100).toFixed(2)}%`);
  textOutput.push(`Manual review queue size: ${report.totals.requiresManualReview}`);

  fs.writeFileSync(reportPath, `${textOutput.join('\n')}\n`);
  fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(
    reviewQueuePath,
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        required: reviewQueue.length > 0,
        items: reviewQueue,
      },
      null,
      2,
    ),
  );

  console.log(`Regression report written to ${reportPath}`);
  console.log(`JSON report written to ${jsonReportPath}`);
  console.log(`Review queue written to ${reviewQueuePath}`);
}

runTest().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
