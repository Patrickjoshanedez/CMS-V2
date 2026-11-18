#!/usr/bin/env node
/**
 * Reusable Playwright browser batch ingestion runner for CMS-V2 /archive/upload/capstone.
 *
 * Interacts directly with the live React form for every manifest entry:
 *   - Attaches the PDF or DOCX manuscript via the real file input
 *   - Waits for asynchronous /api/documents/extract-pdf-metadata + UI completion
 *   - Verifies OCR auto-fill and sets Program (#courseId), Academic Year (#academicYear),
 *     Title, Authors, Year, Abstract, and Keywords through real DOM controls
 *   - Submits the form, asserts HTTP 201, waits for form reset, and saves incremental state
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const getArg = (name, def) => {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : def;
};

const BASE_URL = getArg('base-url', 'http://localhost:43211');
const MANIFEST_PATH = path.resolve(getArg('manifest', 'Sample papers/ground_truth_manifest.json'));
const PAPERS_DIR = path.resolve(getArg('dir', 'Sample papers'));
const REPORT_PATH = path.resolve(getArg('report', 'scratch/archive_browser_report.json'));
const EMAIL = getArg('email', 'instructor@student.buksu.edu.ph');
const PASSWORD = getArg('password', 'Password123!');
const startIdx = Number(getArg('start', '0'));
const limitCount = Number(getArg('limit', '10'));
const mode = getArg('mode', 'manifest'); // 'edge' | 'manifest'
const watchdogMs = Number(getArg('watchdog-ms', '115000'));
const legacyDocName = getArg('legacy-doc', 'COMPETENCY_BASED_CURRICULUM_INFORMATION.doc');

const watchdog = setTimeout(() => {
  console.error(`[BrowserArchive] Watchdog ${watchdogMs}ms timeout triggered`);
  process.exit(1);
}, watchdogMs);

const PROGRAM_LABELS = {
  BSIT: 'Bachelor of Science in Information Technology',
  BSEMC: 'Bachelor of Science in Entertainment and Multimedia Computing',
};

async function ensureRequiredCourses(page, requiredCodes) {
  await page.goto(`${BASE_URL}/users`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  const coursesData = await page.evaluate(async () => {
    const res = await fetch('/api/academics/courses', { credentials: 'include' });
    return res.json();
  });
  const courses = coursesData?.data?.courses || coursesData?.courses || [];
  const existingCodes = new Set(courses.map((c) => String(c.code || '').toUpperCase()));

  for (const rawCode of requiredCodes) {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!code || existingCodes.has(code)) {
      continue;
    }

    console.log(`[Setup] Creating missing course ${code} via authenticated session...`);
    const created = await page.evaluate(
      async ({ targetCode, targetName }) => {
        const res = await fetch('/api/academics/courses', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: targetCode, name: targetName }),
        });
        return { ok: res.ok, status: res.status };
      },
      { targetCode: code, targetName: PROGRAM_LABELS[code] || code },
    );
    if (!created.ok) {
      throw new Error(`Failed to create required course ${code}: HTTP ${created.status}`);
    }
    existingCodes.add(code);
  }
}

async function selectRadixOption(page, triggerSelector, matchRegex) {
  await page.locator(`${triggerSelector}:not([disabled])`).waitFor({ state: 'visible', timeout: 15000 });
  const trigger = page.locator(triggerSelector);
  await trigger.click();
  const listbox = page.locator('[role="listbox"]');
  await listbox.waitFor({ state: 'visible', timeout: 8000 });
  const option = listbox.locator('[role="option"]').filter({ hasText: matchRegex }).first();
  await option.scrollIntoViewIfNeeded();
  await option.click();
  await listbox.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
}

let browser;
try {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const requiredCodes = [...new Set(manifest.map((m) => m.courseCode).filter(Boolean))];

  let queue;
  if (mode === 'edge') {
    const edgeArg = getArg('edge-files', '');
    if (edgeArg) {
      const requested = edgeArg.split(',').map((s) => s.trim()).filter(Boolean);
      queue = requested.map((fn) => manifest.find((m) => m.filename === fn)).filter(Boolean);
    } else {
      const largeOrDocx = manifest.filter((m) => {
        if (/\.docx$/i.test(m.filename)) return true;
        const p = path.join(PAPERS_DIR, m.filename);
        return fs.existsSync(p) && fs.statSync(p).size > 15 * 1024 * 1024;
      });
      queue = (largeOrDocx.length > 0 ? largeOrDocx : manifest.slice(0, 5)).slice(0, 5);
    }
  } else {
    queue = manifest.slice(startIdx, startIdx + limitCount);
  }

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"], input[name="password"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 });

  await ensureRequiredCourses(page, requiredCodes);

  // Paginate archive search with limit <= 50 (backend validation cap)
  const existingTitles = await page.evaluate(async () => {
    const titles = [];
    let currentPage = 1;
    let totalPages = 1;
    while (currentPage <= totalPages && currentPage <= 30) {
      const res = await fetch(`/api/projects/archive/search?limit=50&page=${currentPage}`, {
        credentials: 'include',
      });
      if (!res.ok) break;
      const json = await res.json();
      const list = json?.data?.projects || json?.projects || [];
      for (const p of list) {
        if (p?.title) titles.push(String(p.title).trim().toLowerCase());
      }
      totalPages = Number(json?.data?.pagination?.pages || json?.pagination?.pages || 1);
      currentPage += 1;
    }
    return titles;
  });
  const archivedSet = new Set(existingTitles);

  await page.goto(`${BASE_URL}/archive/upload/capstone`, { waitUntil: 'domcontentloaded' });
  await page.locator('#courseId:not([disabled])').waitFor({ state: 'visible', timeout: 20000 });

  if (mode === 'edge' && legacyDocName) {
    const legacyDocPath = path.join(PAPERS_DIR, legacyDocName);
    if (fs.existsSync(legacyDocPath)) {
      await page.locator('input[aria-label="Academic Paper file"]').setInputFiles(legacyDocPath);
      await page.waitForTimeout(400);
      const docToastVisible = await page
        .locator('text=Legacy .doc files are not supported')
        .isVisible()
        .catch(() => false);
      console.log('[EdgeCheck] Legacy .doc rejection toast visible:', docToastVisible);
    }
  }

  let existingReport = { items: [] };
  if (fs.existsSync(REPORT_PATH)) {
    try {
      existingReport = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
    } catch {
      existingReport = { items: [] };
    }
  }
  const byFile = new Map((existingReport.items || []).map((x) => [x.filename, x]));
  console.log(`[Init] Existing archived count in DB: ${archivedSet.size}; queue length: ${queue.length}`);

  const batchResults = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const titleLower = String(item.canonicalTitle || '').trim().toLowerCase();
    if (archivedSet.has(titleLower)) {
      console.log(`[SKIP ${i + 1}/${queue.length}] Already archived: "${item.canonicalTitle.slice(0, 55)}"`);
      batchResults.push({ filename: item.filename, status: 'skipped_already_archived', title: item.canonicalTitle });
      continue;
    }

    const filePath = path.join(PAPERS_DIR, item.filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing file: ${filePath}`);
    }

    const tStart = Date.now();
    console.log(`[STEP ${i + 1}/${queue.length}] Attaching ${item.filename}...`);

    const extractPromise = page.waitForResponse(
      (res) => res.url().includes('/api/documents/extract-pdf-metadata') && res.request().method() === 'POST',
      { timeout: 60000 },
    );
    await page.locator('input[aria-label="Academic Paper file"]').setInputFiles(filePath);
    const extractRes = await extractPromise;
    if (![200, 202].includes(extractRes.status())) {
      const bodyText = await extractRes.text().catch(() => '');
      throw new Error(`Extraction failed for ${item.filename}: HTTP ${extractRes.status()} ${bodyText}`);
    }

    await page.waitForFunction(
      () => {
        const submitBtn = document.querySelector('button[type="submit"]');
        const extractingText = document.body.textContent?.includes('Extracting Metadata');
        return Boolean(submitBtn && !extractingText);
      },
      { timeout: 60000 },
    );
    await page.waitForTimeout(250);

    const ocrFilled = await page.evaluate(() => ({
      title: document.querySelector('#title')?.value || '',
      authors: document.querySelector('#authors')?.value || '',
      year: document.querySelector('#year')?.value || '',
    }));

    if (item.courseCode) {
      await selectRadixOption(page, '#courseId', new RegExp(`^${item.courseCode}\\b`, 'i'));
    }

    await page.locator('#title').fill(String(item.canonicalTitle || '').slice(0, 300));
    await page.locator('#authors').fill((item.canonicalAuthors || []).slice(0, 20).join(', '));
    await page.locator('#year').fill(String(item.canonicalYear));
    await page.locator('#abstract').fill(String(item.canonicalAbstract || '').slice(0, 5000));
    const mergedTags = Array.from(new Set([item.courseCode, ...(item.tags || []), 'Capstone'].filter(Boolean)))
      .slice(0, 10)
      .join(', ');
    await page.locator('#keywords').fill(mergedTags);

    const targetAcademicYear = `${item.canonicalYear}-${Number(item.canonicalYear) + 1}`;
    await selectRadixOption(page, '#academicYear', new RegExp(`^${targetAcademicYear}$`));

    const uploadPromise = page.waitForResponse(
      (res) => res.url().includes('/api/projects/archive/bulk') && res.request().method() === 'POST',
      { timeout: 90000 },
    );
    await page.locator('button[type="submit"]').click();
    const uploadRes = await uploadPromise;
    const uploadStatus = uploadRes.status();
    const uploadJson = await uploadRes.json().catch(() => ({}));

    if (uploadStatus !== 201) {
      throw new Error(
        `Bulk upload failed for ${item.filename}: HTTP ${uploadStatus} ${JSON.stringify(uploadJson)}`,
      );
    }

    await page.locator('text=No academic paper selected yet.').waitFor({ state: 'visible', timeout: 15000 });

    archivedSet.add(titleLower);
    const projectId = uploadJson?.data?.project?._id;
    const elapsedMs = Date.now() - tStart;
    console.log(
      `[ARCHIVED ${i + 1}/${queue.length}] (${item.courseCode}, ${item.canonicalYear}, ${elapsedMs}ms) ${item.filename} -> ${projectId} | OCR="${ocrFilled.title.slice(0, 40)}"`,
    );

    const rec = {
      filename: item.filename,
      courseCode: item.courseCode,
      year: item.canonicalYear,
      projectId,
      elapsedMs,
      ocrTitle: ocrFilled.title,
      ocrAuthors: ocrFilled.authors,
      ocrYear: ocrFilled.year,
      status: 'archived',
    };
    batchResults.push(rec);
    byFile.set(rec.filename, rec);
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(
      REPORT_PATH,
      JSON.stringify({ updatedAt: new Date().toISOString(), items: [...byFile.values()] }, null, 2),
    );
  }

  console.log(
    JSON.stringify(
      {
        processed: batchResults.length,
        totalSavedInReport: byFile.size,
        pageErrors,
        consoleErrorsCount: consoleErrors.length,
      },
      null,
      2,
    ),
  );
} catch (err) {
  console.error('[BrowserArchive] Error:', err);
  process.exitCode = 1;
} finally {
  clearTimeout(watchdog);
  if (browser) await browser.close();
  process.exit(process.exitCode || 0);
}
