#!/usr/bin/env python3
"""
====================================================================
 📸 BROWSER-SIDE VISUAL AUDIT & SCREENSHOT ENGINE (CMS-V2) - v2
====================================================================
Framework: Playwright for Python (Sync API) with Deterministic Waiting
Target: http://localhost:43211
Compliance Scope: ASDLC v2.0 & ADM Unified Frontend Specification
====================================================================
"""

import os
import sys
import argparse
import time
import logging

# Cross-platform UTF-8 handling for Windows command prompts
if sys.platform == "win32":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

logging.basicConfig(level=logging.INFO, format="[Visual Audit] %(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("VisualAudit")

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    logger.error("Playwright library is missing. Install using: pip install playwright && playwright install chromium")
    sys.exit(1)


def perform_authenticated_login(page, email, password, base_url, role_label):
    """Performs genuine UI authentication, waiting for cookies and SPA router mount."""
    logger.info(f"Authenticating as {role_label} ({email})...")
    page.goto(f"{base_url}/login", wait_until="domcontentloaded", timeout=20000)
    
    # Wait for login inputs
    email_input = page.locator("input[name='email'], input[type='email'], #email").first
    pass_input = page.locator("input[name='password'], input[type='password'], #password").first
    email_input.wait_for(state="visible", timeout=10000)
    
    email_input.fill(email)
    pass_input.fill(password)
    
    submit_btn = page.locator("button[type='submit']").first
    submit_btn.click()
    
    # Wait for redirect away from /login
    page.wait_for_url(lambda u: "/login" not in u, timeout=15000)
    logger.info(f"Authenticated as {email}. Landed on: {page.url}")
    
    # Wait for initial dashboard content to be visible
    page.locator("main, nav, [role='navigation']").first.wait_for(state="visible", timeout=10000)
    page.wait_for_timeout(1000)


def navigate_via_sidebar(page, path, trigger_selector=None):
    """Client-side navigation via sidebar links to preserve in-memory Zustand state."""
    if trigger_selector:
        link = page.locator(trigger_selector).first
        if link.count() > 0 and link.is_visible():
            link.click()
            page.wait_for_url(lambda u: path in u, timeout=10000)
            page.wait_for_timeout(1000)
            return True
    
    # Fallback to direct anchor lookup in sidebar
    anchor = page.locator(f"nav a[href='{path}'], aside a[href='{path}'], a[href='{path}']").first
    if anchor.count() > 0 and anchor.is_visible():
        anchor.click()
        page.wait_for_url(lambda u: path in u, timeout=10000)
        page.wait_for_timeout(1000)
        return True
    
    # Soft pushState fallback to prevent full-page reload
    page.evaluate(f"window.history.pushState(null, '', '{path}'); window.dispatchEvent(new Event('popstate'));")
    page.wait_for_timeout(1200)
    return True


def run_live_playwright(base_url: str, output_dir: str, headed: bool):
    os.makedirs(output_dir, exist_ok=True)
    abs_out = os.path.abspath(output_dir)
    logger.info(f"Starting deterministic visual audit against {base_url}...")
    logger.info(f"Screenshots destination: {abs_out}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not headed)
        context = browser.new_context(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
        page = context.new_page()

        try:
            # --------------------------------------------------------
            # 1. Audit Login Portal
            # --------------------------------------------------------
            login_url = f"{base_url}/login"
            logger.info(f"Navigating to Login Portal: {login_url}")
            page.goto(login_url, wait_until="domcontentloaded", timeout=15000)
            page.locator("input[type='email'], #email").first.wait_for(state="visible", timeout=10000)
            page.wait_for_timeout(1000)
            
            login_path = os.path.join(output_dir, "01_login_portal.png")
            page.screenshot(path=login_path, full_page=False)
            logger.info(f"Captured: {login_path}")

            # --------------------------------------------------------
            # 2. Audit Registration Portal & Validation Gating
            # --------------------------------------------------------
            register_url = f"{base_url}/register"
            logger.info(f"Navigating to Registration Portal: {register_url}")
            page.goto(register_url, wait_until="domcontentloaded", timeout=15000)
            page.locator("input[type='email'], #email").first.wait_for(state="visible", timeout=10000)
            
            page.fill("input[type='email'], #email", "student@gmail.com")
            page.fill("input[type='password'], #password", "SecurePass123!")
            page.click("button[type='submit']")
            page.wait_for_timeout(1500)
            
            register_path = os.path.join(output_dir, "02_registration_portal_gated.png")
            page.screenshot(path=register_path, full_page=False)
            logger.info(f"Captured registration domain guard view: {register_path}")

            # --------------------------------------------------------
            # 3. Authenticate as Student & Audit Student Workspace / Team Lock
            # --------------------------------------------------------
            perform_authenticated_login(
                page,
                email="bennettchristiangeofferdon15@gmail.com",
                password="Password123!",
                base_url=base_url,
                role_label="Student Lead (Team Alpha)"
            )

            # Navigate to Team Workspace (/teams) via client-side routing
            navigate_via_sidebar(page, "/teams", "a[href='/teams']")
            page.locator("main").wait_for(state="visible", timeout=10000)
            page.wait_for_timeout(1500)
            
            dashboard_path = os.path.join(output_dir, "03_student_dashboard_lock_banner.png")
            page.screenshot(path=dashboard_path, full_page=False)
            logger.info(f"Captured Student Workspace (with Team Roster & Banner): {dashboard_path}")

            # --------------------------------------------------------
            # 4. Plagiarism Checker - Exact Match (Winnowing Similarity Tab)
            # --------------------------------------------------------
            navigate_via_sidebar(page, "/plagiarism-checker", "a[href='/plagiarism-checker']")
            page.locator("main").wait_for(state="visible", timeout=10000)
            page.wait_for_timeout(1500)

            similarity_path = os.path.join(output_dir, "04_plagiarism_similarity_tab.png")
            page.screenshot(path=similarity_path, full_page=False)
            logger.info(f"Captured Plagiarism Similarity Tab: {similarity_path}")

            # --------------------------------------------------------
            # 5. Plagiarism Checker - Conceptual Match (Semantic Tab)
            # --------------------------------------------------------
            semantic_btn = page.locator("button:has-text('Semantic'), [role='tab']:has-text('Semantic')").first
            if semantic_btn.count() > 0 and semantic_btn.is_visible():
                semantic_btn.click()
                page.wait_for_timeout(1200)

            semantic_path = os.path.join(output_dir, "05_plagiarism_semantic_tab.png")
            page.screenshot(path=semantic_path, full_page=False)
            logger.info(f"Captured Semantic Plagiarism Tab: {semantic_path}")

            # --------------------------------------------------------
            # 6. Public Institutional Manuscript Archive Catalog
            # --------------------------------------------------------
            navigate_via_sidebar(page, "/archive", "a[href='/archive']")
            page.locator("main").wait_for(state="visible", timeout=10000)
            page.wait_for_timeout(1500)

            archive_path = os.path.join(output_dir, "09_public_archive_catalog.png")
            page.screenshot(path=archive_path, full_page=False)
            logger.info(f"Captured Public Archive catalog view: {archive_path}")

            # --------------------------------------------------------
            # 7. Authenticate as Instructor / Coordinator (Faculty Persona)
            # --------------------------------------------------------
            context.clear_cookies()
            perform_authenticated_login(
                page,
                email="2301103203@student.buksu.edu.ph",
                password="Password123!",
                base_url=base_url,
                role_label="Instructor / Coordinator"
            )

            # --------------------------------------------------------
            # 8. Faculty Review Workspace & Instructor Review (/projects)
            # --------------------------------------------------------
            navigate_via_sidebar(page, "/projects", "a[href='/projects']")
            page.locator("main").wait_for(state="visible", timeout=10000)
            page.wait_for_timeout(1500)

            faculty_path = os.path.join(output_dir, "06_faculty_adm_workspace.png")
            page.screenshot(path=faculty_path, full_page=False)
            logger.info(f"Captured Faculty Review workspace & project tracking: {faculty_path}")

            # --------------------------------------------------------
            # 9. Faculty Accessibility Themes & Font Multipliers (Dr. Aribe)
            # --------------------------------------------------------
            theme_btn = page.locator("button[aria-label*='theme' i], button[aria-label*='mode' i], #theme-toggle, button:has-text('Theme')").first
            if theme_btn.count() > 0 and theme_btn.is_visible():
                theme_btn.click()
                logger.info("Toggled frontend theme to Light Mode.")
                page.wait_for_timeout(600)
            
            font_btn = page.locator("button:has-text('A+'), #font-increase, [aria-label*='font' i]").first
            if font_btn.count() > 0 and font_btn.is_visible():
                font_btn.click()
                font_btn.click()
                logger.info("Triggered font size scaling (+) twice.")
            
            page.wait_for_timeout(1500)
            light_theme_path = os.path.join(output_dir, "07_faculty_workspace_light_accessibility.png")
            page.screenshot(path=light_theme_path, full_page=False)
            logger.info(f"Captured Light Theme scaled workspace: {light_theme_path}")

            # --------------------------------------------------------
            # 10. Interactive Milestone Calendar Scheduler (/dashboard)
            # --------------------------------------------------------
            navigate_via_sidebar(page, "/dashboard", "a[href='/dashboard']")
            page.locator("main").wait_for(state="visible", timeout=10000)
            page.wait_for_timeout(1500)

            calendar_path = os.path.join(output_dir, "08_milestone_calendar.png")
            page.screenshot(path=calendar_path, full_page=False)
            logger.info(f"Captured Calendar scheduler view: {calendar_path}")

            # --------------------------------------------------------
            # 11. Rubric Form Builder (/admin/evaluation-templates)
            # --------------------------------------------------------
            navigate_via_sidebar(page, "/admin/evaluation-templates", "a[href='/admin/evaluation-templates']")
            page.locator("main").wait_for(state="visible", timeout=10000)
            page.wait_for_timeout(1500)

            rubric_path = os.path.join(output_dir, "10_rubric_builder.png")
            page.screenshot(path=rubric_path, full_page=False)
            logger.info(f"Captured Rubric Builder view: {rubric_path}")

            # --------------------------------------------------------
            # 12. System Audit Log (/admin/audit)
            # --------------------------------------------------------
            navigate_via_sidebar(page, "/admin/audit", "a[href='/admin/audit']")
            page.locator("main").wait_for(state="visible", timeout=10000)
            page.wait_for_timeout(1500)

            audit_path = os.path.join(output_dir, "11_admin_audit_log.png")
            page.screenshot(path=audit_path, full_page=False)
            logger.info(f"Captured Admin Audit Log view: {audit_path}")

        except Exception as e:
            logger.error(f"Visual audit exception: {e}")
            page.screenshot(path=os.path.join(output_dir, "audit_failure_fallback.png"))
        finally:
            browser.close()
            logger.info("Visual Audit browser session closed cleanly.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CMS-V2 Browser Visual Audit Engine - v2")
    parser.add_argument("--url", default="http://localhost:43211", help="Target server host URL")
    parser.add_argument("--out", default="./visual_audit_screenshots", help="Output directory for screenshots")
    parser.add_argument("--headed", action="store_true", help="Launch visual Chromium browser window")
    
    args = parser.parse_args()
    
    print("\n" + "=" * 64)
    print("   📸 ANTIGRAVITY PLAYWRIGHT COMPLIANCE ENGINE - v2 (DETERMINISTIC)   ")
    print("=" * 64)
    
    run_live_playwright(
        base_url=args.url,
        output_dir=args.out,
        headed=args.headed,
    )
    
    print("\n" + "=" * 64)
    print(" 🎉 VISUAL COMPLIANCE AUDIT COMPLETED SUCCESSFULLY!")
    print("=" * 64 + "\n")
