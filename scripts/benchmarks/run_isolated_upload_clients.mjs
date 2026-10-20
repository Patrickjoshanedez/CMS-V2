import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';

const directory = '/app/scratch/review-upload';
const bases = (process.env.UPLOAD_BASE_URLS || 'http://cms-review-upload-server:43212').split(',');
if (bases.some((value) => {
  const parsed = new URL(value);
  return parsed.protocol !== 'http:' || parsed.hostname !== 'cms-review-upload-server' || !['43212', '43213'].includes(parsed.port);
})) throw new Error('Only isolated upload worker endpoints are permitted.');
const base = bases[0];
const clients = Number(process.env.CLIENTS || 50);
if (!Number.isInteger(clients) || clients < 1 || clients > 50) throw new Error('Invalid bounded client count');
const watchdog = setTimeout(() => { console.error('Watchdog 110s timeout'); process.exit(124); }, 110000);
const result = { status: 'blocked', clients, accounts: 1, workload: 'same project and chapter; finite concurrent upload burst',
  accepted: [], requests: [], expectedAccepted: clients + 1, workersStarted: false, applicationEndpoints: bases };
try {
  const bootstrap = JSON.parse(await readFile(`${directory}/bootstrap.json`, 'utf8'));
  const fixturePath = `${directory}/benchmark-upload.docx`;
  const fixture = await readFile(fixturePath);
  result.fixturePath = fixturePath;
  result.fixtureSha256 = createHash('sha256').update(fixture).digest('hex');
  result.fixtureBytes = fixture.length;
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: bootstrap.email, password: bootstrap.password }), signal: AbortSignal.timeout(15000) });
  if (login.status !== 200) throw new Error(`Authentication HTTP ${login.status}`);
  const cookie = login.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
  if (!cookie) throw new Error('Missing authentication cookie');
  const projectResponse = await fetch(`${base}/api/projects/${bootstrap.projectId}`, {
    headers: { Cookie: cookie }, signal: AbortSignal.timeout(10000) });
  const projectBody = await projectResponse.json();
  const project = projectBody.data?.project;
  if (projectResponse.status !== 200 || !project || project.titleStatus !== 'approved' ||
    !project.title.startsWith('Disposable Manuscript Upload Benchmark ') || !project.panelistIds?.length) {
    throw new Error('Dedicated approved benchmark project precondition failed');
  }
  result.projectId = bootstrap.projectId;
  const upload = async (client) => {
    const serverUrl = client === 'preflight' ? base : bases[(Number(client) - 1) % bases.length];
    const began = performance.now();
    const form = new FormData();
    form.append('chapter', '1');
    form.append('remarks', `Isolated benchmark client ${client}`);
    form.append('file', new Blob([fixture], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), `benchmark-client-${client}.docx`);
    let status = 0, body;
    try {
      const response = await fetch(`${serverUrl}/api/submissions/${bootstrap.projectId}/chapters`, {
        method: 'POST', headers: { Cookie: cookie }, body: form, signal: AbortSignal.timeout(30000) });
      status = response.status;
      body = await response.json();
    } catch (error) { body = { error: { code: error.name, message: error.message } }; }
    const elapsed = performance.now() - began;
    const submission = body.data?.submission;
    const success = [200, 201].includes(status) && Boolean(submission?._id);
    const record = { client, serverUrl, status, success, latencyMs: elapsed,
      errorCode: body.error?.code || null, errorMessage: body.error?.message || null };
    if (success) result.accepted.push({ submissionId: submission._id, projectId: bootstrap.projectId,
      chapter: Number(submission.chapter), version: Number(submission.version) });
    return record;
  };
  result.preflight = await upload('preflight');
  if (!result.preflight.success) throw new Error(`Real DOCX preflight failed: ${result.preflight.status} ${result.preflight.errorCode}`);
  const started = performance.now();
  result.requests = await Promise.all(Array.from({ length: clients }, (_, index) => upload(index + 1)));
  result.durationMs = performance.now() - started;
  result.successfulRequests = result.requests.filter((request) => request.success).length;
  result.failedRequests = clients - result.successfulRequests;
  const values = result.requests.map((request) => request.latencyMs).sort((a, b) => a - b);
  const quantile = (q) => { const i = (values.length - 1) * q, low = Math.floor(i); return values[low] + (values[Math.ceil(i)] - values[low]) * (i - low); };
  result.latencyMs = { mean: values.reduce((sum, v) => sum + v, 0) / values.length,
    min: values[0], median: quantile(0.5), p95: quantile(0.95), p99: quantile(0.99), max: values.at(-1) };
  result.status = result.failedRequests === 0 ? 'passed_http_acceptance' : 'failed_http_acceptance';
} catch (error) { result.error = { name: error.name, message: error.message }; }
finally {
  clearTimeout(watchdog);
  await writeFile(`${directory}/accepted-results.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  process.exit(result.status === 'passed_http_acceptance' ? 0 : 1);
}
