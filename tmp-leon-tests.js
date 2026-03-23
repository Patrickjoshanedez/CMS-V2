const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:5001';
const LEON = { email: 'leon.mentor.buksu@gmail.com', password: 'Password123!' };
const STUDENT = { email: 'bennettchristiangeofferdon15@gmail.com', password: 'Password123!' };

function cookieHeaderFrom(response) {
  const setCookie = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean);
  return setCookie.map((c) => c.split(';')[0]).join('; ');
}

async function login(credentials) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Login failed for ${credentials.email}: ${res.status} ${text}`);
  return { cookie: cookieHeaderFrom(res), status: res.status };
}

(async () => {
  const results = [];

  const leonAuth = await login(LEON);
  const leonHeaders = { Cookie: leonAuth.cookie };
  results.push(['S1-1 Leon auth', leonAuth.status === 200, `status=${leonAuth.status}`]);

  const statsRes = await fetch(`${BASE}/api/dashboard/stats`, { headers: leonHeaders });
  const statsJson = await statsRes.json();
  const ghostSubmissionId = statsJson?.data?.pendingReviews?.[0]?._id;
  results.push(['S1-2 Ghost submission lookup', Boolean(ghostSubmissionId), `submissionId=${ghostSubmissionId || 'none'}`]);

  if (ghostSubmissionId) {
    const viewRes = await fetch(`${BASE}/api/submissions/${ghostSubmissionId}/view`, { headers: leonHeaders });
    const viewJson = await viewRes.json().catch(() => ({}));
    results.push(['S1-3 Ghost view endpoint status', viewRes.status === 404, `status=${viewRes.status}`]);
    results.push(['S1-4 Ghost error code', viewJson?.error?.code === 'SUBMISSION_FILE_UNAVAILABLE', `code=${viewJson?.error?.code || 'none'}`]);
  } else {
    results.push(['S1-3 Ghost view endpoint status', false, 'no pending review item found']);
    results.push(['S1-4 Ghost error code', false, 'no pending review item found']);
  }

  const healthAfterGhost = await fetch(`${BASE}/api/health`);
  results.push(['S1-5 App alive after ghost request', healthAfterGhost.status === 200, `health=${healthAfterGhost.status}`]);

  const studentAuth = await login(STUDENT);
  const studentHeaders = { Cookie: studentAuth.cookie };
  results.push(['S2-1 Student auth', studentAuth.status === 200, `status=${studentAuth.status}`]);

  const myProjectRes = await fetch(`${BASE}/api/projects/me`, { headers: studentHeaders });
  const myProjectJson = await myProjectRes.json();
  const projectId = myProjectJson?.data?.project?._id;
  results.push(['S2-2 Student project resolved', Boolean(projectId), `projectId=${projectId || 'none'} status=${myProjectRes.status}`]);

  let uploadedSubmissionId = null;
  if (projectId) {
    const tempPath = path.join(process.cwd(), 'tmp-upload-ch2.txt');
    fs.writeFileSync(tempPath, `Integration test upload ${new Date().toISOString()}\n`);

    const formData = new FormData();
    formData.append('chapter', '2');
    formData.append('remarks', 'Automated healthy-path regression test upload');
    const blob = new Blob([fs.readFileSync(tempPath)], { type: 'text/plain' });
    formData.append('file', blob, 'tmp-upload-ch2.txt');

    const uploadRes = await fetch(`${BASE}/api/submissions/${projectId}/chapters`, {
      method: 'POST',
      headers: { Cookie: studentAuth.cookie },
      body: formData,
    });
    const uploadText = await uploadRes.text();
    let uploadJson = null;
    try { uploadJson = JSON.parse(uploadText); } catch (_e) {}

    uploadedSubmissionId = uploadJson?.data?.submission?._id || null;
    results.push(['S2-3 Student upload new revision', uploadRes.status === 201 || uploadRes.status === 200, `status=${uploadRes.status}`]);
    results.push(['S2-4 Uploaded submission id', Boolean(uploadedSubmissionId), `submissionId=${uploadedSubmissionId || 'none'}`]);
  } else {
    results.push(['S2-3 Student upload new revision', false, 'project not found']);
    results.push(['S2-4 Uploaded submission id', false, 'project not found']);
  }

  const leonAuth2 = await login(LEON);
  const leonHeaders2 = { Cookie: leonAuth2.cookie };
  results.push(['S2-5 Leon re-auth', leonAuth2.status === 200, `status=${leonAuth2.status}`]);

  if (uploadedSubmissionId) {
    const wsRes = await fetch(`${BASE}/api/submissions/${uploadedSubmissionId}/review-workspace`, { headers: leonHeaders2 });
    results.push(['S2-6 Adviser workspace for new submission', wsRes.status === 200, `status=${wsRes.status}`]);

    const viewRes = await fetch(`${BASE}/api/submissions/${uploadedSubmissionId}/view`, { headers: leonHeaders2 });
    const viewText = await viewRes.text();
    let viewJson = null;
    try { viewJson = JSON.parse(viewText); } catch (_e) {}
    const hasUrl = Boolean(viewJson?.data?.url);

    results.push(['S2-7 New submission view endpoint', viewRes.status === 200, `status=${viewRes.status}`]);
    results.push(['S2-8 New submission has view URL', hasUrl, `hasUrl=${hasUrl}`]);
  } else {
    results.push(['S2-6 Adviser workspace for new submission', false, 'upload did not create submission']);
    results.push(['S2-7 New submission view endpoint', false, 'upload did not create submission']);
    results.push(['S2-8 New submission has view URL', false, 'upload did not create submission']);
  }

  const instructorKpiRes = await fetch(`${BASE}/api/dashboard/instructor/kpis`, { headers: leonHeaders2 });
  let instructorKpiBody = null;
  try { instructorKpiBody = await instructorKpiRes.json(); } catch (_e) {}
  results.push(['S3-1 Adviser blocked from instructor KPI', instructorKpiRes.status === 403, `status=${instructorKpiRes.status}`]);
  results.push(['S3-2 RBAC error body present', Boolean(instructorKpiBody?.error || instructorKpiBody?.message), `bodyKeys=${Object.keys(instructorKpiBody || {}).join(',')}`]);

  const passCount = results.filter(([, pass]) => pass).length;
  const failCount = results.length - passCount;
  console.log('=== LEON WORKFLOW TEST MATRIX ===');
  for (const [name, pass, detail] of results) console.log(`${pass ? 'PASS' : 'FAIL'} | ${name} | ${detail}`);
  console.log(`SUMMARY pass=${passCount} fail=${failCount} total=${results.length}`);

  process.exit(failCount > 0 ? 2 : 0);
})().catch((error) => {
  console.error('HARNESS_ERROR', error.message);
  process.exit(1);
});
