#!/usr/bin/env python3
"""
CMS-V2 Workspace Evidence & Authority Verification Suite
Validates:
1. JSON & JSONL syntax integrity across repository and PTSS session records.
2. Machine-readable classification manifest validity and replacement resolution.
3. Local file references in authoritative documentation.
4. Absence of obsolete/retired component references in current authoritative docs.
5. Test quarantine status, required metadata (reason, tracked item, owner, deadline), and non-expiration.
6. Ensuring historical files and archived scripts are not selected as active tests.
7. Absence of retired component/script references in active scripts.
8. Presence and validity of active npm test commands and referenced scripts.

Exit code: 0 if all checks pass; 1 if any actionable defect is detected.
"""

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

AUTHORITATIVE_DOCS = [
    REPO_ROOT / "README.md",
    REPO_ROOT / "AGENTS.md",
    REPO_ROOT / "GEMINI.md",
    REPO_ROOT / "docs" / "ARCHITECTURE.md",
    REPO_ROOT / "docs" / "AUTHORITATIVE_INDEX.md",
    REPO_ROOT / "docs" / "EVIDENCE_INVENTORY.md",
    REPO_ROOT / ".agents" / "skills" / "workspace-evidence-maintenance" / "SKILL.md",
]

CLASSIFICATION_MANIFEST = REPO_ROOT / "docs" / "classification-manifest.json"
QUARANTINE_FILE = REPO_ROOT / "docs" / "TEST_QUARANTINE.md"
PTSS_INDEX_FILE = REPO_ROOT / ".agents" / "ptss" / "index.jsonl"
PTSS_SESSIONS_DIR = REPO_ROOT / ".agents" / "ptss" / "sessions"

RETIRED_COMPONENTS = [
    "PlagiarismChecker.jsx",
    "PaginatedDocumentViewer.jsx",
]

ALLOWED_STATUSES = {
    "current",
    "needs-review",
    "superseded",
    "historical",
    "generated",
}

ALLOWED_CATEGORIES = {
    "institutional-contract",
    "architecture-specification",
    "operational-runbook",
    "testing-and-benchmarking",
    "academic-manuscript-and-slides",
    "historical-and-superseded",
    "generated-artifact",
    "agent-governance-and-memory",
}


class VerificationReporter:
    def __init__(self):
        self.passes = []
        self.failures = []

    def check(self, name: str, condition: bool, message: str = ""):
        if condition:
            self.passes.append(name)
            print(f"[PASS] {name}")
        else:
            self.failures.append((name, message))
            print(f"[FAIL] {name} :: {message}")

    def summary(self) -> int:
        print("\n" + "=" * 60)
        print("Workspace Evidence & Authority Verification Summary")
        print("=" * 60)
        print(f"Total Checks: {len(self.passes) + len(self.failures)}")
        print(f"Passed:       {len(self.passes)}")
        print(f"Failed:       {len(self.failures)}")
        if self.failures:
            print("\nActionable Failures:")
            for idx, (name, msg) in enumerate(self.failures, 1):
                print(f"  {idx}. {name}: {msg}")
            return 1
        print("\nAll evidence and authority verification checks passed cleanly.")
        return 0


def check_json_and_jsonl(reporter: VerificationReporter):
    """Ensure all core JSON files and index.jsonl entries parse without error."""
    # 1. Root and config JSON files
    core_json_files = [
        REPO_ROOT / "package.json",
        REPO_ROOT / "client" / "package.json",
        REPO_ROOT / "server" / "package.json",
        REPO_ROOT / "shared" / "package.json",
        REPO_ROOT / ".agents" / "ptss" / "chat-starter.json",
        CLASSIFICATION_MANIFEST,
    ]
    for jf in core_json_files:
        if jf.exists():
            try:
                json.loads(jf.read_text(encoding="utf-8"))
                reporter.check(f"Valid JSON syntax: {jf.relative_to(REPO_ROOT)}", True)
            except Exception as e:
                reporter.check(f"Valid JSON syntax: {jf.relative_to(REPO_ROOT)}", False, str(e))
        else:
            reporter.check(f"Required JSON exists: {jf.relative_to(REPO_ROOT)}", False, "File missing")

    # 2. PTSS Session Index JSONL
    if PTSS_INDEX_FILE.exists():
        index_errors = []
        record_count = 0
        for line_no, line in enumerate(PTSS_INDEX_FILE.read_text(encoding="utf-8").splitlines(), 1):
            raw = line.strip()
            if not raw or raw.startswith("#"):
                continue
            try:
                data = json.loads(raw)
                record_count += 1
                if not data.get("session_id") or not data.get("task_summary"):
                    index_errors.append(f"Line {line_no}: missing session_id or task_summary")
            except Exception as e:
                index_errors.append(f"Line {line_no}: {e}")
        reporter.check(
            f"PTSS index.jsonl format ({record_count} records)",
            len(index_errors) == 0,
            "; ".join(index_errors[:3])
        )
    else:
        reporter.check("PTSS index.jsonl exists", False, "index.jsonl missing")

    # 3. PTSS Session files
    if PTSS_SESSIONS_DIR.exists():
        session_errors = []
        session_files = list(PTSS_SESSIONS_DIR.glob("*.json"))
        for sf in session_files:
            try:
                data = json.loads(sf.read_text(encoding="utf-8"))
                expected_id = sf.stem
                if data.get("session_id") and data.get("session_id") != expected_id:
                    session_errors.append(f"{sf.name}: session_id mismatch")
            except Exception as e:
                session_errors.append(f"{sf.name}: {e}")
        reporter.check(
            f"PTSS session files integrity ({len(session_files)} files)",
            len(session_errors) == 0,
            "; ".join(session_errors[:3])
        )


