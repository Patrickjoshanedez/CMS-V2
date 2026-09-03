import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const benchmarkScript = path.join(__dirname, 'run-plagiarism-benchmark.js');
const defaultTruthPath = path.join(__dirname, 'truth-dataset.json');
const matrixJsonPath = path.join(__dirname, 'benchmark-matrix-results.json');
const finalReportPath = path.join(repoRoot, 'plagiarism_benchmark_report.md');

const DEFAULT_MATRIX = [
  { k: 5, w: 4 },
  { k: 7, w: 4 },
  { k: 9, w: 5 },
  { k: 11, w: 6 },
  { k: 13, w: 8 },
];

function parseMatrix(raw) {
  if (!raw || !raw.trim()) return DEFAULT_MATRIX;

  const parsed = raw
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const match = /^(\d+)x(\d+)$/i.exec(token);
      if (!match) return null;
      return {
        k: Number.parseInt(match[1], 10),
        w: Number.parseInt(match[2], 10),
      };
    })
    .filter(Boolean);

  return parsed.length > 0 ? parsed : DEFAULT_MATRIX;
}

function parseArgs(argv) {
  const options = {
    truthPath: defaultTruthPath,
    matrix: DEFAULT_MATRIX,
    label: 'matrix-sweep',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if (current === '--truth' && next) {
      options.truthPath = path.resolve(next);
      index += 1;
      continue;
    }

    if (current === '--matrix' && next) {
      options.matrix = parseMatrix(next);
      index += 1;
      continue;
    }

    if (current === '--label' && next) {
      options.label = String(next || '').trim() || options.label;
      index += 1;
    }
  }

  return options;
}

function runOneCombination(options, pair, index) {
  const runId = `${index + 1}_k${pair.k}_w${pair.w}`;
  const tempReportPath = path.join(repoRoot, 'tmp', `benchmark-${runId}.md`);
  const tempJsonPath = path.join(repoRoot, 'tmp', `benchmark-${runId}.json`);

  const args = [
    benchmarkScript,
    '--truth',
    options.truthPath,
    '--k',
    String(pair.k),
    '--w',
    String(pair.w),
    '--label',
    `${options.label}-${runId}`,
    '--report',
    tempReportPath,
    '--json',
    tempJsonPath,
  ];

  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    env: process.env,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    const details = [
      `Benchmark subprocess failed for k=${pair.k}, w=${pair.w}`,
      result.stdout || '',
      result.stderr || '',
    ]
      .join('\n')
      .trim();
    throw new Error(details);
  }

  const summary = JSON.parse(fs.readFileSync(tempJsonPath, 'utf8'));

  return {
    k: pair.k,
    w: pair.w,
    reportPath: tempReportPath,
    jsonPath: tempJsonPath,
    metrics: summary.metrics,
    summary,
  };
}

function selectBest(results) {
  const sorted = [...results].sort((left, right) => {
    const f1Diff = right.metrics.macroNormPlagDet - left.metrics.macroNormPlagDet;
    if (Math.abs(f1Diff) > 1e-9) return f1Diff;

    const plagDetDiff = right.metrics.macroPlagDet - left.metrics.macroPlagDet;
    if (Math.abs(plagDetDiff) > 1e-9) return plagDetDiff;

    return right.metrics.macroPrecision - left.metrics.macroPrecision;
  });

  return sorted[0];
}

function toPercent(value) {
  if (!Number.isFinite(value)) return 'N/A';
  return `${(value * 100).toFixed(2)}%`;
}

function buildMatrixReport(options, results, best) {
  const lines = [
    '# Winnowing Matrix Benchmark',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Sweep Configuration',
    '',
    '| Setting | Value |',
    '|---|---|',
    `| Truth Dataset | ${options.truthPath} |`,
    `| Matrix | ${results.map((item) => `${item.k}x${item.w}`).join(', ')} |`,
    '',
    '## Results',
    '',
    '| Rank | k | w | NormPlagDet (F1) | PlagDet | Precision | Recall | Granularity | Source Recall@10 |',
    '|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
  ];

  const ranked = [...results].sort(
    (left, right) => right.metrics.macroNormPlagDet - left.metrics.macroNormPlagDet,
  );

  ranked.forEach((item, index) => {
    lines.push(
      `| ${index + 1} | ${item.k} | ${item.w} | ${(item.metrics.macroNormPlagDet * 100).toFixed(2)}% | ${(item.metrics.macroPlagDet * 100).toFixed(2)}% | ${(item.metrics.macroPrecision * 100).toFixed(2)}% | ${(item.metrics.macroRecall * 100).toFixed(2)}% | ${item.metrics.macroGranularity.toFixed(4)} | ${toPercent(item.metrics.macroSourceRecall)} |`,
    );
  });

  lines.push(
    '',
    '## Best Configuration',
    '',
    `- k = ${best.k}`,
    `- w = ${best.w}`,
    `- NormPlagDet (F1) = ${(best.metrics.macroNormPlagDet * 100).toFixed(2)}%`,
    `- PlagDet = ${(best.metrics.macroPlagDet * 100).toFixed(2)}%`,
    '',
    '*Generated automatically by tune-winnowing-matrix.js*',
    '',
  );

  return lines.join('\n');
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  fs.mkdirSync(path.join(repoRoot, 'tmp'), { recursive: true });

  const results = options.matrix.map((pair, index) => runOneCombination(options, pair, index));
  const best = selectBest(results);

  const matrixSummary = {
    generatedAt: new Date().toISOString(),
    truthPath: options.truthPath,
    matrix: options.matrix,
    best: {
      k: best.k,
      w: best.w,
      metrics: best.metrics,
    },
    results: results.map((item) => ({
      k: item.k,
      w: item.w,
      metrics: item.metrics,
      reportPath: item.reportPath,
      jsonPath: item.jsonPath,
    })),
  };

  fs.writeFileSync(matrixJsonPath, `${JSON.stringify(matrixSummary, null, 2)}\n`, 'utf8');

  const report = buildMatrixReport(options, results, best);
  fs.writeFileSync(finalReportPath, report, 'utf8');

  console.log(`Saved matrix summary JSON: ${matrixJsonPath}`);
  console.log(`Saved matrix report: ${finalReportPath}`);
  console.log(
    `Best configuration: k=${best.k}, w=${best.w}, NormPlagDet=${(best.metrics.macroNormPlagDet * 100).toFixed(2)}%`,
  );
}

try {
  main();
  process.exit(0);
} catch (error) {
  console.error(`Matrix tuning failed: ${error.message}`);
  process.exit(1);
}
