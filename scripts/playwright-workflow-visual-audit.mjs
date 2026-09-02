import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:43211';
const DEFAULT_PASSWORD = 'Password123!';
const SCREENSHOT_DIR = path.resolve('scratch/screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runVisualWorkflowAudit() {
  console.log('====================================================================');
  console.log('📸 CMS-V2 PLAYWRIGHT VISUAL WORKFLOW AUDIT & IMAGE ACCURACY SCAN');
  console.log('====================================================================');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Screenshot Directory: ${SCREENSHOT_DIR}\n`);

  const browser = await chromium.launch({ headless: true });
  const report = [];

  async function auditRoleWorkflow(roleName, email, steps) {
    console.log(`\n▶ Starting Visual Workflow Audit: ${roleName} (${email})`);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    try {
      // Step 1: Login
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.fill('input[name="email"], input[type="email"], #email', email);
      await page.fill('input[name="password"], input[type="password"], #password', DEFAULT_PASSWORD);
      await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")');
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
      await page.waitForLoadState('networkidle');

      for (const step of steps) {
        console.log(`  📸 Auditing View: ${step.name} (${step.url})...`);
        await page.goto(`${BASE_URL}${step.url}`, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(1000);

        const screenshotPath = path.join(SCREENSHOT_DIR, step.filename);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        const bodyContent = (await page.textContent('body')) || '';
        const hasText = step.expectedText ? bodyContent.toLowerCase().includes(step.expectedText.toLowerCase()) : true;
        const fileSize = fs.statSync(screenshotPath).size;

        report.push({
          role: roleName,
          step: step.name,
          filename: step.filename,
          fileSizeKB: Math.round(fileSize / 1024),
          verified: hasText && fileSize > 10000,
          url: page.url(),
        });
        console.log(`     ✔ Captured & Scanned: ${step.filename} (${Math.round(fileSize / 1024)} KB) | Verified: ${hasText}`);
      }
    } catch (err) {
      console.error(`  ❌ Error during ${roleName} workflow:`, err.message);
    } finally {
      await context.close();
    }
  }

  // 1. Instructor Visual Workflow
  await auditRoleWorkflow('Instructor', '2301103203@student.buksu.edu.ph', [
    { name: 'Instructor Dashboard', url: '/dashboard', filename: '01_instructor_dashboard.png', expectedText: 'Overview' },
    { name: 'Projects Management', url: '/projects', filename: '02_instructor_projects.png', expectedText: 'Projects' },
    { name: 'Evaluation Template Builder', url: '/admin/evaluation-templates', filename: '03_instructor_rubrics.png', expectedText: 'Rubric' },
    { name: 'Institutional Archive Search', url: '/archive', filename: '04_instructor_archive.png', expectedText: 'Archive' },
    { name: 'Plagiarism Checker Hub', url: '/plagiarism-checker', filename: '05_instructor_plagiarism.png', expectedText: 'Plagiarism' },
  ]);

  // 2. Student Lead Proponent Workflow
  await auditRoleWorkflow('Student Lead Proponent', 'bennettchristiangeofferdon15@gmail.com', [
    { name: 'Student Dashboard', url: '/dashboard', filename: '06_student_dashboard.png', expectedText: 'Overview' },
    { name: 'Team Roster & Lock Management', url: '/teams', filename: '07_student_team.png', expectedText: 'Team' },
    { name: 'Student Project View', url: '/project', filename: '08_student_project.png', expectedText: 'Capstone' },
  ]);

  // 3. Faculty Adviser Workflow
  await auditRoleWorkflow('Faculty Adviser', 'leon.mentor.buksu@gmail.com', [
    { name: 'Adviser Dashboard', url: '/dashboard', filename: '09_adviser_dashboard.png', expectedText: 'Overview' },
    { name: 'Adviser Assigned Advisees', url: '/projects?filter=advisees', filename: '10_adviser_projects.png', expectedText: 'Advisees' },
    { name: 'Team Review Workflow', url: '/adviser/team-review', filename: '11_adviser_team_review.png', expectedText: 'Review' },
  ]);

  // 4. Faculty Panelist Workflow
  await auditRoleWorkflow('Faculty Panelist', '2301105311@student.buksu.edu.ph', [
    { name: 'Panelist Dashboard', url: '/dashboard', filename: '12_panelist_dashboard.png', expectedText: 'Overview' },
    { name: 'Panelist Project Filter', url: '/projects?filter=advisees', filename: '13_panelist_projects.png' },
  ]);

  await browser.close();

  console.log('\n====================================================================');
  console.log('🖼️ VISUAL AUDIT & IMAGE ACCURACY VERIFICATION MATRIX');
  console.log('====================================================================');
  let passCount = 0;
  for (const item of report) {
    const status = item.verified ? '✅ ACCURATE' : '⚠️ NOTICE';
    if (item.verified) passCount++;
    console.log(`${status} | ${item.role.padEnd(24)} | ${item.step.padEnd(30)} | ${item.filename} (${item.fileSizeKB} KB)`);
  }
  console.log('====================================================================');
  console.log(`Summary: ${passCount} / ${report.length} Visual Targets Verified Accurate.`);
  console.log('====================================================================\n');
}

runVisualWorkflowAudit().catch((err) => {
  console.error('Visual Audit Runner Error:', err);
  process.exit(1);
});
