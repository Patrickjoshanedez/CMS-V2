import http from 'k6/http';
import { check, sleep } from 'k6';

// ─────────────────────────────────────────────────────────────────────────────
// CMS-V2 Pre-Scan Latency Benchmark (Plagiarism Engine: POST /check-sync)
// Measures ChromaDB vector similarity search + Winnowing on CPU
// ─────────────────────────────────────────────────────────────────────────────

export const options = {
  scenarios: {
    sequential_vector_prescan: {
      executor: 'constant-vus',
      vus: 1,
      duration: __ENV.BENCHMARK_DURATION || '30s',
    },
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(95)', 'p(99)'],
  thresholds: {
    http_req_failed: ['rate<0.01'],
  },
};

const API_URL = __ENV.PLAGIARISM_API_URL || 'http://localhost:8001';

const TEST_PROPOSALS = [
  {
    doc_id: 'k6_prescan_01',
    text: 'A Comprehensive Study on IoT Based Accident Detection Systems for Smart Vehicles with automated telemetry notifications.',
  },
  {
    doc_id: 'k6_prescan_02',
    text: 'Smart parcel locker system with automated optical character recognition authentication and cloud locker telemetry.',
  },
  {
    doc_id: 'k6_prescan_03',
    text: 'Hybrid multi-modal plagiarism detection using sentence transformers and winnowing exact Rabin-Karp fingerprinting.',
  },
  {
    doc_id: 'k6_prescan_04',
    text: 'AI-Powered weather-aware smart wardrobe recommendation engine with machine learning color palette coordination.',
  },
];

export default function () {
  const proposal = TEST_PROPOSALS[Math.floor(Math.random() * TEST_PROPOSALS.length)];
  const payload = JSON.stringify({
    document_id: `k6_${Date.now()}_${__VU}_${__ITER}`,
    text: proposal.text,
    metadata: {
      title: 'k6 Title Proposal Pre-Scan',
    },
  });

  const res = http.post(`${API_URL}/check-sync`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'check-sync succeeded (200)': (r) => r.status === 200,
  });

  sleep(0.05);
}
