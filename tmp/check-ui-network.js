const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const badResponses = [];
  page.on('response', (res) => {
    const status = res.status();
    if (status >= 400) {
      badResponses.push({ status, url: res.url() });
    }
  });

  const requestFailures = [];
  page.on('requestfailed', (req) => {
    requestFailures.push({
      url: req.url(),
      failure: req.failure()?.errorText || 'unknown',
    });
  });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  console.log(
    JSON.stringify(
      {
        badResponses,
        requestFailures,
      },
      null,
      2,
    ),
  );

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