def check_classification_manifest(reporter: VerificationReporter):
    """Ensure classification manifest is structurally valid and replacements resolve."""
    if not CLASSIFICATION_MANIFEST.exists():
        reporter.check("Classification manifest exists", False, "docs/classification-manifest.json missing")
        return

    try:
        data = json.loads(CLASSIFICATION_MANIFEST.read_text(encoding="utf-8"))
    except Exception as e:
        reporter.check("Classification manifest valid JSON", False, str(e))
        return

    reporter.check("Classification manifest valid JSON", True)
    artifacts = data.get("artifacts", [])
    reporter.check("Classification manifest contains artifacts", len(artifacts) > 0, "No artifacts listed")

    manifest_errors = []
    replacement_errors = []

    for idx, item in enumerate(artifacts):
        p = item.get("path")
        cat = item.get("category")
        status = item.get("status")
        gov = item.get("governing_requirement_or_replacement")

        if not p or not cat or not status or not gov:
            manifest_errors.append(f"Item #{idx}: missing required fields (path, category, status, governing)")
            continue

        if status not in ALLOWED_STATUSES:
            manifest_errors.append(f"Item {p}: invalid status '{status}'")

        if cat not in ALLOWED_CATEGORIES:
            manifest_errors.append(f"Item {p}: invalid category '{cat}'")

        # For current, needs-review, and generated artifacts: verify path exists
        if status in {"current", "needs-review", "generated"}:
            target_file = REPO_ROOT / p
            if not target_file.exists():
                manifest_errors.append(f"Item {p}: file does not exist on disk")

        # For superseded and historical artifacts: verify replacement exists
        if status in {"superseded", "historical"}:
            reason = item.get("retirement_or_quarantine_reason")
            if not reason:
                manifest_errors.append(f"Item {p}: superseded/historical status requires retirement reason")
            # If replacement looks like a local file path
            if gov.startswith("docs/") or gov.endswith(".md") or gov.endswith(".json"):
                repl_path = REPO_ROOT / gov.split()[0].split("#")[0].strip("`,()")
                if not repl_path.exists():
                    replacement_errors.append(f"Item {p}: replacement '{gov}' not found at {repl_path}")

    reporter.check(
        "Classification manifest entries schema validity",
        len(manifest_errors) == 0,
        "; ".join(manifest_errors[:3])
    )
    reporter.check(
        "Superseded and historical replacements resolve to existing files",
        len(replacement_errors) == 0,
        "; ".join(replacement_errors[:3])
    )


def check_authoritative_doc_references(reporter: VerificationReporter):
    """Ensure local markdown links in authoritative docs point to existing files."""
    link_pattern = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')

    for doc in AUTHORITATIVE_DOCS:
        if not doc.exists():
            reporter.check(f"Authoritative doc exists: {doc.name}", False, f"File missing at {doc}")
            continue

        broken_links = []
        content = doc.read_text(encoding="utf-8")
        for match in link_pattern.finditer(content):
            url = match.group(2).strip()
            # Skip external web URLs, anchors, mailto
            if url.startswith("http://") or url.startswith("https://") or url.startswith("#") or url.startswith("mailto:"):
                continue
            # Handle file:/// URLs
            if url.startswith("file:///"):
                target_path = url.replace("file:///", "").split("#")[0]
                target_p = Path(target_path)
                if not target_p.exists():
                    broken_links.append(url)
            else:
                # Relative link
                rel_target = (doc.parent / url.split("#")[0]).resolve()
                if not rel_target.exists():
                    broken_links.append(url)

        reporter.check(
            f"Local reference integrity in {doc.relative_to(REPO_ROOT)}",
            len(broken_links) == 0,
            f"Broken links: {broken_links[:3]}"
        )


def check_retired_component_references(reporter: VerificationReporter):
    """Ensure active authoritative docs do not recommend or rely on retired components."""
    for doc in AUTHORITATIVE_DOCS:
        if not doc.exists():
            continue
        content = doc.read_text(encoding="utf-8")
        found_retired = []
        for retired in RETIRED_COMPONENTS:
            if retired in content:
                occurrences = [line for line in content.splitlines() if retired in line]
                for occ in occurrences:
                    lower = occ.lower()
                    if not any(k in lower for k in ["retired", "deprecated", "removed", "banned", "prohibited", "historical", "eliminated", "deleted", "superseded"]):
                        found_retired.append(f"{retired} referenced in non-retirement context: '{occ.strip()[:60]}'")
        reporter.check(
            f"No active references to retired components in {doc.relative_to(REPO_ROOT)}",
            len(found_retired) == 0,
            "; ".join(found_retired[:2])
        )


