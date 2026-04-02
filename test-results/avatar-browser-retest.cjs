const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const EMAIL = process.env.AVATAR_TEST_EMAIL || 'student9@buksu.edu.ph';
const PASSWORD = process.env.AVATAR_TEST_PASSWORD || 'Password123!';

function is2xx(status) {
  return status >= 200 && status < 300;
}

(async () => {
  const tmpImagePath = path.join(__dirname, 'temp-avatar-upload.png');
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Zx7cAAAAASUVORK5CYII=';
  fs.writeFileSync(tmpImagePath, Buffer.from(pngBase64, 'base64'));

  const consoleMessages = [];
  const pageErrors = [];
  const requestFailures = [];
  let avatarRequest = null;
  let avatarResponse = null;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  page.on('requestfailed', (req) => {
    requestFailures.push({
      method: req.method(),
      url: req.url(),
      failure: req.failure()?.errorText || 'Unknown request failure',
    });
  });

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const preLogin = await page.evaluate(
      async ({ email, password }) => {
        try {
          const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          const body = await response.text();
          return {
            ok: response.ok,
            status: response.status,
            bodyPreview: body.slice(0, 300),
          };
        } catch (error) {
          return {
            ok: false,
            status: 0,
            bodyPreview: String(error),
          };
        }
      },
      { email: EMAIL, password: PASSWORD },
    );

    if (!preLogin.ok) {
      throw new Error(
        `Pre-login failed with status ${preLogin.status}. Details: ${preLogin.bodyPreview}`,
      );
    }

    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    if (page.url().includes('/login')) {
      await page.getByLabel('Email').fill(EMAIL, { timeout: 10000 });
      await page.getByLabel('Password').fill(PASSWORD, { timeout: 10000 });
      await Promise.all([
        page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 }),
        page.getByRole('button', { name: /sign in/i }).click(),
      ]);
    }

    if (!page.url().includes('/profile')) {
      await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }

    await page.locator('h3', { hasText: 'Profile' }).first().waitFor({ timeout: 20000 });

    const avatarResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/users/me/avatar') && response.request().method() === 'POST',
      { timeout: 20000 },
    );

    await page.locator('input[type="file"]').setInputFiles(tmpImagePath);

    avatarResponse = await avatarResponsePromise;
    avatarRequest = avatarResponse.request();

    await page.waitForTimeout(1500);

    const noFileLocator = page.getByText('No file uploaded.', { exact: false });
    let noFileUploadedVisible = false;
    if ((await noFileLocator.count()) > 0) {
      noFileUploadedVisible = await noFileLocator.first().isVisible();
    }

    const errorLikeConsole = consoleMessages.filter(
      (entry) => entry.type === 'error' || entry.type === 'warning',
    );

    const socketRelated = [
      ...errorLikeConsole.filter((entry) => /socket|xhr poll|poll error|engine\.io|websocket/i.test(entry.text)),
      ...requestFailures.filter((entry) => /socket\.io|engine\.io/i.test(entry.url)),
      ...pageErrors.filter((entry) => /socket|xhr poll|poll error|engine\.io|websocket/i.test(entry)),
    ];

    const result = {
      success: is2xx(avatarResponse.status()) && !noFileUploadedVisible,
      flow: {
        finalUrl: page.url(),
        reachedProfile: page.url().includes('/profile'),
      },
      request: {
        matchedUrl: avatarResponse.url(),
        method: avatarRequest.method(),
        status: avatarResponse.status(),
        ok: avatarResponse.ok(),
      },
      ui: {
        noFileUploadedVisible,
      },
      console: {
        totalMessages: consoleMessages.length,
        errorOrWarningCount: errorLikeConsole.length,
        pageErrorCount: pageErrors.length,
        requestFailureCount: requestFailures.length,
        socketRelated,
        errorOrWarningSample: errorLikeConsole.slice(0, 10),
        requestFailureSample: requestFailures.slice(0, 10),
        pageErrorSample: pageErrors.slice(0, 10),
      },
    };

    console.log(`RESULT_JSON=${JSON.stringify(result)}`);
  } catch (error) {
    const result = {
      success: false,
      error: error?.message || String(error),
      flow: {
        finalUrl: page.url(),
      },
      console: {
        totalMessages: consoleMessages.length,
        pageErrorCount: pageErrors.length,
        requestFailureCount: requestFailures.length,
        errorOrWarningSample: consoleMessages
          .filter((entry) => entry.type === 'error' || entry.type === 'warning')
          .slice(0, 10),
        requestFailureSample: requestFailures.slice(0, 10),
        pageErrorSample: pageErrors.slice(0, 10),
      },
    };

    console.log(`RESULT_JSON=${JSON.stringify(result)}`);
    process.exitCode = 1;
  } finally {
    await context.close();
    await browser.close();
    fs.rmSync(tmpImagePath, { force: true });
  }
})();
