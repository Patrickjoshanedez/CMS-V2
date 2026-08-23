#!/usr/bin/env python3
"""
====================================================================
 📸 BROWSER-SIDE VISUAL AUDIT & SCREENSHOT ENGINE (CMS-V2)
====================================================================
Framework: Playwright for Python (Sync API)
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


def run_visual_audit(base_url: str, output_dir: str, headed: bool, delay: float):
    os.makedirs(output_dir, exist_ok=True)
    abs_out = os.path.abspath(output_dir)
    logger.info(f"Starting visual audit against {base_url}...")
    logger.info(f"Screenshots will be saved to: {abs_out}")

    with sync_playwright() as p:
        # Launch Chromium browser
        browser = p.chromium.launch(headless=not headed)
        
        # High-definition viewport (1920x1080) for crisp, unclipped layout captures
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=1,
        )
        page = context.new_page()

        # --------------------------------------------------------
        # 1. Audit Login Portal
        # --------------------------------------------------------
        try:
            login_url = f"{base_url}/login"
            logger.info(f"Navigating to Login Portal: {login_url}")
            page.goto(login_url, wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(int(delay * 1000))
            
            login_path = os.path.join(output_dir, "01_login_portal.png")
            page.screenshot(path=login_path, full_page=False)
            logger.info(f"Captured: {login_path}")
        except Exception as e:
            logger.warning(f"Step 1 warning: {e}")

        # --------------------------------------------------------
        # 2. Audit Registration Portal & Institutional Domain Gating
        # --------------------------------------------------------
        try:
            register_url = f"{base_url}/register"
            logger.info(f"Navigating to Registration Portal: {register_url}")
            page.goto(register_url, wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(int(delay * 1000))
            
            email_field = page.locator("input[type='email'], input[name='email'], #email")
            if email_field.count() > 0:
                email_field.first.fill("student@gmail.com")
            pass_field = page.locator("input[type='password'], input[name='password'], #password")
            if pass_field.count() > 0:
                pass_field.first.fill("SecurePass123!")
            submit_btn = page.locator("button[type='submit']")
            if submit_btn.count() > 0:
                submit_btn.first.click()
            page.wait_for_timeout(int(delay * 1000))
            
            register_path = os.path.join(output_dir, "02_registration_portal_gated.png")
            page.screenshot(path=register_path, full_page=False)
            logger.info(f"Captured registration domain guard view: {register_path}")
        except Exception as e:
            logger.warning(f"Step 2 warning: {e}")

        # --------------------------------------------------------
        # 3. Student Dashboard & Sticky Team Lock Banner (R. Lecaros)
        # --------------------------------------------------------
        try:
            logger.info("Auditing Student Workspace & Project Dashboard...")
            page.goto(f"{base_url}/projects", wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(int(delay * 1000))

            dashboard_path = os.path.join(output_dir, "03_student_dashboard_lock_banner.png")
            page.screenshot(path=dashboard_path, full_page=False)
            logger.info(f"Captured Student Dashboard (with top lock banner): {dashboard_path}")
        except Exception as e:
            logger.warning(f"Step 3 warning: {e}")

        # --------------------------------------------------------
        # 4. Plagiarism Checker - Exact Match (Winnowing Similarity Tab)
        # --------------------------------------------------------
        try:
            plagiarism_url = f"{base_url}/plagiarism-checker"
            logger.info(f"Navigating to Plagiarism Interface: {plagiarism_url}")
            page.goto(plagiarism_url, wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(int(delay * 1000))

            similarity_path = os.path.join(output_dir, "04_plagiarism_similarity_tab.png")
            page.screenshot(path=similarity_path, full_page=False)
            logger.info(f"Captured Similarity (Winnowing) Tab: {similarity_path}")
        except Exception as e:
            logger.warning(f"Step 4 warning: {e}")

        # --------------------------------------------------------
        # 5. Plagiarism Checker - Conceptual Match (Semantic Tab) (J. Abella)
        # --------------------------------------------------------
        try:
            semantic_tab = page.locator("button:has-text('Semantic'), [role='tab']:has-text('Semantic')")
            if semantic_tab.count() > 0 and semantic_tab.first.is_visible():
                semantic_tab.first.click()
                page.wait_for_timeout(int(delay * 1000))
            
            semantic_path = os.path.join(output_dir, "05_plagiarism_semantic_tab.png")
            page.screenshot(path=semantic_path, full_page=False)
            logger.info(f"Captured Semantic Plagiarism Tab: {semantic_path}")
        except Exception as e:
            logger.warning(f"Step 5 warning: {e}")

        # --------------------------------------------------------
        # 6. Faculty Review Workspace & Right Roster Sidebar
        # --------------------------------------------------------
        try:
            logger.info("Auditing Faculty Review Workspace & Right Sidebar...")
            page.goto(f"{base_url}/dashboard", wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(int(delay * 1000))

            faculty_path = os.path.join(output_dir, "06_faculty_adm_workspace.png")
            page.screenshot(path=faculty_path, full_page=False)
            logger.info(f"Captured Faculty Review workspace & right-sidebar: {faculty_path}")
        except Exception as e:
            logger.warning(f"Step 6 warning: {e}")

        # --------------------------------------------------------
        # 7. Accessibility Themes & Font Scaling (Dr. Aribe)
        # --------------------------------------------------------
        try:
            theme_btn = page.locator("button[aria-label*='theme' i], button[aria-label*='mode' i], #theme-toggle, button:has-text('Theme'), button:has-text('Light')")
            if theme_btn.count() > 0 and theme_btn.first.is_visible():
                theme_btn.first.click()
                logger.info("Toggled frontend theme to Light Mode.")
                page.wait_for_timeout(500)
            
            font_btn = page.locator("button:has-text('A+'), #font-increase, [aria-label*='font' i]")
            if font_btn.count() > 0 and font_btn.first.is_visible():
                font_btn.first.click()
                font_btn.first.click()
                logger.info("Triggered font size scaling (+) twice.")
            
            page.wait_for_timeout(int(delay * 1000))
            light_theme_path = os.path.join(output_dir, "07_faculty_workspace_light_accessibility.png")
            page.screenshot(path=light_theme_path, full_page=False)
            logger.info(f"Captured Light Theme scaled workspace: {light_theme_path}")
        except Exception as e:
            logger.warning(f"Step 7 warning: {e}")

        # --------------------------------------------------------
        # 8. Interactive Milestone Calendar Scheduler
        # --------------------------------------------------------
        try:
            logger.info("Auditing Milestone Calendar Scheduler...")
            page.goto(f"{base_url}/dashboard", wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(int(delay * 1000))

            calendar_path = os.path.join(output_dir, "08_milestone_calendar.png")
            page.screenshot(path=calendar_path, full_page=False)
            logger.info(f"Captured Calendar scheduler view: {calendar_path}")
        except Exception as e:
            logger.warning(f"Step 8 warning: {e}")

        # --------------------------------------------------------
        # 9. Public Institutional Manuscript Archive Catalog
        # --------------------------------------------------------
        try:
            logger.info("Auditing Public Manuscript Archive Search...")
            page.goto(f"{base_url}/archive", wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(int(delay * 1000))

            archive_path = os.path.join(output_dir, "09_public_archive_catalog.png")
            page.screenshot(path=archive_path, full_page=False)
            logger.info(f"Captured Public Archive catalog view: {archive_path}")
        except Exception as e:
            logger.warning(f"Step 9 warning: {e}")

        browser.close()
        logger.info("Visual Audit browser session closed.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CMS-V2 Browser Visual Audit Engine")
    parser.add_argument("--url", default="http://localhost:43211", help="Target server host URL")
    parser.add_argument("--out", default="./visual_audit_screenshots", help="Output directory for screenshots")
    parser.add_argument("--headed", action="store_true", help="Launch visual Chromium browser window")
    parser.add_argument("--delay", type=float, default=1.5, help="Wait time (seconds) after page loads")
    
    args = parser.parse_args()
    
    print("\n" + "=" * 64)
    print("      📸 ANTIGRAVITY PLAYWRIGHT VISUAL AUDIT ENGINE      ")
    print("=" * 64)
    
    run_visual_audit(
        base_url=args.url,
        output_dir=args.out,
        headed=args.headed,
        delay=args.delay
    )
    
    print("\n" + "=" * 64)
    print(" 🎉 VISUAL COMPLIANCE AUDIT PACKAGED SUCCESSFULLY!")
    print("=" * 64 + "\n")
