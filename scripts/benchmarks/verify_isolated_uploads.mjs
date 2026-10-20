/** Read-only persistence and storage verification for explicitly isolated uploads. */
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const at = arg.indexOf('=');
  return [arg.slice(0, at), arg.slice(at + 1)];
}));
const outputPath = resolve(args['--output'] || 'scratch/qa-evidence/2026-10-15-review-validation/isolated-upload-verification.json');
const result = { status: 'blocked', checks: {}, failures: [], objects: [], orphanRecords: [],
  note: 'Read-only Mongo model queries and official storageService.downloadFile; no raw storage SDK.' };
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');
let mongoose;
const timer = setTimeout(() => {
  console.error('Watchdog 110s timeout');
  process.exit(124);
}, 110_000);

async function persist() {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(result, null, 2));
}

function isolatedHost(hostname) {
  return /^(cms-review-|cms-isolated-|cms_upload_test|cms-review-upload)/.test(hostname);
}

try {
  if (process.env.ISOLATED_UPLOAD_BENCHMARK !== 'true' && process.env.ISOLATED_UPLOAD_TEST !== 'true') throw new Error('ISOLATED_UPLOAD_BENCHMARK=true required');
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) throw new Error('Isolated MONGODB_URI required');
  const mongoUrl = new URL(mongoUri);
  const database = mongoUrl.pathname.slice(1);
  if (!isolatedHost(mongoUrl.hostname) || !/^(cms_review_|cms_isolated_|cms_upload_test)/.test(database)) {
    throw new Error('Refusing verification outside isolated Mongo hostname and database prefix');
  }
  const storageEndpoint = process.env.S3_ENDPOINT || process.env.AWS_S3_ENDPOINT;
  if (!storageEndpoint || !isolatedHost(new URL(storageEndpoint).hostname)) {
    throw new Error('Refusing verification outside isolated storage hostname');
  }
  if (process.env.STORAGE_MODE !== 's3') throw new Error('Real isolated S3-compatible storage required');
  const require = createRequire(new URL('../../server/package.json', import.meta.url));
  const AdmZip = require('adm-zip');
  const fixturePath = resolve(args['--fixture'] || 'scratch/qa-evidence/2026-10-15-review-validation/isolated-upload-fixture.docx');
  const fixture = await readFile(fixturePath);
  const zip = new AdmZip(fixture);
  for (const entry of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml']) {
    if (!zip.getEntry(entry)) throw new Error(`Invalid DOCX fixture: missing ${entry}`);
  }
  const documentXml = zip.readAsText('word/document.xml');
  if (!documentXml.includes('w:document') || !documentXml.includes('w:body')) throw new Error('Invalid WordprocessingML body');
  const fixtureHash = sha256(fixture);
  const manifest = JSON.parse(await readFile(resolve(args['--accepted']), 'utf8'));
  const accepted = manifest.accepted;
  if (!Array.isArray(accepted)) throw new Error('Accepted manifest must contain accepted array');
  const expected = Number(args['--expected'] ?? manifest.expectedAccepted);
  if (!Number.isInteger(expected) || expected < 1) throw new Error('Positive expected accepted count required');
  const ids = accepted.map((item) => String(item.submissionId || item._id || item.id));
  if (ids.some((id) => !/^[a-f\d]{24}$/i.test(id))) throw new Error('Accepted entries must have valid submission IDs');
  result.fixture = { path: fixturePath, bytes: fixture.length, sha256: fixtureHash, validOoxml: true };
  result.isolation = { mongoHostname: mongoUrl.hostname, database, storageHostname: new URL(storageEndpoint).hostname };
  result.checks.acceptedCount = accepted.length === expected;
  result.checks.uniqueAcceptedIds = new Set(ids).size === ids.length;
  if (manifest.fixtureSha256 && manifest.fixtureSha256 !== fixtureHash) throw new Error('Submitted fixture hash does not match verification fixture');
  mongoose = require('mongoose');
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  const { default: Submission } = await import('../../server/modules/submissions/submission.model.js');
  const { default: storageService } = await import('../../server/services/storage.index.js');
  const records = await Submission.find({}).select('_id projectId chapter type version storageKey fileSize fileName').lean();
  const acceptedIds = new Set(ids);
  const byId = new Map(records.map((record) => [String(record._id), record]));
  result.totalRecords = records.length;
  result.orphanRecords = records.filter((record) => !acceptedIds.has(String(record._id)))
    .map((record) => ({ submissionId: String(record._id), projectId: String(record.projectId), chapter: record.chapter, version: record.version }));
  result.missingRecords = ids.filter((id) => !byId.has(id));
  result.checks.noMissingRecords = result.missingRecords.length === 0;
  result.checks.noUnexpectedRecords = result.orphanRecords.length === 0;
  result.checks.databaseCountMatchesAccepted = records.length === accepted.length;
  result.checks.databaseCountMatchesExpected = records.length === expected;
  const groups = new Map();
  const keys = new Set();
  for (const acceptedEntry of accepted) {
    const id = String(acceptedEntry.submissionId || acceptedEntry._id || acceptedEntry.id);
    const record = byId.get(id);
    if (!record) continue;
    if (acceptedEntry.projectId && String(acceptedEntry.projectId) !== String(record.projectId)) result.failures.push(`Project mismatch: ${id}`);
    if (acceptedEntry.chapter != null && Number(acceptedEntry.chapter) !== record.chapter) result.failures.push(`Chapter mismatch: ${id}`);
    if (acceptedEntry.version != null && Number(acceptedEntry.version) !== record.version) result.failures.push(`Response version mismatch: ${id}`);
    const group = `${record.projectId}:${record.type}:${record.chapter}`;
    groups.set(group, [...(groups.get(group) || []), record.version]);
    if (keys.has(record.storageKey)) result.failures.push(`Duplicate storage key: ${id}`);
    keys.add(record.storageKey);
    const object = { submissionId: id, storageKey: record.storageKey, version: record.version, exists: false, hashMatches: false };
    try {
      const buffer = await storageService.downloadFile(record.storageKey);
      object.exists = true;
      object.bytes = buffer.length;
      object.sha256 = sha256(buffer);
      object.hashMatches = object.sha256 === fixtureHash;
      object.sizeMatches = buffer.length === record.fileSize && buffer.length === fixture.length;
    } catch (error) {
      object.error = error.message;
    }
    result.objects.push(object);
    await persist();
  }
  result.versionGroups = [...groups].map(([group, versions]) => {
    const sorted = versions.sort((a, b) => a - b);
    const baseline = Number(manifest.baselineVersions?.[group] || 0);
    return { group, baseline, versions: sorted, sequenceValid: sorted.every((version, index) => version === baseline + index + 1), unique: new Set(sorted).size === sorted.length };
  });
  result.checks.uniqueSequentialVersions = result.versionGroups.every((group) => group.sequenceValid && group.unique);
  result.checks.allStoredObjectsPresent = accepted.length > 0 && result.objects.length === accepted.length && result.objects.every((object) => object.exists);
  result.checks.allHashesMatchSubmittedFixture = accepted.length > 0 && result.objects.length === accepted.length && result.objects.every((object) => object.hashMatches && object.sizeMatches);
  result.storageOrphanEnumeration = { status: 'not_measured', reason: 'The official storage service exposes download but no object-list API. Unexpected database records are enumerated separately.' };
  result.status = Object.values(result.checks).every(Boolean) && result.failures.length === 0 ? 'passed' : 'failed';
} catch (error) {
  result.failures.push(error.message);
} finally {
  if (mongoose) await mongoose.disconnect();
  await persist();
  clearTimeout(timer);
}
console.log(JSON.stringify({ status: result.status, checks: result.checks, failures: result.failures, output: outputPath }));
process.exit(result.status === 'passed' ? 0 : 1);
