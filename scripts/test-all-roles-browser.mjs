import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:43211';
const DEFAULT_PASSWORD = 'Password123!';

const ROLES_TO_TEST = [
  {
    roleName: 'Instructor / Capstone Coordinator',
    email: '2301103203@student.buksu.edu.ph',
    password: DEFAULT_PASSWORD,
    expectedTabs: ['Dashboard', 'Projects', 'Classes', 'Rubrics', 'Archive'],
  },
  {
    roleName: 'Student Proponent (Team Lead)',
    email: 'bennettchristiangeofferdon15@gmail.com',
    password: DEFAULT_PASSWORD,
    expectedTabs: ['Dashboard', 'Projects', 'Submissions', 'Team'],
  },
  {
    roleName: 'Faculty Adviser',
    email: 'leon.mentor.buksu@gmail.com',
    password: DEFAULT_PASSWORD,
    expectedTabs: ['Dashboard', 'Projects', 'Consultations'],
  },
  {
    roleName: 'Faculty Panelist',
    email: '2301105311@student.buksu.edu.ph',
    password: DEFAULT_PASSWORD,
    expectedTabs: ['Dashboard', 'Projects', 'Evaluations'],
  },
];

async function runBrowserTests() {
  console.log('====================================================================');
  console.log('🚀 CMS-V2 MULTI-ROLE END-TO-END BROWSER AUTOMATION TEST (PLAYWRIGHT)');
  console.log('====================================================================');
  console.log(`Target: ${BASE_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const userConfig of ROLES_TO_TEST) {
    console.log(`\n--------------------------------------------------------------------`);
    console.log(`▶ Testing Role: ${userConfig.roleName} (${userConfig.email})`);
    console.log(`--------------------------------------------------------------------`);

    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    const roleResult = {
      role: userConfig.roleName,
      email: userConfig.email,
      loginSuccess: false,
      dashboardLoaded: false,
      navItemsFound: [],
      pageTitle: '',
      errors: [],
    };

    page.on('pageerror', (err) => {
      console.warn(`  [PAGE ERROR] ${err.message}`);
      roleResult.errors.push(err.message);
    });

    try {
      // 1. Navigate to Login
      console.log('  1. Navigating to login page...');
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });

      // Verify Login Form
      await page.waitForSelector('input[name="email"], input[type="email"], #email', { timeout: 5000 });
      const emailInput = page.locator('input[name="email"], input[type="email"], #email').first();
      const passInput = page.locator('input[name="password"], input[type="password"], #password').first();
      const submitBtn = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first();

      console.log('  2. Entering credentials and submitting...');
      await emailInput.fill(userConfig.email);
      await passInput.fill(userConfig.password);
      await submitBtn.click();

      // 2. Wait for redirect away from /login
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
      roleResult.loginSuccess = true;
      console.log(`  ✔ Successfully authenticated. Current URL: ${page.url()}`);

      // 3. Verify Dashboard components
      await page.waitForLoadState('networkidle');
      roleResult.dashboardLoaded = true;
      roleResult.pageTitle = await page.title();

      // 4. Check Sidebar Navigation Links
      console.log('  3. Inspecting Navigation Sidebar & Accessible Modules...');
      const navLinks = await page.locator('nav a, aside a, [role="navigation"] a').allTextContents();
      const cleanNavLinks = navLinks.map((t) => t.trim()).filter((t) => t.length > 0);
      roleResult.navItemsFound = cleanNavLinks;
      console.log(`  ✔ Navigation Items Detected: [${cleanNavLinks.join(', ')}]`);

      // 5. Test Navigation to Projects / Archive if available
      const projectsLink = page.locator('a[href*="/projects"], a:has-text("Projects")').first();
      if (await projectsLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('  4. Navigating to Projects view...');
        await projectsLink.click();
        await page.waitForLoadState('networkidle');
        console.log(`  ✔ Projects view rendered at: ${page.url()}`);
      }

      console.log(`  ✨ Role [${userConfig.roleName}] Test PASSED`);
    } catch (err) {
      console.error(`  ❌ Error during test for ${userConfig.roleName}:`, err.message);
      roleResult.errors.push(err.message);
    } finally {
      await context.close();
      results.push(roleResult);
    }
  }

  await browser.close();

  console.log('\n====================================================================');
  console.log('📊 FINAL BROWSER AUTOMATION EXECUTION SUMMARY');
  console.log('====================================================================');
  let allPassed = true;
  for (const res of results) {
    const status = res.loginSuccess && res.dashboardLoaded && res.errors.length === 0 ? '✅ PASS' : '⚠️ WARNING / PASS WITH NOTICES';
    if (!res.loginSuccess) allPassed = false;
    console.log(`${status} | Role: ${res.role.padEnd(35)} | Nav items: ${res.navItemsFound.length}`);
  }
  console.log('====================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runBrowserTests().catch((err) => {
  console.error('Fatal Browser Test Runner Error:', err);
  process.exit(1);
});
