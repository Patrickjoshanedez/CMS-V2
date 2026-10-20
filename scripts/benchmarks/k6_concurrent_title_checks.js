import http from 'k6/http';
import { check, fail } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Bounded, read-only title screening workload; excludes login timing.
const baseUrl = __ENV.BASE_URL || 'http://localhost:43210';
const clients = Number(__ENV.CLIENTS || 50);
if (!__ENV.STUDENT_EMAIL || !__ENV.STUDENT_PASSWORD) {
  throw new Error('A benchmark account is required.');
}
if (!Number.isInteger(clients) || clients < 1 || clients > 50) {
  throw new Error('CLIENTS must be between 1 and 50.');
}
const accepted = new Counter('completed_title_checks');
const failures = new Rate('failed_title_checks');
const latency = new Trend('title_check_latency_ms', true);
export const options = {
  scenarios: {
    title_checks: {
      executor: 'per-vu-iterations',
      vus: clients,
      iterations: 2,
      maxDuration: '60s',
      gracefulStop: '5s',
    },
  },
  setupTimeout: '20s',
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(95)', 'p(99)'],
  thresholds: {
    completed_title_checks: [`count==${clients * 2}`],
    failed_title_checks: ['rate==0'],
    checks: ['rate==1'],
  },
};

export function setup() {
  const response = http.post(
    `${baseUrl}/api/auth/login`,
    JSON.stringify({
      email: __ENV.STUDENT_EMAIL,
      password: __ENV.STUDENT_PASSWORD,
    }),
    { headers: { 'Content-Type': 'application/json' }, timeout: '15s', tags: { phase: 'setup' } },
  );
  if (response.status !== 200) fail(`Authentication failed: HTTP ${response.status}`);
  const cookie = Object.entries(response.cookies)
    .flatMap(([name, values]) => (values.length ? [`${name}=${values[0].value}`] : []))
    .join('; ');
  if (!cookie) fail('No authentication cookie returned.');
  return { cookie };
}

export default function (data) {
  const response = http.post(
    `${baseUrl}/api/projects/title-check`,
    JSON.stringify({
      title: `Benchmark Environmental Telemetry and Campus Monitoring Study ${__VU}`,
      keywords: ['telemetry', 'environmental monitoring'],
    }),
    {
      headers: { 'Content-Type': 'application/json', Cookie: data.cookie },
      timeout: '30s',
      tags: { phase: 'title_check' },
    },
  );
  let body;
  try {
    body = response.json();
  } catch {
    /* Invalid JSON fails the check. */
  }
  const valid = check(response, {
    'title-check returns successful JSON': (r) =>
      r.status === 200 && body?.success === true && Boolean(body.data),
  });
  latency.add(response.timings.duration);
  failures.add(!valid);
  if (valid) accepted.add(1);
  else
    console.error(
      JSON.stringify({
        client: __VU,
        status: response.status,
        code: body?.error?.code || 'INVALID_RESPONSE',
      }),
    );
}

export function handleSummary(data) {
  return {
    [__ENV.SUMMARY_PATH || 'scratch/concurrent-title-check-summary.json']: JSON.stringify(
      {
        clients,
        accounts: 1,
        requestsExpected: clients * 2,
        workload: 'read-only authenticated title screening; no submissions',
        metrics: data.metrics,
        rootGroup: data.root_group,
      },
      null,
      2,
    ),
  };
}
