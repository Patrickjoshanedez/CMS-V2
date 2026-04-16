const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  const warnings = [];

  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') errors.push(text);
    if (type === 'warning') warnings.push(text);
  });

  page.on('pageerror', (err) => {
    errors.push(`PAGEERROR: ${err.message}`);
  });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  const title = await page.title();
  const bodyTextLen = await page.evaluate(() => document.body?.innerText?.trim().length || 0);
  const rootChildren = await page.evaluate(
    () => document.getElementById('root')?.children?.length || 0,
  );

  console.log(
    JSON.stringify(
      {
        title,
        bodyTextLen,
        rootChildren,
        errorCount: errors.length,
        warningCount: warnings.length,
        errors: errors.slice(0, 10),
        warnings: warnings.slice(0, 10),
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
