import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Parse .env manually — no other module imports needed
const __dir   = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../.env');
const raw     = readFileSync(envPath, 'utf8');

// Simple dotenv-style parser (handles quoted values, \n escapes)
const parsed = {};
for (const line of raw.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq < 0) continue;
  const key = trimmed.slice(0, eq).trim();
  let val = trimmed.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  val = val.replace(/\\n/g, '\n');
  if (key) parsed[key] = val;
}

const show = (key) => {
  const v = parsed[key];
  if (!v) return `  ❌  ${key}: EMPTY / NOT FOUND`;
  const preview = v.slice(0, 42).replace(/\n/g, '↵');
  return `  ✅  ${key}: ${v.length} chars — "${preview}..."`;
};

console.log('\n╔═══════════════════════════════════════════════╗');
console.log('║   .env diagnostic — DIRECT FILE PARSE         ║');
console.log('╚═══════════════════════════════════════════════╝');

console.log('\n── Service Account ─────────────────────────────');
console.log(show('GOOGLE_SERVICE_ACCOUNT_EMAIL'));
console.log(show('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY'));

console.log('\n── OAuth2 ───────────────────────────────────────');
console.log(show('GOOGLE_CLIENT_ID'));
console.log(show('GOOGLE_CLIENT_SECRET'));
console.log(show('GOOGLE_REDIRECT_URI'));
console.log(show('REDIRECT_URI'));
console.log(show('GOOGLE_REFRESH_TOKEN'));
console.log(show('REFRESH_TOKEN'));

console.log('\n── Drive Folders ────────────────────────────────');
console.log(show('GOOGLE_DRIVE_FOLDER_ID'));
console.log(show('GOOGLE_DRIVE_TEMPLATE_FOLDER_ID'));
console.log(show('GOOGLE_DRIVE_CAPSTONE_DOCS_FOLDER_ID'));

const refreshToken = parsed.GOOGLE_REFRESH_TOKEN || parsed.REFRESH_TOKEN;
const redirectUri = parsed.GOOGLE_REDIRECT_URI || parsed.REDIRECT_URI;
const hasSA = !!(parsed.GOOGLE_SERVICE_ACCOUNT_EMAIL && parsed.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
const hasOAuth2 = !!(parsed.GOOGLE_CLIENT_ID && parsed.GOOGLE_CLIENT_SECRET && refreshToken && redirectUri);

console.log('\n── Auth strategy ────────────────────────────────');
if (hasOAuth2) console.log('  → OAuth2 + refresh token ✅ (will be used — highest priority)');
if (hasSA) console.log('  → Service Account JWT ✅ (fallback when OAuth2 is incomplete)');
if (!hasSA && !hasOAuth2) console.log('  ❌  No valid auth strategy found');

// Detect duplicate keys (last value wins in dotenv)
const counts = {};
for (const line of raw.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const k = t.slice(0, t.indexOf('=')).trim();
  if (k) counts[k] = (counts[k] || 0) + 1;
}
const dups = Object.entries(counts).filter(([, n]) => n > 1);
if (dups.length) {
  console.log('\n── ⚠  Duplicate keys in .env (last value wins) ─');
  dups.forEach(([k, n]) => console.log(`  ${k}  × ${n}`));
}

console.log();
