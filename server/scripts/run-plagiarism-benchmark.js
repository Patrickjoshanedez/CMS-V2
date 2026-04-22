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

  import fs from 'fs';
  import path from 'path';
  import { fileURLToPath } from 'url';

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, '..', '..');

  function toBoundedInt(value, fallback, min, max) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
  }

  function parseCliArgs(argv) {
    const options = {
      truthPath: path.join(__dirname, 'truth-dataset.json'),
      reportPath: path.join(repoRoot, 'plagiarism_benchmark_report.md'),
      jsonPath: '',
      label: '',
      appendMemory: true,
      kGramSize: toBoundedInt(process.env.PLAGIARISM_K_GRAM_SIZE, 7, 3, 128),
      windowSize: toBoundedInt(process.env.PLAGIARISM_WINDOW_SIZE, 4, 2, 256),
    };

    for (let index = 0; index < argv.length; index += 1) {
      const current = argv[index];
      const next = argv[index + 1];

      if (current === '--truth' && next) {
        options.truthPath = path.resolve(next);
        index += 1;
        continue;
      }

      if (current === '--report' && next) {
        options.reportPath = path.resolve(next);
        index += 1;
        continue;
      }

      if (current === '--json' && next) {
        options.jsonPath = path.resolve(next);
        index += 1;
        continue;
      }

      if (current === '--label' && next) {
        options.label = String(next || '').trim();
        index += 1;
        continue;
      }

      if (current === '--k' && next) {
        options.kGramSize = toBoundedInt(next, options.kGramSize, 3, 128);
        index += 1;
        continue;
      }

      if (current === '--w' && next) {
        options.windowSize = toBoundedInt(next, options.windowSize, 2, 256);
        index += 1;
        continue;
      }

      if (current === '--no-memory') {
        options.appendMemory = false;
      }
    }

    return options;
  }

  function normalizeSpan(span, documentLength) {
    const start = Number(span?.start);
    const end = Number(span?.end);

    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    if (end <= start) return null;

    return {
      start: Math.max(0, Math.min(documentLength, start)),
      end: Math.max(0, Math.min(documentLength, end)),
    };
  }

  function collectSpans(rawSpans, documentLength) {
    return (Array.isArray(rawSpans) ? rawSpans : [])
      .map((span) => normalizeSpan(span, documentLength))
      .filter(Boolean);
  }

  function computeCharacterMetrics(groundTruthSpans, detectedSpans, documentLength) {
    if (!Number.isFinite(documentLength) || documentLength <= 0) {
      return {
        precision: 1,
        recall: 1,
        f1: 1,
        granularity: 1,
        plagDet: 1,
      };
    }

    const truthMask = new Array(documentLength).fill(false);
    const detectedMask = new Array(documentLength).fill(false);

    groundTruthSpans.forEach((span) => {
      for (let index = span.start; index < span.end; index += 1) {
        truthMask[index] = true;
      }
    });

    detectedSpans.forEach((span) => {
      for (let index = span.start; index < span.end; index += 1) {
        detectedMask[index] = true;
      }
    });

    let truePositive = 0;
    let falsePositive = 0;
    let falseNegative = 0;

    for (let index = 0; index < documentLength; index += 1) {
      const truth = truthMask[index];
      const detected = detectedMask[index];

      if (truth && detected) truePositive += 1;
      if (!truth && detected) falsePositive += 1;
      if (truth && !detected) falseNegative += 1;
    }

    const precision =
      truePositive + falsePositive === 0 ? 1 : truePositive / (truePositive + falsePositive);
    const recall =
      truePositive + falseNegative === 0 ? 1 : truePositive / (truePositive + falseNegative);
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

    let granularityAccumulator = 0;
    let detectedCases = 0;

    groundTruthSpans.forEach((truthSpan) => {
      let overlapSegments = 0;
      detectedSpans.forEach((detectedSpan) => {
        if (Math.max(truthSpan.start, detectedSpan.start) < Math.min(truthSpan.end, detectedSpan.end)) {
          overlapSegments += 1;
        }
      });

      if (overlapSegments > 0) {
        granularityAccumulator += overlapSegments;
        detectedCases += 1;
      }
    });

    const granularity = detectedCases === 0 ? 1 : granularityAccumulator / detectedCases;
    const plagDet = f1 / Math.log2(1 + granularity);

    return {
      precision,
      recall,
      f1,
      granularity,
      plagDet,
    };
  }

  function computeSourceRecall(groundTruthSourceIds, detectedSourceIds) {
    const truth = new Set((Array.isArray(groundTruthSourceIds) ? groundTruthSourceIds : []).map(String));
    const detected = new Set((Array.isArray(detectedSourceIds) ? detectedSourceIds : []).map(String));

    if (truth.size === 0) {
      return {
        recall: null,
        hitCount: 0,
        totalTruthSources: 0,
      };
    }

    let hitCount = 0;
    truth.forEach((sourceId) => {
      if (detected.has(sourceId)) hitCount += 1;
    });

    return {
      recall: hitCount / truth.size,
      hitCount,
      totalTruthSources: truth.size,
    };
  }

  function ensureSampleTruthDataset(truthPath) {
    if (fs.existsSync(truthPath)) return;

    const seedDataset = [
      {
        id: 'seed_doc_1',
        text: 'Innovation in AI is advancing rapidly. The quick brown fox jumps over the lazy dog repeatedly. Technology changes everything quickly.',
        corpus: [
          {
            id: 'source_1',
            title: 'Source Material 1',
            text: 'The quick brown fox jumps over the lazy dog repeatedly.',
          },
        ],
        groundTruthSourceIds: ['source_1'],
        groundTruthSpans: [
          {
            start: 39,
            end: 94,
          },
        ],
      },
    ];

    fs.mkdirSync(path.dirname(truthPath), { recursive: true });
    fs.writeFileSync(truthPath, `${JSON.stringify(seedDataset, null, 2)}\n`, 'utf8');
  }

  function ensureMemoryLedgerHeader(memoryPath) {
    if (fs.existsSync(memoryPath)) return;

    const seed = [
      '# Winnowing Benchmark Memory',
      '',
      'Persistent benchmark ledger for k/w tuning sessions.',
      '',
      '| Timestamp (UTC) | Label | k | w | Macro Precision | Macro Recall | NormPlagDet (F1) | PlagDet | Granularity | Source Recall |',
      '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|',
      '',
    ].join('\n');

    fs.writeFileSync(memoryPath, seed, 'utf8');
  }

  function toPercent(value) {
    if (!Number.isFinite(value)) return 'N/A';
    return `${(value * 100).toFixed(2)}%`;
  }

  function appendMemoryLedger(memoryPath, summary) {
    ensureMemoryLedgerHeader(memoryPath);
    const row = [
      summary.generatedAt,
      summary.config.label || '-',
      summary.config.kGramSize,
      summary.config.windowSize,
      (summary.metrics.macroPrecision * 100).toFixed(2),
      (summary.metrics.macroRecall * 100).toFixed(2),
      (summary.metrics.macroNormPlagDet * 100).toFixed(2),
      (summary.metrics.macroPlagDet * 100).toFixed(2),
      summary.metrics.macroGranularity.toFixed(4),
      Number.isFinite(summary.metrics.macroSourceRecall)
        ? (summary.metrics.macroSourceRecall * 100).toFixed(2)
        : 'N/A',
    ];

    fs.appendFileSync(memoryPath, `| ${row.join(' | ')} |\n`, 'utf8');
  }

  function buildMarkdownReport(summary) {
    const lines = [
      '# Plagiarism Engine Benchmark Report',
      '',
      `Generated: ${summary.generatedAt}`,
      '',
      '## Configuration',
      '',
      '| Setting | Value |',
      '|---|---|',
      `| Truth Dataset | ${summary.config.truthPath} |`,
      `| k-gram Size (k) | ${summary.config.kGramSize} |`,
      `| Window Size (w) | ${summary.config.windowSize} |`,
      `| Label | ${summary.config.label || '-'} |`,
      '',
      '## Macro Metrics (PAN-style)',
      '',
      '| Metric | Score |',
      '|---|---|',
      `| Macro Precision | ${toPercent(summary.metrics.macroPrecision)} |`,
      `| Macro Recall | ${toPercent(summary.metrics.macroRecall)} |`,
      `| NormPlagDet (Macro F1) | ${toPercent(summary.metrics.macroNormPlagDet)} |`,
      `| PlagDet | ${toPercent(summary.metrics.macroPlagDet)} |`,
      `| Granularity | ${summary.metrics.macroGranularity.toFixed(4)} |`,
      `| Source Recall@10 | ${toPercent(summary.metrics.macroSourceRecall)} |`,
      '',
      '## Per-Case Results',
      '',
      '| Case ID | Precision | Recall | NormPlagDet (F1) | PlagDet | Granularity | Source Recall@10 |',
      '|---|---:|---:|---:|---:|---:|---:|',
    ];

    summary.cases.forEach((item) => {
      lines.push(
        `| ${item.caseId} | ${(item.metrics.precision * 100).toFixed(2)} | ${(item.metrics.recall * 100).toFixed(2)} | ${(item.metrics.f1 * 100).toFixed(2)} | ${(item.metrics.plagDet * 100).toFixed(2)} | ${item.metrics.granularity.toFixed(4)} | ${toPercent(item.sourceRecall)} |`,
      );
    });

    lines.push('', '*Generated automatically by run-plagiarism-benchmark.js*', '');
    return lines.join('\n');
  }

  async function runBenchmark() {
    const options = parseCliArgs(process.argv.slice(2));

    process.env.PLAGIARISM_K_GRAM_SIZE = String(options.kGramSize);
    process.env.PLAGIARISM_WINDOW_SIZE = String(options.windowSize);

    const { checkOriginality } = await import('../services/plagiarism.service.js');

    ensureSampleTruthDataset(options.truthPath);

    console.log(`Loading truth dataset: ${options.truthPath}`);
    const truthData = JSON.parse(fs.readFileSync(options.truthPath, 'utf8'));

    if (!Array.isArray(truthData) || truthData.length === 0) {
      throw new Error('Truth dataset is empty.');
    }

    const perCase = [];
    let precisionTotal = 0;
    let recallTotal = 0;
    let f1Total = 0;
    let plagDetTotal = 0;
    let granularityTotal = 0;
    const sourceRecallValues = [];

    for (const testCase of truthData) {
      const caseId = testCase?.id || `case_${perCase.length + 1}`;
      const inputText = String(testCase?.text || '');
      const corpus = (Array.isArray(testCase?.corpus) ? testCase.corpus : []).map((doc) => ({
        id: doc?.id,
        title: doc?.title || 'Unknown',
        chapter: doc?.chapter ?? null,
        text: String(doc?.text || ''),
      }));

      const result = await checkOriginality(inputText, corpus, {
        kGramSize: options.kGramSize,
        windowSize: options.windowSize,
      });

      const detectedSpans = [];
      const detectedSourceIds = [];
      (result?.matchedSources || []).forEach((source) => {
        if (source?.submissionId) detectedSourceIds.push(String(source.submissionId));
        (Array.isArray(source?.spans) ? source.spans : []).forEach((span) => {
          detectedSpans.push(span);
        });
      });

      const groundTruthSpans = collectSpans(testCase?.groundTruthSpans, inputText.length);
      const normalizedDetectedSpans = collectSpans(detectedSpans, inputText.length);

      const metrics = computeCharacterMetrics(
        groundTruthSpans,
        normalizedDetectedSpans,
        inputText.length,
      );

      const sourceTruth =
        testCase?.groundTruthSourceIds || testCase?.groundTruthSources || testCase?.sourceIds || [];
      const sourceRecall = computeSourceRecall(sourceTruth, detectedSourceIds);

      if (Number.isFinite(sourceRecall.recall)) {
        sourceRecallValues.push(sourceRecall.recall);
      }

      perCase.push({
        caseId,
        sourceRecall: sourceRecall.recall,
        metrics,
      });

      precisionTotal += metrics.precision;
      recallTotal += metrics.recall;
      f1Total += metrics.f1;
      plagDetTotal += metrics.plagDet;
      granularityTotal += metrics.granularity;

      console.log(
        `${caseId}: P=${toPercent(metrics.precision)} R=${toPercent(metrics.recall)} F1=${toPercent(metrics.f1)} PlagDet=${toPercent(metrics.plagDet)}`,
      );
    }

    const total = perCase.length;
    const macroSourceRecall =
      sourceRecallValues.length > 0
        ? sourceRecallValues.reduce((sum, value) => sum + value, 0) / sourceRecallValues.length
        : Number.NaN;

    const summary = {
      generatedAt: new Date().toISOString(),
      config: {
        truthPath: options.truthPath,
        kGramSize: options.kGramSize,
        windowSize: options.windowSize,
        label: options.label,
      },
      metrics: {
        macroPrecision: precisionTotal / total,
        macroRecall: recallTotal / total,
        macroNormPlagDet: f1Total / total,
        macroPlagDet: plagDetTotal / total,
        macroGranularity: granularityTotal / total,
        macroSourceRecall,
      },
      totals: {
        cases: total,
      },
      cases: perCase,
    };

    const report = buildMarkdownReport(summary);
    fs.mkdirSync(path.dirname(options.reportPath), { recursive: true });
    fs.writeFileSync(options.reportPath, report, 'utf8');
    console.log(`Saved markdown report: ${options.reportPath}`);

    if (options.jsonPath) {
      fs.mkdirSync(path.dirname(options.jsonPath), { recursive: true });
      fs.writeFileSync(options.jsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
      console.log(`Saved JSON report: ${options.jsonPath}`);
    }

    if (options.appendMemory) {
      const memoryPath = path.join(repoRoot, 'MEMORY.md');
      appendMemoryLedger(memoryPath, summary);
      console.log(`Updated memory ledger: ${memoryPath}`);
    }

    return summary;
  }

  runBenchmark()
    .then((summary) => {
      const message = [
        'Benchmark complete:',
        `k=${summary.config.kGramSize}`,
        `w=${summary.config.windowSize}`,
        `NormPlagDet=${toPercent(summary.metrics.macroNormPlagDet)}`,
        `PlagDet=${toPercent(summary.metrics.macroPlagDet)}`,
      ].join(' ');
      console.log(message);
      process.exit(0);
    })
    .catch((error) => {
      console.error(`Benchmark failed: ${error.message}`);
      process.exit(1);
    });
