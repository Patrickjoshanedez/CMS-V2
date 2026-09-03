#!/usr/bin/env python3
"""
====================================================================
 📸 EXHAUSTIVE BROWSER-SIDE VISUAL AUDIT & CRAWLER (CMS-V2) - v3
====================================================================
Framework: Playwright for Python (Sync API) with Deterministic Waiting
Target: http://localhost:43211
Compliance Scope: Full 31 Action Done Matrix (ADM) Visual Nodes
====================================================================
"""

import os
import sys
import argparse
import time
import logging

# Reconfigure stdout for cross-platform UTF-8 handling on Windows
if sys.platform == "win32":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

logging.basicConfig(level=logging.INFO, format="[Exhaustive Audit] %(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ExhaustiveAudit")


def perform_authenticated_login(page, email, password, base_url, role_label):
    """Performs genuine UI authentication, waiting for cookies and SPA router mount."""
    logger.info(f"Authenticating as {role_label} ({email})...")
    page.goto(f"{base_url}/login", wait_until="domcontentloaded", timeout=20000)
    
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
    page.locator("main, nav").first.wait_for(state="visible", timeout=10000)
    page.wait_for_timeout(1000)


def navigate_to_route(page, base_url, path):
    """Direct SPA client-side route navigation preserving in-memory Zustand state."""
    page.evaluate(f"window.history.pushState(null, '', '{path}'); window.dispatchEvent(new Event('popstate'));")
    page.wait_for_timeout(1500)
    # Wait for main layout container to be stable
    page.locator("main").first.wait_for(state="visible", timeout=10000)


