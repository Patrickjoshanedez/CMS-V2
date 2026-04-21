import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkOriginality } from '../services/plagiarism.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Calculates standard PAN evaluation metrics for plagiarism detection.
 * Maps text spans to boolean arrays to compute exact character precision and recall.
 */
function computeMetrics(groundTruthSpans, detectedSpans, documentLength) {
  if (documentLength === 0) {
    return { precision: 1, recall: 1, f1: 1, granularity: 1, plagDet: 1 };
  }

  const truthArray = new Array(documentLength).fill(false);
  const detectedArray = new Array(documentLength).fill(false);

  // Mark all characters covered by ground truth spans
  groundTruthSpans.forEach((span) => {
    const start = Math.max(0, span.start);
    const end = Math.min(documentLength, span.end);
    for (let i = start; i < end; i++) {
      truthArray[i] = true;
    }
  });

  // Mark all characters covered by detected spans
  detectedSpans.forEach((span) => {
    const start = Math.max(0, span.start);
    const end = Math.min(documentLength, span.end);
    for (let i = start; i < end; i++) {
      detectedArray[i] = true;
    }
  });

  let tp = 0;
  let fp = 0;
  let fn = 0;

  for (let i = 0; i < documentLength; i++) {
    if (truthArray[i] && detectedArray[i]) {
      tp += 1;
    } else if (!truthArray[i] && detectedArray[i]) {
      fp += 1;
    } else if (truthArray[i] && !detectedArray[i]) {
      fn += 1;
    }
  }

  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  // Compute Granularity (average number of detections per true plagiarism case)
  let totalGranularity = 0;
  let detectedCases = 0;

  groundTruthSpans.forEach((truthSpan) => {
    let intersectionCount = 0;
    detectedSpans.forEach((detectedSpan) => {
      // Overlap exists if start of one is before end of other and vice versa
      if (
        Math.max(truthSpan.start, detectedSpan.start) < Math.min(truthSpan.end, detectedSpan.end)
      ) {
        intersectionCount += 1;
      }
    });

    if (intersectionCount > 0) {
      totalGranularity += intersectionCount;
      detectedCases += 1;
    }
  });

  const granularity = detectedCases === 0 ? 1 : totalGranularity / detectedCases;
  const plagDet = f1 / Math.log2(1 + granularity);

  return { precision, recall, f1, granularity, plagDet };
}

/**
 * Loads baseline truths, runs the detection, and computes overall metrics.
 */
async function runBenchmark(truthFilePath) {
  console.log(`Loading truth dataset from: ${truthFilePath} ...`);

  let truthData = [];
  try {
    const rawData = fs.readFileSync(truthFilePath, 'utf8');
    truthData = JSON.parse(rawData);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn(`Truth file not found. Generating a mock truth dataset for testing purposes...`);
      truthData = [
        {
          id: 'test_doc_1',
          text: 'Innovation in AI is advancing rapidly. The quick brown fox jumps over the lazy dog repeatedly. Technology changes everything quickly.',
          corpus: [
            {
              id: 'source_1',
              title: 'Source Material 1',
              text: 'The quick brown fox jumps over the lazy dog repeatedly.',
            },
          ],
          groundTruthSpans: [
            {
              start: 'Innovation in AI is advancing rapidly. '.length,
              end: 'Innovation in AI is advancing rapidly. The quick brown fox jumps over the lazy dog repeatedly.'
                .length,
            },
          ],
        },
      ];
      fs.writeFileSync(truthFilePath, JSON.stringify(truthData, null, 2), 'utf8');
      console.log(`Mock dataset saved to ${truthFilePath}`);
    } else {
      console.error(`Failed to parse truth JSON: ${err.message}`);
      process.exit(1);
    }
  }

  let totalPrecision = 0;
  let totalRecall = 0;
  let totalF1 = 0;
  let totalGranularity = 0;
  let totalPlagDet = 0;
  const totalCount = truthData.length;

  console.log('\nRunning plagiarism evaluation:\n');

  for (const testCase of truthData) {
    console.log(`Evaluating case: ${testCase.id}`);

    // Map corpus into format expected by \`compareAgainstCorpus\`
    // corpus = [{ id, title, chapter, text, fingerprints }]
    const transformedCorpus = (testCase.corpus || []).map((doc) => ({
      id: doc.id,
      title: doc.title || 'Unknown',
      text: doc.text || '',
    }));

    const result = await checkOriginality(testCase.text, transformedCorpus);

    // Aggregate all spans returned by the function
    const detectedSpans = [];
    (result.matchedSources || []).forEach((source) => {
      (source.spans || []).forEach((span) => {
        detectedSpans.push(span);
      });
    });

    const metrics = computeMetrics(
      testCase.groundTruthSpans || [],
      detectedSpans,
      testCase.text.length,
    );

    console.log(`  Precision   : ${(metrics.precision * 100).toFixed(2)}%`);
    console.log(`  Recall      : ${(metrics.recall * 100).toFixed(2)}%`);
    console.log(`  F1 Score    : ${(metrics.f1 * 100).toFixed(2)}%`);
    console.log(`  Granularity : ${metrics.granularity.toFixed(2)}`);
    console.log(`  PlagDet     : ${(metrics.plagDet * 100).toFixed(2)}%\n`);

    totalPrecision += metrics.precision;
    totalRecall += metrics.recall;
    totalF1 += metrics.f1;
    totalGranularity += metrics.granularity;
    totalPlagDet += metrics.plagDet;
  }

  // Averages
  const macroPrecision = totalPrecision / totalCount;
  const macroRecall = totalRecall / totalCount;
  const macroF1 = totalF1 / totalCount;
  const macroGranularity = totalGranularity / totalCount;
  const macroPlagDet = totalPlagDet / totalCount;

  const report = [
    '# Plagiarism Engine Benchmark Report\n',
    '| Metric | Score |',
    '|---|---|',
    `| **Macro-Precision** | ${(macroPrecision * 100).toFixed(2)}% |`,
    `| **Macro-Recall** | ${(macroRecall * 100).toFixed(2)}% |`,
    `| **Macro-F1 (NormPlagDet)** | ${(macroF1 * 100).toFixed(2)}% |`,
    `| **Macro-Granularity** | ${macroGranularity.toFixed(2)} |`,
    `| **PlagDet** (PAN standard) | ${(macroPlagDet * 100).toFixed(2)}% |`,
    '\n*Generated automatically by run-plagiarism-benchmark.js*',
  ].join('\n');

  console.log(report);

  // Optionally write markdown report to file
  const reportPath = path.join(__dirname, '..', '..', 'plagiarism_benchmark_report.md');
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`\nMarkdown report saved to: ${reportPath}`);
}

const truthPath = process.argv[2] || path.join(__dirname, 'truth-dataset.json');

runBenchmark(truthPath)
  .then(() => {
    console.log('Benchmark completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Benchmark failed:', err);
    process.exit(1);
  });
