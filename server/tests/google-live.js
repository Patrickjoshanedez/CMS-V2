/**
 * Google Docs & Drive — Live Integration Test Script
 *
 * Hits the real Google APIs using credentials from your .env file.
 * Run from the `server/` directory:
 *
 *   node tests/google-live.js
 *
 * What is tested:
 *   1.  isConfigured()               — credentials present and valid
 *   2.  createBlankDocument()        — create a blank Google Doc
 *   3.  getDocumentMetadata()        — read title / modifiedTime / webViewLink
 *   4.  verifyDocumentAccess()       — confirm service can see its own doc
 *   5.  setAnyoneCanEditPermission() — grant public write access
 *   6.  setViewPermission()          — grant public read-only access
 *   7.  revokePublicPermission()     — remove public access (lock)
 *   8.  listFilesInFolder()          — list root CMS Drive folder
 *   9.  listTemplateFiles()          — list template folder
 *  10.  searchFiles()                — search by name in Drive
 *  11.  uploadFileToDrive()          — upload a PDF buffer
 *  12.  getFileStream()              — stream a Drive file back
 *  13.  exportDocAsStream()          — export Google Doc as PDF stream
 *  14.  createFromTemplate()         — copy a Doc as a new document
 *  15.  trashDocument()              — soft-delete a Drive file
 *  16.  Error handling               — 404 for invalid document ID
 *
 * All files created during the test are trashed in the cleanup phase.
 */

import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Resolve server root so dotenv always finds the right .env ──────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
process.chdir(path.resolve(__dirname, '..'));

// Import AFTER dotenv so env.js reads the real values
const { default: googleDocsService } = await import('../services/google-docs.service.js');

// ── Terminal colours ────────────────────────────────────────────────────────
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const DIM    = '\x1b[2m';
const RESET  = '\x1b[0m';

// ── State ───────────────────────────────────────────────────────────────────
let passed    = 0;
let failed    = 0;
let skipped   = 0;
const toTrash = [];   // IDs of Drive files to clean up at the end

// ── Helpers ─────────────────────────────────────────────────────────────────
function pass(label) {
    console.log(`  ${GREEN}✔${RESET}  ${label}`);
    passed++;
}

function fail(label, err) {
    const msg = err?.message ?? String(err);
    console.log(`  ${RED}✖${RESET}  ${label}`);
    console.log(`     ${DIM}${msg}${RESET}`);
    failed++;
}

function skip(label, reason) {
    console.log(`  ${YELLOW}○${RESET}  ${label} ${DIM}(skip: ${reason})${RESET}`);
    skipped++;
}

async function run(label, fn, hints = {}) {
    try {
        await fn();
        pass(label);
    } catch (err) {
        fail(label, err);
        for (const [pattern, hint] of Object.entries(hints)) {
            if (err?.message?.toLowerCase().includes(pattern.toLowerCase())) {
                console.log(`     ${YELLOW}→ Fix: ${hint}${RESET}`);
                break;
            }
        }
    }
}

/** Collect a readable stream into a single Buffer. */
function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (c) => chunks.push(c));
        stream.on('end',  () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
}

// ── Guard: skip everything if credentials are absent ────────────────────────
const hasCreds = !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.REFRESH_TOKEN
);

console.log();
console.log(`${CYAN}══════════════════════════════════════════════════════${RESET}`);
console.log(`${CYAN}  Google Docs & Drive — Live Integration Tests${RESET}`);
console.log(`${CYAN}══════════════════════════════════════════════════════${RESET}`);
console.log();

const hasServiceAccount = !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
);

if (!hasCreds && !hasServiceAccount) {
    console.log(`${YELLOW}  No Google credentials found in .env.`);
    console.log(`  Provide either Service Account vars or OAuth2 vars.`);
    console.log(`  All tests skipped.\n${RESET}`);
    process.exit(0);
}

const authStrategy = hasServiceAccount ? 'Service Account JWT' : 'OAuth2 + Refresh Token';
console.log(`  Auth strategy : ${GREEN}${authStrategy}${RESET}`);

if (hasServiceAccount) {
    const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '(not set)';
    console.log();
    console.log(`  ${YELLOW}⚡  Service Account Mode — Pre-flight Checklist:${RESET}`);
    console.log(`  ${DIM}  1. Google Docs API must be enabled in GCP Console:${RESET}`);
    console.log(`  ${DIM}     https://console.cloud.google.com/apis/library/docs.googleapis.com${RESET}`);
    console.log(`  ${DIM}  2. Share each Drive folder with the service account:${RESET}`);
    console.log(`  ${DIM}     ${saEmail}${RESET}`);
    console.log(`  ${DIM}  3. Tests 11-12 (binary upload/stream) are skipped for Service Accounts.${RESET}`);
    console.log(`  ${DIM}     Binary file storage is handled by S3 (StorageService) — already configured.${RESET}`);
}

// ────────────────────────────────────────────────────────────────────────────
//  TEST SUITE
// ────────────────────────────────────────────────────────────────────────────
console.log();
console.log(`${DIM}  (All Drive files created here will be trashed after cleanup)${RESET}\n`);