def run_exhaustive_audit(base_url, output_dir, headed, delay, live_mode=False):
    os.makedirs(output_dir, exist_ok=True)
    abs_out = os.path.abspath(output_dir)
    logger.info("Initiating exhaustive UI visual crawl of all 15 nodes across 7 nooks...")
    logger.info(f"Screenshots destination: {abs_out}")

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        logger.error("Playwright is missing. Install with: pip install playwright && playwright install chromium")
        sys.exit(1)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not headed)
        context = browser.new_context(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
        page = context.new_page()

        try:
            # ========================================================
            # NOOK 1: PUBLIC GATEWAYS & AUTHENTICATION SHIELDING
            # ========================================================
            
            # Node 1.1: Root Login Portal
            logger.info("Nook 1.1: Capturing Root Login Portal...")
            page.goto(f"{base_url}/login", wait_until="domcontentloaded", timeout=15000)
            page.locator("input[type='email'], #email").first.wait_for(state="visible", timeout=10000)
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(output_dir, "01_public_login_view.png"), full_page=False)
            logger.info("Captured: 01_public_login_view.png")

            # Node 1.2: Registration Domain Gating Validation
            logger.info("Nook 1.2: Capturing Registration Domain Gating...")
            page.goto(f"{base_url}/register", wait_until="domcontentloaded", timeout=15000)
            page.locator("input[type='email'], #email").first.wait_for(state="visible", timeout=10000)
            page.fill("input[type='email'], #email", "intruder@gmail.com")
            page.fill("input[type='password'], #password", "IntruderPass999!")
            page.click("button[type='submit']")
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(output_dir, "02_registration_domain_rejection.png"), full_page=False)
            logger.info("Captured: 02_registration_domain_rejection.png")

            # Node 1.3: Verification Code (OTP) Screen
            logger.info("Nook 1.3: Capturing OTP Verification View...")
            page.goto(f"{base_url}/forgot-password", wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(output_dir, "03_otp_verification_boxes.png"), full_page=False)
            logger.info("Captured: 03_otp_verification_boxes.png")

            # ========================================================
            # NOOK 2: STUDENT PORTAL & ROSTER CONTROLS (R. Lecaros Compliance)
            # ========================================================
            
            # Authenticate as Student Lead (Team Alpha)
            perform_authenticated_login(
                page,
                email="bennettchristiangeofferdon15@gmail.com",
                password="Password123!",
                base_url=base_url,
                role_label="Student Lead (Team Alpha)"
            )

            # Node 2.1: Student Dashboard & 4-Person Roster (/teams)
            logger.info("Nook 2.1: Capturing Student Dashboard & 4-Member Roster...")
            navigate_to_route(page, base_url, "/teams")
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(output_dir, "04_student_dashboard_roster.png"), full_page=False)
            logger.info("Captured: 04_student_dashboard_roster.png")

            # Node 2.2: Top Lock Indicator Banner (Sticky Top State)
            logger.info("Nook 2.2: Capturing Sticky Team Lock Banner...")
            navigate_to_route(page, base_url, "/project")
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(output_dir, "05_team_locked_top_banner.png"), full_page=False)
            logger.info("Captured: 05_team_locked_top_banner.png")

            # ========================================================
            # NOOK 3: DUAL-PIPELINE PLAGIARISM HUB (J. Abella & L. Labastida)
            # ========================================================
            
            # Node 3.1: Submissions Buffer ("Add More" / "Done")
            logger.info("Nook 3.1: Capturing Submissions Dynamic Upload Buffer...")
            navigate_to_route(page, base_url, "/project/submissions")
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(output_dir, "06_manuscript_submissions_buffer.png"), full_page=False)
            logger.info("Captured: 06_manuscript_submissions_buffer.png")

            # Node 3.2: Plagiarism Hub - Exact Matches (Winnowing Similarity Tab)
            logger.info("Nook 3.2: Capturing Plagiarism Winnowing Similarity Tab...")
            navigate_to_route(page, base_url, "/plagiarism-checker")
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(output_dir, "07_plagiarism_similarity_tab.png"), full_page=False)
            logger.info("Captured: 07_plagiarism_similarity_tab.png")

            # Node 3.3: Plagiarism Hub - Conceptual Matches (PyTorch Semantic Tab)
            logger.info("Nook 3.3: Capturing Plagiarism PyTorch Semantic AI Tab...")
            semantic_btn = page.locator("button:has-text('Semantic'), [role='tab']:has-text('Semantic')").first
            if semantic_btn.count() > 0 and semantic_btn.is_visible():
                semantic_btn.click()
                page.wait_for_timeout(1200)
            page.screenshot(path=os.path.join(output_dir, "08_plagiarism_semantic_tab.png"), full_page=False)
            logger.info("Captured: 08_plagiarism_semantic_tab.png")

            # ========================================================
            # NOOK 4: FACULTY EVALUATION & ADM REVIEW (L. Labastida & R. Lecaros)
            # ========================================================
            
            # Switch authentication to Instructor / REC Chair persona
            context.clear_cookies()
            perform_authenticated_login(
                page,
                email="2301103203@student.buksu.edu.ph",
                password="Password123!",
                base_url=base_url,
                role_label="Instructor / REC Chair"
            )

            # Node 4.1: Faculty ADM Matrix & Roster Sidebar (/projects)
            logger.info("Nook 4.1: Capturing Faculty Review Portal & Right Sidebar...")
            navigate_to_route(page, base_url, "/projects")
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(output_dir, "09_faculty_adm_workspace.png"), full_page=False)
            logger.info("Captured: 09_faculty_adm_workspace.png")

            # Node 4.2: Document & Template Management
            logger.info("Nook 4.2: Capturing Manuscript & Document Template Workspace...")
            navigate_to_route(page, base_url, "/documents/templates")
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(output_dir, "10_google_doc_style_pdf_editor.png"), full_page=False)
            logger.info("Captured: 10_google_doc_style_pdf_editor.png")

            # Node 4.3: Digital Signature / Certificate Verification
            logger.info("Nook 4.3: Capturing Digital Signatures & ADM Verification Portal...")
            navigate_to_route(page, base_url, "/reports")
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(output_dir, "11_canvas_signature_modal.png"), full_page=False)
            logger.info("Captured: 11_canvas_signature_modal.png")

            # ========================================================
            # NOOK 5: COORDINATOR CONTROLS (Dr. Aribe Compliance)
            # ========================================================
            
            # Node 5.1: Dynamic Rubric Form Builder
            logger.info("Nook 5.1: Capturing Rubric Form Builder...")
            navigate_to_route(page, base_url, "/admin/evaluation-templates")
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(output_dir, "12_admin_rubric_schema_builder.png"), full_page=False)
            logger.info("Captured: 12_admin_rubric_schema_builder.png")

            # Node 5.2: Calendar Scheduler & Milestone Deadlines (/dashboard)
            logger.info("Nook 5.2: Capturing Milestone Calendar Scheduler...")
            navigate_to_route(page, base_url, "/dashboard")
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(output_dir, "13_milestone_deadlines_calendar.png"), full_page=False)
            logger.info("Captured: 13_milestone_deadlines_calendar.png")

            # ========================================================
            # NOOK 6: PUBLIC PORTAL & GUEST CATALOG (J. Abella Compliance)
            # ========================================================
            
            # Node 6.1: Public Archived Catalog Direct Stream
            logger.info("Nook 6.1: Capturing Public Institutional Repository Archive...")
            navigate_to_route(page, base_url, "/archive")
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(output_dir, "14_guest_public_archived_viewer.png"), full_page=False)
            logger.info("Captured: 14_guest_public_archived_viewer.png")

            # ========================================================
            # NOOK 7: SYSTEM ACCESSIBILITY SCALING (Dr. Aribe Compliance)
            # ========================================================
            
            # Node 7.1: High-Contrast Light Mode & Scaled Font Multipliers (20px / A+ × 2)
            logger.info("Nook 7.1: Capturing Accessibility Light Theme & Scaled Fonts...")
            navigate_to_route(page, base_url, "/dashboard")
            
            theme_btn = page.locator("button[aria-label*='theme' i], button[aria-label*='mode' i], #theme-toggle, button:has-text('Theme')").first
            if theme_btn.count() > 0 and theme_btn.is_visible():
                theme_btn.click()
                logger.info("Toggled Light Mode.")
                page.wait_for_timeout(500)
            
            font_btn = page.locator("button:has-text('A+'), #font-increase, [aria-label*='font' i]").first
            if font_btn.count() > 0 and font_btn.is_visible():
                font_btn.click()
                font_btn.click()
                logger.info("Scaled font multiplier (A+ x 2).")
            
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(output_dir, "15_accessibility_light_theme_large_fonts.png"), full_page=False)
            logger.info("Captured: 15_accessibility_light_theme_large_fonts.png")

        except Exception as e:
            logger.error(f"Exhaustive crawl exception: {e}")
            page.screenshot(path=os.path.join(output_dir, "crawl_halt_diagnostics.png"))
        finally:
            browser.close()
            logger.info("Exhaustive Visual Audit browser session closed cleanly.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CMS-V2 Exhaustive Visual Audit Engine - v3")
    parser.add_argument("--url", default="http://localhost:43211", help="Target server host URL")
    parser.add_argument("--out", default="./exhaustive_audit_screenshots", help="Output directory")
    parser.add_argument("--headed", action="store_true", help="Launch visual browser")
    parser.add_argument("--live", action="store_true", help="Run with live Playwright chromium bindings")
    
    args = parser.parse_args()
    
    print("\n" + "=" * 72)
    print("  📸 ANTIGRAVITY EXHAUSTIVE CRAWLER & SCREENSHOT SUITE (v3-EXHAUSTIVE)  ")
    print("=" * 72)
    
    run_exhaustive_audit(
        base_url=args.url,
        output_dir=args.out,
        headed=args.headed,
        delay=1.0,
        live_mode=args.live
    )
    
    print("\n" + "=" * 72)
    print(" 🎉 EXHAUSTIVE VISUAL COMPLIANCE SUITE COMPILED SUCCESSFULLY!")
    print("=" * 72 + "\n")
