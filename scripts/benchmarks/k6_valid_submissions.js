import http from 'k6/http';
import { check, fail } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// A bounded upload burst. It measures concurrent clients, not distinct people.
const BASE_URL = __ENV.BASE_URL || 'http://localhost:43210';
const CLIENTS = Number(__ENV.CLIENTS || 50);
const PROJECT_ID = __ENV.PROJECT_ID;
if (!PROJECT_ID || !__ENV.DOCX_PATH || !__ENV.STUDENT_EMAIL || !__ENV.STUDENT_PASSWORD) {
  throw new Error('PROJECT_ID, DOCX_PATH, STUDENT_EMAIL and STUDENT_PASSWORD are required.');
}
if (!Number.isInteger(CLIENTS) || CLIENTS < 1 || CLIENTS > 50) {
  throw new Error('CLIENTS must be an integer between 1 and 50.');
}
const documentBytes = open(__ENV.DOCX_PATH, 'b');
if (documentBytes.byteLength < 500) throw new Error('Provide a complete, valid DOCX fixture.');
const accepted = new Counter('accepted_submissions');
const rejected = new Counter('rejected_submissions');
const rateLimited = new Counter('rate_limited_submissions');
const serverErrors = new Counter('server_error_submissions');
const unsuccessful = new Rate('unsuccessful_submissions');
const latency = new Trend('submission_latency_ms', true);

export const options = {
  scenarios: {
    submission_burst: {
      executor: 'per-vu-iterations', vus: CLIENTS, iterations: 1,
      maxDuration: '60s', gracefulStop: '5s',
    },
  },
  setupTimeout: '20s',
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(95)', 'p(99)'],
  thresholds: {
    accepted_submissions: [`count==${CLIENTS}`],
    unsuccessful_submissions: ['rate==0'],
    checks: ['rate==1'],
  },
};

export function setup() {
  const login = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: __ENV.STUDENT_EMAIL, password: __ENV.STUDENT_PASSWORD,
  }), { headers: { 'Content-Type': 'application/json' }, timeout: '15s', tags: { phase: 'setup' } });
  if (login.status !== 200) fail(`Authentication failed: HTTP ${login.status}`);
  const cookie = Object.entries(login.cookies)
    .flatMap(([name, values]) => values.length ? [`${name}=${values[0].value}`] : []).join('; ');
  if (!cookie) fail('Authentication returned no cookies.');
  const response = http.get(`${BASE_URL}/api/projects/${PROJECT_ID}`, {
    headers: { Cookie: cookie }, timeout: '10s', tags: { phase: 'setup' },
  });
  if (response.status !== 200) fail(`Project preflight failed: HTTP ${response.status}`);
  const body = response.json();
  const project = body.data?.project || body.data;
  if (!/^(Benchmark\b|Load Test\b|Disposable Manuscript Upload Benchmark\b)/i.test(project?.title || '')) {
    fail('Uploads are restricted to a dedicated Benchmark or Load Test project.');
  }
  if (project.titleStatus !== 'approved' || !project.panelistIds?.length) {
    fail('Benchmark project requires an approved title and assigned panelists.');
  }
  // Confirm the actual fixture and service-layer gates before starting the burst.
  const probe = http.post(`${BASE_URL}/api/submissions/${PROJECT_ID}/chapters`, {
    chapter: '1', remarks: 'Controlled benchmark preflight',
    file: http.file(documentBytes, 'benchmark-preflight.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
  }, { headers: { Cookie: cookie }, timeout: '10s', tags: { phase: 'setup' } });
  let probeSubmission;
  try { const body = probe.json(); probeSubmission = body.data?.submission || body.data; } catch { /* Fail closed below. */ }
  if (![200, 201].includes(probe.status) || !probeSubmission?._id) {
    fail(`Valid-file upload preflight failed: HTTP ${probe.status}`);
  }
  console.log(JSON.stringify({ kind: 'accepted_upload_preflight',
    submissionId: probeSubmission._id, projectId: PROJECT_ID,
    chapter: Number(probeSubmission.chapter), version: Number(probeSubmission.version) }));
  return { cookie };
}

export default function (data) {
  const response = http.post(`${BASE_URL}/api/submissions/${PROJECT_ID}/chapters`, {
    chapter: '1', remarks: `Controlled benchmark client ${__VU}`,
    file: http.file(documentBytes, `benchmark-client-${__VU}.docx`,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
  }, { headers: { Cookie: data.cookie }, timeout: '30s', tags: { phase: 'submission' } });
  latency.add(response.timings.duration);
  let submission;
  let errorCode = 'INVALID_RESPONSE';
  try {
    const body = response.json();
    submission = body.data?.submission || body.data;
    errorCode = body.error?.code || errorCode;
  } catch { /* Invalid JSON is a failed response. */ }
  const valid = check(response, {
    'submission accepted with persisted identity': (r) =>
      (r.status === 200 || r.status === 201) && Boolean(submission?._id),
  });
  unsuccessful.add(!valid);
  if (valid) {
    accepted.add(1);
    console.log(JSON.stringify({ kind: 'accepted_upload', client: __VU,
      submissionId: submission._id, projectId: PROJECT_ID,
      chapter: Number(submission.chapter), version: Number(submission.version) }));
  }
  else {
    rejected.add(1);
    if (response.status === 429) rateLimited.add(1);
    if (response.status >= 500) serverErrors.add(1);
    console.error(JSON.stringify({ client: __VU, status: response.status,
      error: errorCode }));
  }
}

export function handleSummary(data) {
  const result = { workload: 'one valid DOCX upload per concurrent client',
    clients: CLIENTS, accounts: 1, projectId: PROJECT_ID,
    metrics: data.metrics, rootGroup: data.root_group };
  return { [__ENV.SUMMARY_PATH || 'scratch/valid-submission-summary.json']: JSON.stringify(result, null, 2) };
}