// ── 1. isConfigured ──────────────────────────────────────────────────────────
await run('isConfigured() returns true', () => {
    if (!googleDocsService.isConfigured()) {
        throw new Error('isConfigured() returned false — check env vars');
    }
});

// ── 2. createBlankDocument ───────────────────────────────────────────────────
const DOCS_API_HINT = 'Enable Google Docs API: https://console.cloud.google.com/apis/library/docs.googleapis.com  ' +
    'then share your Drive folders with: ' + (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'your service account email');

let blankDocId;
await run('createBlankDocument() creates a Google Doc', async () => {
    const { docId, docUrl } = await googleDocsService.createBlankDocument('[CMS TEST] Blank Doc — Delete Me');
    if (!docId)  throw new Error('No docId returned');
    if (!docUrl) throw new Error('No docUrl returned');
    if (!docUrl.includes(docId)) throw new Error('docUrl does not contain docId');
    blankDocId = docId;
    toTrash.push(docId);
}, { 'does not have permission': DOCS_API_HINT, 'forbidden': DOCS_API_HINT });

// ── 3. getDocumentMetadata ───────────────────────────────────────────────────
await run('getDocumentMetadata() returns title and webViewLink', async () => {
    if (!blankDocId) throw new Error('No blankDocId — createBlankDocument failed');
    const meta = await googleDocsService.getDocumentMetadata(blankDocId);
    if (meta.id !== blankDocId) throw new Error(`Expected id=${blankDocId}, got ${meta.id}`);
    if (!meta.name)        throw new Error('metadata.name is empty');
    if (!meta.webViewLink) throw new Error('metadata.webViewLink is empty');
});

// ── 4. verifyDocumentAccess ──────────────────────────────────────────────────
await run('verifyDocumentAccess() confirms service can read own doc', async () => {
    if (!blankDocId) throw new Error('No blankDocId — createBlankDocument failed');
    const result = await googleDocsService.verifyDocumentAccess(blankDocId);
    if (result.id !== blankDocId) throw new Error(`Expected id=${blankDocId}, got ${result.id}`);
});

// ── 5. setAnyoneCanEditPermission ────────────────────────────────────────────
await run('setAnyoneCanEditPermission() grants public write access', async () => {
    if (!blankDocId) throw new Error('No blankDocId');
    await googleDocsService.setAnyoneCanEditPermission(blankDocId);
});

// ── 6. setViewPermission ─────────────────────────────────────────────────────
await run('setViewPermission() grants public read-only access', async () => {
    if (!blankDocId) throw new Error('No blankDocId');
    await googleDocsService.setViewPermission(blankDocId);
});

// ── 7. revokePublicPermission ────────────────────────────────────────────────
await run('revokePublicPermission() removes public access (locks doc)', async () => {
    if (!blankDocId) throw new Error('No blankDocId');
    await googleDocsService.revokePublicPermission(blankDocId);
});

// ── 8. listFilesInFolder (root folder) ──────────────────────────────────────
const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
if (!rootFolderId) {
    skip('listFilesInFolder() root folder', 'GOOGLE_DRIVE_FOLDER_ID not set');
} else {
    await run('listFilesInFolder() lists root CMS Drive folder', async () => {
        const { files } = await googleDocsService.listFilesInFolder(rootFolderId, { pageSize: 10 });
        if (!Array.isArray(files)) throw new Error('Expected files to be an array');
    });
}

// ── 9. listTemplateFiles ─────────────────────────────────────────────────────
const templateFolderId = process.env.GOOGLE_DRIVE_TEMPLATE_FOLDER_ID;
if (!templateFolderId) {
    skip('listTemplateFiles() template folder', 'GOOGLE_DRIVE_TEMPLATE_FOLDER_ID not set');
} else {
    await run('listTemplateFiles() lists the template folder', async () => {
        const { folderId, files } = await googleDocsService.listTemplateFiles();
        if (typeof folderId !== 'string') throw new Error('folderId should be a string');
        if (!Array.isArray(files))        throw new Error('files should be an array');
        console.log(`     ${DIM}→ ${files.length} template(s) found${RESET}`);
    });
}

// ── 10. searchFiles ──────────────────────────────────────────────────────────
await run('searchFiles() returns an array of results', async () => {
    // Search for the doc we just created — name contains "[CMS TEST]"
    const { files } = await googleDocsService.searchFiles('[CMS TEST]');
    if (!Array.isArray(files)) throw new Error('Expected files to be an array');
    // Drive indexing may be slightly delayed, so we just confirm the API responded
    console.log(`     ${DIM}→ ${files.length} result(s) matching "[CMS TEST]"${RESET}`);
});

