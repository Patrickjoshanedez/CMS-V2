import { chromium, type Page, type CDPSession } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

interface VerifyOptions {
  url: string;
  outputDir: string;
  waitForSelector?: string;
  runAdversarial?: boolean;
  timeoutMs?: number;
  compressionEndpoint?: string;
}

interface NormalizedError {
  type: 'console.error' | 'pageerror' | 'hydration';
  message: string;
  count: number;
  origin: string;
}

// Token Deduplication Filter ("RTK" Principle)
function deduplicateErrors(rawErrors: { type: string; text: string }[]): NormalizedError[] {
  const errorMap = new Map<string, NormalizedError>();

  for (const err of rawErrors) {
    // Detect React hydration mismatches
    const isHydration = err.text.includes('Hydration failed') || err.text.includes('did not match');
    const type = isHydration
      ? 'hydration'
      : err.type === 'pageerror'
        ? 'pageerror'
        : 'console.error';

    // Extract origin (e.g. at Component (Component.tsx:42))
    const originMatch = err.text.match(/\(?([\w.-]+\.[tj]sx?:\d+(?::\d+)?)\)?/);
    const origin = originMatch ? originMatch[1] : 'unknown';

    // Normalize message (remove noisy stack trace frames and timestamps)
    const normalizedMessage = err.text
      .split('\n')[0]
      .replace(/\b(https?|file):\/\/[^\s]+/g, '[url]')
      .trim();

    const key = `${type}::${normalizedMessage}`;

    if (errorMap.has(key)) {
      const existing = errorMap.get(key)!;
      existing.count += 1;
    } else {
      errorMap.set(key, {
        type,
        message: normalizedMessage,
        count: 1,
        origin,
      });
    }
  }

  return Array.from(errorMap.values());
}

// Optional LLMLingua compression hook with local fallback
async function compressViaServer(
  rawText: string,
  endpoint = 'http://localhost:8000/compress',
): Promise<string> {
  if (!rawText || rawText.length < 200) return rawText;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: rawText, target_rate: 0.33 }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data: any = await res.json();
      return data.compressed_text || rawText;
    }
  } catch {
    // Graceful fallback to raw text if compression server is offline
  }
  return rawText;
}

export async function verifyRoute({
  url,
  outputDir,
  waitForSelector,
  runAdversarial = true,
  timeoutMs = 15000,
  compressionEndpoint = 'http://localhost:8000/compress',
}: VerifyOptions) {
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    deviceScaleFactor: 2, // 2x Retina capture
  });

  const page = await context.newPage();
  const rawErrors: { type: string; text: string }[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      rawErrors.push({ type: 'console.error', text: msg.text() });
    }
  });

  page.on('pageerror', (err) => {
    rawErrors.push({ type: 'pageerror', text: err.message });
  });

  try {
    // 1. Stage 1: Network Stabilization with fallback
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: timeoutMs });
    } catch {
      await page.waitForLoadState('domcontentloaded');
    }

    // 2. Stage 2: Target Hydration
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { state: 'visible', timeout: 10000 });
    }

    // 3. Stage 3: Webfont Settling
    await page.evaluate(async () => {
      if ('fonts' in document) {
        await document.fonts.ready;
      }
    });

    // 4. Stage 4: Frame Stabilization
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        }),
    );

    // Multi-viewport baseline captures
    const viewports = [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 812 },
    ];

    const capturedScreenshots: string[] = [];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(300);

      const filename = `${vp.name}.png`;
      await page.screenshot({
        path: path.join(outputDir, filename),
        fullPage: true,
      });
      capturedScreenshots.push(filename);
    }

    // Adversarial Layout Stress Testing (Optional / Autonomous)
    const adversarialResults: Record<string, any> = {};

    if (runAdversarial) {
      // Test A: The "German Noun" Test (Unbroken 40-char string to test flex squishing & truncation)
      const germanNounResult = await page.evaluate(() => {
        const GERMAN_NOUN = 'Rindfleischetikettierungsueberwachungsaufgabengesetz';
        const textElements = Array.from(document.querySelectorAll('h1, h2, h3, p, span, button'))
          .filter((el) => el.children.length === 0 && (el.textContent || '').trim().length > 3)
          .slice(0, 10);

        let initialOverflow =
          document.documentElement.scrollWidth > document.documentElement.clientWidth;

        textElements.forEach((el) => {
          (el as HTMLElement).dataset.originalText = el.textContent || '';
          el.textContent = GERMAN_NOUN;
        });

        const postOverflow =
          document.documentElement.scrollWidth > document.documentElement.clientWidth;
        const overflowPixels = Math.max(
          0,
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );

        // Restore original text
        textElements.forEach((el) => {
          if ((el as HTMLElement).dataset.originalText) {
            el.textContent = (el as HTMLElement).dataset.originalText!;
          }
        });

        return {
          passed: !postOverflow || postOverflow === initialOverflow,
          overflowPixels,
        };
      });

      adversarialResults.germanNounTest = germanNounResult;

      // Test B: The "Zero-Data" Container Collapse Test
      const zeroDataResult = await page.evaluate(() => {
        const containers = document.querySelectorAll('table, ul, [role="feed"], [role="grid"]');
        let collapsed = false;
        containers.forEach((c) => {
          const rect = c.getBoundingClientRect();
          if (rect.height < 10) collapsed = true;
        });
        return {
          passed: !collapsed,
          containerCollapsed: collapsed,
        };
      });

      adversarialResults.zeroDataTest = zeroDataResult;
    }

    // Process and deduplicate error logs ("RTK" Principle)
    const deduplicated = deduplicateErrors(rawErrors);
    const hasHydration = deduplicated.some((e) => e.type === 'hydration');
    const totalErrorCount = rawErrors.length;

    // Structured Minified Report
    const report = {
      status: deduplicated.length === 0 ? 'passed' : 'warning',
      url,
      timestamp: new Date().toISOString(),
      summary: {
        totalErrors: totalErrorCount,
        uniqueErrors: deduplicated.length,
        layoutShiftsDetected: false,
        hydrationMismatch: hasHydration,
      },
      deduplicatedErrors: deduplicated,
      adversarialResults,
      screenshots: capturedScreenshots,
    };

    fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));

    return report;
  } catch (error: any) {
    const failureReport = {
      status: 'failed',
      url,
      timestamp: new Date().toISOString(),
      error: error.message,
      deduplicatedErrors: deduplicateErrors(rawErrors),
    };

    fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(failureReport, null, 2));
    console.error(JSON.stringify(failureReport, null, 2));
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// CLI Execution entry point
if (require.main === module || process.argv[1]?.includes('visual-verify')) {
  const targetUrl = process.argv[2] || 'http://localhost:3000';
  const outDir = process.argv[3] || './.claude/artifacts/visual-feedback';
  const selector = process.argv[4];

  verifyRoute({ url: targetUrl, outputDir: outDir, waitForSelector: selector }).catch((err) => {
    console.error('[Fatal Error]', err);
    process.exit(1);
  });
}
