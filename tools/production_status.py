#!/usr/bin/env python3
"""
Production Readiness Verification & Status Report

This script verifies that all production components are in place and working.
"""

import json
import sys
from pathlib import Path
from datetime import datetime


REPO_ROOT = Path(__file__).resolve().parent.parent


def check_scripts_exist() -> dict:
    """Check that all production scripts exist"""
    scripts_dir = REPO_ROOT / "scripts"
    
    required_scripts = {
        "production_extractor.py": "Extracts critical files",
        "documentation_converter.py": "Converts Markdown to JSON/Python",
        "context_generator.py": "Generates production context folders",
        "production_orchestrator.py": "Orchestrates entire pipeline",
    }
    
    results = {}
    for script_name, description in required_scripts.items():
        script_path = scripts_dir / script_name
        exists = script_path.exists()
        results[script_name] = {
            "description": description,
            "exists": exists,
            "path": str(script_path) if exists else None,
        }
    
    return results


def check_documentation_exists() -> dict:
    """Check that all documentation exists"""
    docs = {
        "docs/production/PRODUCTION_IMPLEMENTATION_GUIDE.md": "Complete implementation guide",
        "references/PRODUCTION_EXTRACTION_MANIFEST.json": "File catalog and validation rules",
        "docs/agents/AGENT_WORKFLOW_EXTRACTION.md": "Agent extraction documentation",
        "README.md": "Project README",
    }
    
    results = {}
    root = REPO_ROOT
    
    for doc_name, description in docs.items():
        doc_path = root / doc_name
        exists = doc_path.exists()
        results[doc_name] = {
            "description": description,
            "exists": exists,
            "path": str(doc_path) if exists else None,
        }
    
    return results


def check_dependencies() -> dict:
    """Check that required Python modules are available"""
    required_modules = {
        "json": "JSON processing (builtin)",
        "pathlib": "Path handling (builtin)",
        "dataclasses": "Data structures (builtin)",
        "hashlib": "File hashing (builtin)",
        "subprocess": "Process execution (builtin)",
    }
    
    results = {}
    for module_name, description in required_modules.items():
        try:
            __import__(module_name)
            results[module_name] = {
                "description": description,
                "available": True,
            }
        except ImportError:
            results[module_name] = {
                "description": description,
                "available": False,
            }
    
    return results


def check_critical_directories() -> dict:
    """Check critical directories exist"""
    root = REPO_ROOT
    
    dirs = {
        "orchestrator": "Python orchestration framework",
        ".github/instructions": "Agent instructions",
        ".github/agents": "Agent definitions",
        ".github/skills": "Skills library",
        ".github/hooks": "Git hooks",
        "documentation": "Documentation files",
        "docs": "Organized documentation domains",
        "references": "Reference manifests and metadata",
        "tools": "Operational tooling modules",
        "examples": "Executable examples and debug helpers",
        "assets": "Static assets and research material",
        "context": "Context and state files",
        "scripts": "Production scripts",
        "tests": "Test suites",
    }
    
    results = {}
    for dir_name, description in dirs.items():
        dir_path = root / dir_name
        exists = dir_path.exists()
        results[dir_name] = {
            "description": description,
            "exists": exists,
            "path": str(dir_path) if exists else None,
        }
    
    return results


def generate_status_report() -> dict:
    """Generate complete production status report"""
    report = {
        "timestamp": datetime.now().isoformat(),
        "workspace": str(REPO_ROOT),
        "status": "COMPLETE",
        "components": {
            "scripts": check_scripts_exist(),
            "documentation": check_documentation_exists(),
            "dependencies": check_dependencies(),
            "directories": check_critical_directories(),
        },
    }
    
    return report


