import http from 'k6/http';
import { check, sleep } from 'k6';

// ─────────────────────────────────────────────────────────────────────────────
// CMS-V2 Concurrent User Submissions Benchmark (k6)
// Targets POST /api/submissions/:projectId/chapters with multipart DOCX
// ─────────────────────────────────────────────────────────────────────────────

export const options = {
  scenarios: {
    ramping_submissions: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: __ENV.RAMP_UP_DURATION || '10s', target: 50 }, // Ramp to 50 VUs
        { duration: __ENV.STEADY_DURATION || '30s', target: 50 }, // Steady state
        { duration: __ENV.RAMP_DOWN_DURATION || '5s', target: 0 }, // Ramp down
      ],
      gracefulRampDown: '5s',
    },
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(95)', 'p(99)'],
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:43210';
const STUDENT_EMAIL = __ENV.STUDENT_EMAIL || 'adrian.navarro@student.buksu.edu.ph';
const STUDENT_PASSWORD = __ENV.STUDENT_PASSWORD || 'Password123!';
const PROJECT_ID = __ENV.PROJECT_ID || '6ace911a729374e9daf2b21f';

// Minimal valid DOCX binary (ZIP header)
const MOCK_DOCX_BIN = [
  0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00, 0x08, 0x00, 0x00, 0x00, 0x21, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x5b, 0x43,
  0x6f, 0x6e, 0x74, 0x65, 0x6e, 0x74, 0x5f, 0x54, 0x79, 0x70, 0x65, 0x73, 0x5d, 0x2e, 0x78, 0x6d,
  0x6c, 0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
];

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: STUDENT_EMAIL, password: STUDENT_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(loginRes, {
    'login successful (200)': (r) => r.status === 200,
  });

  let cookieHeader = '';
  for (const [key, vals] of Object.entries(loginRes.cookies)) {
    if (vals && vals.length > 0) {
      cookieHeader += `${key}=${vals[0].value}; `;
    }
  }

  return { cookieHeader };
}

export default function (data) {
  const payload = {
    chapter: '1',
    title: 'Chapter 1: Problem Statement and Background',
    file: http.file(
      new Uint8Array(MOCK_DOCX_BIN),
      'chapter1_draft.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ),
  };

  const res = http.post(`${BASE_URL}/api/submissions/${PROJECT_ID}/chapters`, payload, {
    headers: {
      Cookie: data.cookieHeader,
    },
  });

  check(res, {
    'rate limited (429) or accepted (201/200) or validation (400)': (r) =>
      r.status === 201 || r.status === 200 || r.status === 400 || r.status === 429,
    'not 500 server crash': (r) => r.status !== 500,
  });

  sleep(0.1);
}