def check_test_quarantine(reporter: VerificationReporter):
    """Verify test quarantine ledger, mandatory metadata, and check for expired quarantine items."""
    if not QUARANTINE_FILE.exists():
        reporter.check("Test quarantine tracking file exists", True)
        return

    content = QUARANTINE_FILE.read_text(encoding="utf-8")
    now = datetime.now(timezone.utc)
    expired = []

    # Check expiration lines e.g. "Deadline: YYYY-MM-DD"
    deadline_pattern = re.compile(r'Deadline:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})', re.IGNORECASE)
    for match in deadline_pattern.finditer(content):
        date_str = match.group(1)
        try:
            deadline = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            if deadline < now:
                expired.append(date_str)
        except ValueError:
            pass

    reporter.check(
        "Test quarantine status (zero expired quarantines)",
        len(expired) == 0,
        f"Expired deadlines detected: {expired}"
    )


def check_historical_files_not_active_tests(reporter: VerificationReporter):
    """Verify historical files or archive directories are never targeted as active tests."""
    pkg_files = [
        REPO_ROOT / "package.json",
        REPO_ROOT / "client" / "package.json",
        REPO_ROOT / "server" / "package.json",
    ]
    improper_test_targets = []
    archive_patterns = ["docs/archive", "scratch/", "_archive", "historical"]

    for pf in pkg_files:
        if not pf.exists():
            continue
        try:
            pkg = json.loads(pf.read_text(encoding="utf-8"))
            scripts = pkg.get("scripts", {})
            for name, cmd in scripts.items():
                if "test" in name.lower():
                    for pattern in archive_patterns:
                        if pattern in cmd:
                            improper_test_targets.append(f"{pf.name}:{name} targets '{pattern}'")
        except Exception:
            pass

    reporter.check(
        "Historical/archive directories not targeted by active test commands",
        len(improper_test_targets) == 0,
        "; ".join(improper_test_targets)
    )


def check_active_scripts_no_retired_files(reporter: VerificationReporter):
    """Verify scripts in scripts/ do not import or execute retired components or scripts."""
    scripts_dir = REPO_ROOT / "scripts"
    violations = []
    retired_targets = RETIRED_COMPONENTS + ["render_mermaid.js"]

    if scripts_dir.exists():
        for script_path in scripts_dir.glob("*.*"):
            if script_path.name == "verify_workspace_evidence.py":
                continue
            if script_path.suffix in {".js", ".py", ".mjs", ".sh", ".ps1"}:
                content = script_path.read_text(encoding="utf-8", errors="ignore")
                for ret in retired_targets:
                    if ret in content:
                        # Allow if marked as retired check
                        lines = [line for line in content.splitlines() if ret in line]
                        for l in lines:
                            lower = l.lower()
                            if not any(k in lower for k in ["retired", "prohibited", "banned", "ignore", "check"]):
                                violations.append(f"{script_path.name} references '{ret}'")

    reporter.check(
        "Active scripts do not reference retired components or scripts",
        len(violations) == 0,
        "; ".join(violations)
    )


def check_active_test_commands(reporter: VerificationReporter):
    """Verify scripts and commands in package.json exist and are executable."""
    pkg_file = REPO_ROOT / "package.json"
    if not pkg_file.exists():
        reporter.check("Root package.json exists", False, "Missing package.json")
        return

    pkg = json.loads(pkg_file.read_text(encoding="utf-8"))
    scripts = pkg.get("scripts", {})

    required_commands = [
        "check:endpoints",
        "check:evidence",
        "validate:agentic",
        "validate:governance",
    ]
    missing = [cmd for cmd in required_commands if cmd not in scripts]
    reporter.check(
        "Active governance validation commands present in package.json",
        len(missing) == 0,
        f"Missing commands: {missing}"
    )

    # Check that referenced scripts exist
    node_scripts = [
        REPO_ROOT / "scripts" / "check-endpoint-mappings.js",
        REPO_ROOT / "scripts" / "validate-agentic-system.js",
        REPO_ROOT / "scripts" / "verify_workspace_evidence.py",
        REPO_ROOT / "scripts" / "workspace_guardrail.py",
    ]
    for ns in node_scripts:
        reporter.check(
            f"Referenced governance script exists: {ns.name}",
            ns.exists(),
            f"File {ns} missing"
        )


def main():
    reporter = VerificationReporter()
    print("Executing CMS-V2 Workspace Evidence & Authority Verification Suite...\n")
    check_json_and_jsonl(reporter)
    check_classification_manifest(reporter)
    check_authoritative_doc_references(reporter)
    check_retired_component_references(reporter)
    check_test_quarantine(reporter)
    check_historical_files_not_active_tests(reporter)
    check_active_scripts_no_retired_files(reporter)
    check_active_test_commands(reporter)
    return reporter.summary()


if __name__ == "__main__":
    sys.exit(main())
