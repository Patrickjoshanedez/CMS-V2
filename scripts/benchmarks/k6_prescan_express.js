import http from 'k6/http';
import { check, sleep } from 'k6';

// ─────────────────────────────────────────────────────────────────────────────
// CMS-V2 Pre-Scan Latency Benchmark (Express Route: POST /api/projects/title-check)
// ─────────────────────────────────────────────────────────────────────────────

export const options = {
  scenarios: {
    sequential_prescan: {
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

const BASE_URL = __ENV.BASE_URL || 'http://localhost:43210';
const STUDENT_EMAIL = __ENV.STUDENT_EMAIL || 'adrian.navarro@student.buksu.edu.ph';
const STUDENT_PASSWORD = __ENV.STUDENT_PASSWORD || 'Password123!';

// Titles to test varying word overlap
const TEST_TITLES = [
  'A Comprehensive Study on IoT Based Accident Detection Systems for Smart Vehicles',
  'Automated Emergency Notification Framework Using Microcontroller Accelerometer Telemetry',
  'AI-Powered Smart Campus Environmental Quality Monitoring and Predictive Analytics',
  'Real-Time Water Quality Assessment System Using Low-Cost IoT Sensor Network',
  'Deep Learning Approaches for Autonomous Plant Disease Identification in Agriculture',
  'Cloud-Based Inventory and Procurement Management System for BukSU Laboratory Supplies',
];

export function setup() {
  // Authenticate student to obtain HTTP-only JWT cookies
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
  const title = TEST_TITLES[Math.floor(Math.random() * TEST_TITLES.length)];
  const payload = JSON.stringify({
    title: title,
    keywords: ['IoT', 'Embedded Systems', 'Telemetry'],
  });

  const res = http.post(`${BASE_URL}/api/projects/title-check`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Cookie: data.cookieHeader,
    },
  });

  check(res, {
    'title-check succeeded (200)': (r) => r.status === 200,
  });

  // Short pacing sleep
  sleep(0.05);
}