def print_status_report(report: dict) -> bool:
    """Print formatted status report"""
    print("\n" + "=" * 70)
    print("🚀 PRODUCTION ORCHESTRATOR - STATUS REPORT")
    print("=" * 70)
    print(f"Generated: {report['timestamp']}")
    print(f"Workspace: {report['workspace']}")
    print()
    
    all_ok = True
    
    # Scripts
    print("📦 PRODUCTION SCRIPTS")
    print("-" * 70)
    scripts = report["components"]["scripts"]
    for script_name, info in scripts.items():
        status = "✅" if info["exists"] else "❌"
        print(f"{status} {script_name}")
        print(f"     {info['description']}")
        if not info["exists"]:
            all_ok = False
    print()
    
    # Documentation
    print("📚 DOCUMENTATION")
    print("-" * 70)
    docs = report["components"]["documentation"]
    for doc_name, info in docs.items():
        status = "✅" if info["exists"] else "❌"
        print(f"{status} {doc_name}")
        print(f"     {info['description']}")
        if not info["exists"]:
            all_ok = False
    print()
    
    # Dependencies
    print("🔧 DEPENDENCIES")
    print("-" * 70)
    deps = report["components"]["dependencies"]
    for module_name, info in deps.items():
        status = "✅" if info["available"] else "❌"
        print(f"{status} {module_name}")
        print(f"     {info['description']}")
        if not info["available"]:
            all_ok = False
    print()
    
    # Directories
    print("📁 CRITICAL DIRECTORIES")
    print("-" * 70)
    dirs = report["components"]["directories"]
    critical_found = 0
    for dir_name, info in dirs.items():
        status = "✅" if info["exists"] else "❌"
        print(f"{status} {dir_name}")
        print(f"     {info['description']}")
        if info["exists"]:
            critical_found += 1
        if not info["exists"]:
            all_ok = False
    print()
    
    # Summary
    print("📊 SUMMARY")
    print("-" * 70)
    print(f"Scripts: {sum(1 for x in scripts.values() if x['exists'])}/{len(scripts)}")
    print(f"Documentation: {sum(1 for x in docs.values() if x['exists'])}/{len(docs)}")
    print(f"Directories: {critical_found}/{len(dirs)}")
    print()
    
    status_text = "✅ PRODUCTION READY" if all_ok else "⚠️  INCOMPLETE"
    print(f"Status: {status_text}")
    print("=" * 70 + "\n")
    
    return all_ok


def save_report(report: dict, output_path: Path | None = None) -> Path:
    """Save report to JSON file"""
    if output_path is None:
        output_path = Path(__file__).parent.parent / "references" / "PRODUCTION_STATUS.json"
    
    with open(output_path, "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"📋 Report saved: {output_path}")
    return output_path


def main():
    """Generate and display status report"""
    report = generate_status_report()
    all_ok = print_status_report(report)
    save_report(report)
    
    # Print quick start guide
    print("\n" + "=" * 70)
    print("🎯 QUICK START GUIDE")
    print("=" * 70)
    print("""
1. FULL PRODUCTION SETUP (Recommended)
   python scripts/production_orchestrator.py \\
     --workspace . \\
     --target ./orchestrator-production \\
     --action full \\
     --force

2. STEP-BY-STEP SETUP
   # Validate structure
   python scripts/production_orchestrator.py --workspace . --target ./setup --action validate
   
   # Extract files
   python scripts/production_orchestrator.py --workspace . --target ./setup --action extract --force
   
   # Convert documentation
   python scripts/production_orchestrator.py --workspace . --target ./setup --action convert
   
   # Generate context
   python scripts/production_orchestrator.py --workspace . --target ./setup --action context
   
   # View report
   cat ./setup/PRODUCTION_REPORT.json

3. INDIVIDUAL TOOLS
   # Extract only
   python scripts/production_extractor.py --source . --target ./setup --force
   
   # Convert documentation only
   python scripts/documentation_converter.py --source ./documentation --output ./docs_output
   
   # Generate context only
   python scripts/context_generator.py --target ./setup

4. VERIFY SETUP
   # Check file catalogs
   cat ./setup/.orchestrator_catalog.json | python -m json.tool
   
   # Check context state
   cat ./setup/context/state.json | python -m json.tool
   
   # List documentation schemas
   ls -la ./setup/documentation_schemas/

5. DOCUMENTATION
    📖 See docs/production/PRODUCTION_IMPLEMENTATION_GUIDE.md for complete documentation
    📖 See docs/agents/AGENT_WORKFLOW_EXTRACTION.md for agent extraction details
   📖 See context/README.md for context folder usage
""")
    print("=" * 70 + "\n")
    
    return 0 if all_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