// ── 11. uploadFileToDrive ────────────────────────────────────────────────────
// Service Accounts have no personal My Drive storage quota — binary files are
// stored in S3 (StorageService) in this architecture. Skip for SA auth.
let uploadedFileId;
if (hasServiceAccount) {
    skip(
        'uploadFileToDrive() stores a PDF buffer in Drive',
        'SA has no personal Drive storage quota — binary files routed to S3 (StorageService)',
    );
} else {
    await run('uploadFileToDrive() stores a PDF buffer in Drive', async () => {
        const buffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
        const result = await googleDocsService.uploadFileToDrive(
            buffer,
            '[CMS TEST] upload-test.pdf',
            'application/pdf',
            rootFolderId || undefined,
        );
        if (!result.fileId)   throw new Error('No fileId returned');
        if (!result.fileName) throw new Error('No fileName returned');
        uploadedFileId = result.fileId;
        toTrash.push(result.fileId);
        console.log(`     ${DIM}→ fileId: ${result.fileId}${RESET}`);
        console.log(`     ${DIM}→ webViewLink: ${result.webViewLink}${RESET}`);
    });
}

// ── 12. getFileStream ────────────────────────────────────────────────────────
if (hasServiceAccount) {
    skip(
        'getFileStream() streams the uploaded PDF back',
        'Skipped — uploadFileToDrive skipped for Service Account auth',
    );
} else {
    await run('getFileStream() streams the uploaded PDF back', async () => {
        if (!uploadedFileId) throw new Error('No uploadedFileId — upload test failed');
        const stream = await googleDocsService.getFileStream(uploadedFileId);
        const buf    = await streamToBuffer(stream);
        if (!buf.toString().startsWith('%PDF')) {
            throw new Error('Stream content does not start with %PDF');
        }
        console.log(`     ${DIM}→ received ${buf.length} bytes${RESET}`);
    });
}

// ── 13. exportDocAsStream ────────────────────────────────────────────────────
await run('exportDocAsStream() exports Google Doc as PDF stream', async () => {
    if (!blankDocId) throw new Error('No blankDocId');
    const stream = await googleDocsService.exportDocAsStream(blankDocId, 'application/pdf');
    const buf    = await streamToBuffer(stream);
    if (buf.length === 0) throw new Error('Export returned an empty stream');
    console.log(`     ${DIM}→ exported ${buf.length} bytes as PDF${RESET}`);
});

// ── 14. createFromTemplate ───────────────────────────────────────────────────
let copyId;
await run('createFromTemplate() copies an existing Doc', async () => {
    if (!blankDocId) throw new Error('No blankDocId to use as template');
    const { docId, docUrl } = await googleDocsService.createFromTemplate(
        blankDocId,
        '[CMS TEST] Template Copy — Delete Me',
    );
    if (!docId)               throw new Error('No docId returned');
    if (docId === blankDocId) throw new Error('Copy has same ID as original');
    if (!docUrl.includes(docId)) throw new Error('docUrl does not contain new docId');
    copyId = docId;
    toTrash.push(docId);
});

// ── 15. trashDocument ───────────────────────────────────────────────────────
let ephemeralId;
await run('trashDocument() soft-deletes a Drive file', async () => {
    const { docId } = await googleDocsService.createBlankDocument('[CMS TEST] Trash Me');
    ephemeralId = docId;
    await googleDocsService.trashDocument(docId);
    // Remove from toTrash since we already handled it
    const idx = toTrash.indexOf(docId);
    if (idx !== -1) toTrash.splice(idx, 1);
}, { 'does not have permission': DOCS_API_HINT, 'forbidden': DOCS_API_HINT });

// ── 16. Error handling — invalid document ID ─────────────────────────────────
await run('getDocumentMetadata() throws a structured error for invalid ID', async () => {
    try {
        await googleDocsService.getDocumentMetadata('this-id-does-not-exist-00000');
        throw new Error('Expected an error but none was thrown');
    } catch (err) {
        // Should be an AppError (or similar) with a statusCode property
        if (err.message === 'Expected an error but none was thrown') throw err;
        // Any API error is the correct behaviour — confirm it's not a crash
        if (!err.message) throw new Error('Error has no message property');
    }
});

// ────────────────────────────────────────────────────────────────────────────
//  CLEANUP
// ────────────────────────────────────────────────────────────────────────────
console.log();
console.log(`${DIM}  Cleaning up ${toTrash.length} Drive file(s)...${RESET}`);

let cleanupFailed = 0;
for (const fileId of toTrash) {
    try {
        await googleDocsService.trashDocument(fileId);
    } catch {
        cleanupFailed++;
        console.log(`  ${YELLOW}⚠${RESET} Could not trash ${DIM}${fileId}${RESET} — delete manually from Drive`);
    }
}

// ────────────────────────────────────────────────────────────────────────────
//  SUMMARY
// ────────────────────────────────────────────────────────────────────────────
const total = passed + failed + skipped;
console.log();
console.log(`${CYAN}══════════════════════════════════════════════════════${RESET}`);
console.log(`  Results:  ${GREEN}${passed} passed${RESET}  |  ${RED}${failed} failed${RESET}  |  ${YELLOW}${skipped} skipped${RESET}  (${total} total)`);
if (cleanupFailed > 0) {
    console.log(`  ${YELLOW}⚠  ${cleanupFailed} cleanup error(s) — check Drive trash manually${RESET}`);
}
console.log(`${CYAN}══════════════════════════════════════════════════════${RESET}`);
console.log();

process.exit(failed > 0 ? 1 : 0);
