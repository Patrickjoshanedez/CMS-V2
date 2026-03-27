"""
Production Extraction Manifest - Python Algorithm Reference

This module provides the complete production extraction framework as Python algorithms 
that agents can reference, query, and use for orchestration tasks.

Usage:
    from orchestrator_reference import ProductionManifest, ExtractionValidator
    
    manifest = ProductionManifest()
    validator = ExtractionValidator(manifest)
    
    # Check requirements
    if validator.is_production_ready():
        print("✅ All critical files validated")
    
    # Get extraction plan
    plan = manifest.get_extraction_plan()
    for category, files in plan.items():
        print(f"Extract {category}: {len(files)} files")

Author: Patrick Josh Añedez
License: MIT
Version: 1.0.0
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional, Any
from enum import Enum
from pathlib import Path


class Criticality(str, Enum):
    """File importance level"""
    CRITICAL = "CRITICAL"
    IMPORTANT = "IMPORTANT"
    OPTIONAL = "OPTIONAL"


class FileCategory(str, Enum):
    """Categories of extractable files"""
    PYTHON_MODULES = "python_modules"
    HOOKS = "hooks"
    INSTRUCTIONS = "instructions"
    AGENTS = "agents"
    SKILLS = "skills"
    DOCUMENTATION = "documentation"
    CONFIGURATION = "configuration"
    TESTS = "tests"
    CONTEXT = "context"


@dataclass
class FileSpec:
    """Specification for a single file"""
    source: Path | str
    purpose: str
    required: bool = True
    criticality: Criticality = Criticality.CRITICAL
    target: Optional[str] = None
    
    def __hash__(self):
        return hash(str(self.source))
    
    def resolve_target(self, target_root: str) -> str:
        """Resolve target path with substitutions"""
        if self.target:
            return self.target.replace("{target}", target_root)
        return f"{target_root}/{self.source}"


@dataclass
class DirectorySpec:
    """Specification for a directory category"""
    name: str
    path: str
    description: str
    criticality: Criticality = Criticality.CRITICAL
    file_count: Optional[int] = None
    files: list[str] = field(default_factory=list)
    subdirectories: int = 0
    purpose: Optional[str] = None


@dataclass
class ValidationRule:
    """Single validation rule for production readiness"""
    category: FileCategory
    requirement: str
    validation_logic: str
    is_critical: bool
    min_count: Optional[int] = None
    
    @property
    def rule_id(self) -> str:
        """Get unique rule identifier"""
        return f"{self.category.value}_{self.requirement.lower().replace(' ', '_')}"


@dataclass
class ExtractionPlan:
    """Complete extraction plan"""
    total_files: int
    total_directories: int
    estimated_size: str
    categories: dict[FileCategory, int]
    excluded_patterns: list[str]
    critical_count: int
    important_count: int
    optional_count: int


class ProductionManifest:
    """
    Complete production extraction manifest.
    
    Provides all reference data for orchestration, validation, and extraction.
    """
    
    # === METADATA ===
    VERSION = "1.0.0"
    CREATED = "2026-03-26"
    AUTHOR = "Patrick Josh Añedez"
    PROJECT = "Orchestrator Framework - Production Setup"
    
    # === PYTHON MODULES (CRITICAL) ===
    PYTHON_MODULES = {
        "orchestrator/__init__.py": FileSpec(
            source="orchestrator/__init__.py",
            purpose="Package initialization and exports",
            required=True,
        ),
        "orchestrator/dispatcher.py": FileSpec(
            source="orchestrator/dispatcher.py",
            purpose="Agent dispatcher and routing logic",
            required=True,
        ),
        "orchestrator/state/db_manager.py": FileSpec(
            source="orchestrator/state/db_manager.py",
            purpose="SQLite state management and persistence",
            required=True,
        ),
        "orchestrator/state/__init__.py": FileSpec(
            source="orchestrator/state/__init__.py",
            purpose="State module exports",
            required=True,
        ),
    }
    
    # === GIT HOOKS (CRITICAL) ===
    HOOKS = {
        ".github/hooks/pre-commit": FileSpec(
            source=".github/hooks/pre-commit",
            purpose="Code quality checks before commit",
            required=True,
        ),
        ".github/hooks/pre-push": FileSpec(
            source=".github/hooks/pre-push",
            purpose="Validation before push to repository",
            required=True,
        ),
        ".github/hooks/post-checkout": FileSpec(
            source=".github/hooks/post-checkout",
            purpose="Environment setup after checkout",
            required=False,
        ),
    }
    
    # === AGENT INSTRUCTIONS (CRITICAL) ===
    INSTRUCTIONS = {
        ".github/instructions/context-manager.instructions.md": FileSpec(
            source=".github/instructions/context-manager.instructions.md",
            purpose="Context-Manager Agent behavior specification",
            required=True,
        ),
        ".github/instructions/orchestrator.instructions.md": FileSpec(
            source=".github/instructions/orchestrator.instructions.md",
            purpose="Orchestrator Agent behavior specification",
            required=True,
        ),
        ".github/instructions/logic-debugger.instructions.md": FileSpec(
            source=".github/instructions/logic-debugger.instructions.md",
            purpose="Logic-Debugger Agent behavior specification",
            required=True,
        ),
        ".github/instructions/python-agents.instructions.md": FileSpec(
            source=".github/instructions/python-agents.instructions.md",
            purpose="Python Agent utilities and patterns",
            required=True,
        ),
        ".github/instructions/laravel-saas.instructions.md": FileSpec(
            source=".github/instructions/laravel-saas.instructions.md",
            purpose="Laravel SaaS development guidelines",
            required=True,
        ),
        ".github/instructions/frontend-specialist.instructions.md": FileSpec(
            source=".github/instructions/frontend-specialist.instructions.md",
            purpose="Frontend specialist guidelines",
            required=True,
        ),
        ".github/instructions/socrates-vibecoding.instructions.md": FileSpec(
            source=".github/instructions/socrates-vibecoding.instructions.md",
            purpose="Socratic continuation and completion protocol",
            required=True,
        ),
    }
    
    # === AGENT DEFINITIONS (CRITICAL) ===
    AGENTS = {
        ".github/agents/orchestrator.agent.md": "Orchestrator Agent",
        ".github/agents/coder.agent.md": "Coder Agent",
        ".github/agents/context-manager.agent.md": "Context-Manager Agent",
        ".github/agents/logic-debugger.agent.md": "Logic-Debugger Agent",
        ".github/agents/reviewer.agent.md": "Code Reviewer Agent",
        ".github/agents/researcher.agent.md": "Research Agent",
        ".github/agents/project-manager.agent.md": "Project Manager Agent",
    }
    
    # === SKILLS LIBRARY (CRITICAL) ===
    SKILLS_LIBRARY = {
        "count": 20,
        "description": "Reusable capability modules",
        "location": ".github/skills/",
        "examples": [
            "algorithmic-art",
            "anti-slop",
            "azure-ai",
            "azure-compliance",
            "azure-deploy",
            "azure-kubernetes",
            "docker-compose-production",
            "enterprise-realtime-cloud",
            "frontend-patterns",
            "i-audit",
            "i-frontend-design",
            "mermaid-diagrams",
            "pdf",
            "python",
            "refactor",
            "scikit-learn",
            "senior-backend",
            "tanstack-query",
            "zustand",
        ]
    }
    
    # === DOCUMENTATION (CRITICAL) ===
    DOCUMENTATION = {
        "documentation/ORCHESTRATOR_DOCUMENTATION.md": FileSpec(
            source="documentation/ORCHESTRATOR_DOCUMENTATION.md",
            purpose="Core orchestrator documentation",
            required=True,
        ),
        "documentation/ARCHITECTURE_REVIEW_AND_GAPS.md": FileSpec(
            source="documentation/ARCHITECTURE_REVIEW_AND_GAPS.md",
            purpose="Architecture review and gaps analysis",
            required=True,
        ),
        "documentation/Orchestrator_v2_Implementation_Plan.md": FileSpec(
            source="documentation/Orchestrator_v2_Implementation_Plan.md",
            purpose="Implementation planning",
            required=True,
        ),
        "documentation/Orchestrator Framework_ Gaps & Vision.md": FileSpec(
            source="documentation/Orchestrator Framework_ Gaps & Vision.md",
            purpose="Strategic vision and gaps",
            required=True,
        ),
    }
    
    # === CONFIGURATION (CRITICAL) ===
    CONFIGURATION = {
        "pyproject.toml": FileSpec(
            source="pyproject.toml",
            purpose="Python project metadata and dependencies",
            required=True,
        ),
        ".github/copilot-instructions.md": FileSpec(
            source=".github/copilot-instructions.md",
            purpose="System-wide engineering standards",
            required=True,
        ),
    }
    
    # === CONTEXT FILES (CRITICAL) ===
    CONTEXT_FILES = {
        "context/state.json": FileSpec(
            source="context/state.json",
            purpose="Current execution state",
            required=True,
        ),
        "context/saas_architecture.md": FileSpec(
            source="context/saas_architecture.md",
            purpose="Multi-tenant SaaS architecture",
            required=True,
        ),
    }
    
    # === EXTRACTION EXCLUSIONS ===
    EXCLUDE_PATTERNS = [
        ".git/**",
        ".venv/**",
        "__pycache__/**",
        "*.pyc",
        ".pytest_cache/**",
        ".egg-info/**",
        "node_modules/**",
        ".DS_Store",
        "*.egg-info/**",
    ]
    
    # === VALIDATION RULES ===
    VALIDATION_RULES = [
        ValidationRule(
            category=FileCategory.PYTHON_MODULES,
            requirement="All orchestrator/*.py files present",
            validation_logic="file_count >= 4",
            is_critical=True,
            min_count=4,
        ),
        ValidationRule(
            category=FileCategory.INSTRUCTIONS,
            requirement="All 7 instruction files extracted",
            validation_logic="file_count == 7",
            is_critical=True,
            min_count=7,
        ),
        ValidationRule(
            category=FileCategory.AGENTS,
            requirement="All 7 agent definitions extracted",
            validation_logic="file_count == 7",
            is_critical=True,
            min_count=7,
        ),
        ValidationRule(
            category=FileCategory.SKILLS,
            requirement="Skills directory with 20+ subdirectories",
            validation_logic="subdirectory_count >= 20",
            is_critical=True,
            min_count=20,
        ),
        ValidationRule(
            category=FileCategory.DOCUMENTATION,
            requirement="All documentation files present",
            validation_logic="file_count >= 4",
            is_critical=True,
            min_count=4,
        ),
        ValidationRule(
            category=FileCategory.CONTEXT,
            requirement="Context files and architecture docs",
            validation_logic="directory_exists and file_count >= 2",
            is_critical=True,
            min_count=2,
        ),
        ValidationRule(
            category=FileCategory.CONFIGURATION,
            requirement="System configuration files",
            validation_logic="file_count >= 2",
            is_critical=True,
            min_count=2,
        ),
        ValidationRule(
            category=FileCategory.HOOKS,
            requirement="Git hooks configured",
            validation_logic="directory_exists",
            is_critical=False,
            min_count=1,
        ),
    ]
    
    def get_all_critical_files(self) -> dict[str, FileSpec]:
        """Get all critical files that must be extracted"""
        critical = {}
        critical.update(self.PYTHON_MODULES)
        critical.update(self.HOOKS)
        critical.update(self.INSTRUCTIONS)
        critical.update(self.CONFIGURATION)
        critical.update(self.CONTEXT_FILES)
        return critical
    
    def get_extraction_plan(self) -> ExtractionPlan:
        """Generate complete extraction plan"""
        all_files = self.get_all_critical_files()
        
        categories = {
            FileCategory.PYTHON_MODULES: len(self.PYTHON_MODULES),
            FileCategory.HOOKS: len(self.HOOKS),
            FileCategory.INSTRUCTIONS: len(self.INSTRUCTIONS),
            FileCategory.AGENTS: len(self.AGENTS),
            FileCategory.SKILLS: self.SKILLS_LIBRARY["count"],
            FileCategory.DOCUMENTATION: len(self.DOCUMENTATION),
            FileCategory.CONFIGURATION: len(self.CONFIGURATION),
            FileCategory.CONTEXT: len(self.CONTEXT_FILES),
        }
        
        return ExtractionPlan(
            total_files=sum(categories.values()),
            total_directories=10,
            estimated_size="~50MB",
            categories=categories,
            excluded_patterns=self.EXCLUDE_PATTERNS,
            critical_count=sum(1 for rule in self.VALIDATION_RULES if rule.is_critical),
            important_count=3,
            optional_count=1,
        )
    
    def get_file_by_category(self, category: FileCategory) -> dict[str, Any]:
        """Get all files in a specific category"""
        if category == FileCategory.SKILLS:
            return {
                f".github/skills/{name}": FileSpec(
                    source=f".github/skills/{name}",
                    purpose=f"Skill module: {name}",
                    required=False,
                    criticality=Criticality.IMPORTANT,
                )
                for name in self.SKILLS_LIBRARY.get("examples", [])
            }

        category_map = {
            FileCategory.PYTHON_MODULES: self.PYTHON_MODULES,
            FileCategory.HOOKS: self.HOOKS,
            FileCategory.INSTRUCTIONS: self.INSTRUCTIONS,
            FileCategory.AGENTS: self.AGENTS,
            FileCategory.DOCUMENTATION: self.DOCUMENTATION,
            FileCategory.CONFIGURATION: self.CONFIGURATION,
            FileCategory.CONTEXT: self.CONTEXT_FILES,
        }
        return category_map.get(category, {})
    
    def get_validation_rules_for_category(self, category: FileCategory) -> list[ValidationRule]:
        """Get validation rules for specific category"""
        return [rule for rule in self.VALIDATION_RULES if rule.category == category]
    
    def get_critical_rules(self) -> list[ValidationRule]:
        """Get only critical validation rules"""
        return [rule for rule in self.VALIDATION_RULES if rule.is_critical]


class ExtractionValidator:
    """
    Validates extraction completeness against production manifest.
    
    Agents use this to verify:
    - All critical files present
    - Counts match requirements
    - Directory structure correct
    - Validation rules pass
    """
    
    def __init__(self, manifest: ProductionManifest):
        self.manifest = manifest
        self.validation_results: dict[str, bool] = {}
    
    def validate_file_category(
        self,
        category: FileCategory,
        target_path: Path,
    ) -> tuple[bool, dict[str, Any]]:
        """
        Validate that all required files in a category exist.
        
        Returns:
            (is_valid, details)
        """
        if category == FileCategory.SKILLS:
            skills_dir = Path(target_path) / ".github" / "skills"
            subdirectories = [d for d in skills_dir.iterdir() if d.is_dir()] if skills_dir.exists() else []
            minimum = int(self.manifest.SKILLS_LIBRARY.get("count", 20))
            is_valid = len(subdirectories) >= minimum
            return is_valid, {
                "category": category.value,
                "expected_count": minimum,
                "actual_count": len(subdirectories),
                "missing_files": [] if is_valid else ["insufficient skill subdirectories"],
                "valid": is_valid,
            }

        files = self.manifest.get_file_by_category(category)
        target_path = Path(target_path)
        
        results = {
            "category": category.value,
            "expected_count": len(files),
            "actual_count": 0,
            "missing_files": [],
            "valid": True,
        }
        
        for file_path, spec in files.items():
            if isinstance(spec, FileSpec):
                check_path = target_path / spec.source
            else:
                check_path = target_path / file_path
            
            if check_path.exists():
                results["actual_count"] += 1
            else:
                results["missing_files"].append(str(file_path))
                results["valid"] = False
        
        return results["valid"], results
    
    def validate_critical_files(self, target_path: Path) -> tuple[bool, dict]:
        """
        Validate all critical files for production readiness.
        
        This is the main validation entrypoint.
        """
        target_path = Path(target_path)
        all_valid = True
        all_results = {}
        
        for rule in self.manifest.get_critical_rules():
            category = rule.category
            is_valid, details = self.validate_file_category(category, target_path)
            
            all_results[category.value] = {
                "requirement": rule.requirement,
                "valid": is_valid,
                "details": details,
            }
            
            if not is_valid:
                all_valid = False
        
        return all_valid, all_results
    
    def is_production_ready(
        self,
        target_path: Path,
        allow_warnings: bool = False,
    ) -> bool:
        """Check if setup is production-ready"""
        is_valid, _ = self.validate_critical_files(target_path)
        return is_valid
    
    def generate_report(self, target_path: Path) -> dict:
        """Generate comprehensive validation report"""
        is_valid, results = self.validate_critical_files(target_path)
        
        return {
            "overall_status": "✅ PRODUCTION READY" if is_valid else "❌ INCOMPLETE",
            "validation_timestamp": "2026-03-26",
            "target_path": str(target_path),
            "categories": results,
            "critical_failures": [
                cat for cat, result in results.items()
                if not result["valid"]
            ],
        }


class ExtractionPlanner:
    """
    Plans extraction operations with dependency tracking.
    
    Agents use this to:
    - Generate extraction order
    - Track dependencies
    - Estimate time/resources
    - Handle rollbacks
    """
    
    def __init__(self, manifest: ProductionManifest):
        self.manifest = manifest
    
    def get_extraction_order(self) -> list[FileCategory]:
        """
        Get the optimal order to extract files.
        
        Order:
        1. Configuration (needed by others)
        2. Python modules
        3. Context files
        4. Instructions
        5. Agents
        6. Documentation
        7. Skills
        8. Hooks
        9. Tests
        """
        return [
            FileCategory.CONFIGURATION,
            FileCategory.PYTHON_MODULES,
            FileCategory.CONTEXT,
            FileCategory.INSTRUCTIONS,
            FileCategory.AGENTS,
            FileCategory.DOCUMENTATION,
            FileCategory.SKILLS,
            FileCategory.HOOKS,
            FileCategory.TESTS,
        ]
    
    def get_extraction_step(
        self,
        step_num: int,
        category: FileCategory,
    ) -> dict[str, Any]:
        """Get detailed information for extraction step"""
        files = self.manifest.get_file_by_category(category)
        
        if isinstance(files, dict) and len(files) > 0:
            first_item = next(iter(files.values()))
            if isinstance(first_item, FileSpec):
                file_count = len(files)
            else:
                file_count = files.get("count", len(files))
        else:
            file_count = 0
        
        return {
            "step": step_num,
            "category": category.value,
            "file_count": file_count,
            "description": f"Extract {category.value}",
            "rules": [
                rule for rule in self.manifest.get_critical_rules()
                if rule.category == category
            ],
        }
    
    def get_full_plan(self) -> list[dict]:
        """Get complete extraction plan"""
        order = self.get_extraction_order()
        return [
            self.get_extraction_step(i, cat)
            for i, cat in enumerate(order, 1)
        ]


class OrchestrationReference:
    """
    Master reference providing all production orchestration data.
    
    This is the primary entry point for agents to access:
    - File specifications
    - Validation rules
    - Extraction plans
    - Production checklist
    """
    
    def __init__(self):
        self.manifest = ProductionManifest()
        self.validator = ExtractionValidator(self.manifest)
        self.planner = ExtractionPlanner(self.manifest)
    
    def get_agent_instructions(self, agent_name: str) -> Optional[FileSpec]:
        """Get instruction file for specific agent"""
        agent_file = f".github/instructions/{agent_name}.instructions.md"
        for file_path, spec in self.manifest.INSTRUCTIONS.items():
            if agent_name.lower() in file_path.lower():
                return spec
        return None
    
    def get_skill(self, skill_name: str) -> Optional[str]:
        """Get reference to specific skill"""
        for skill in self.manifest.SKILLS_LIBRARY["examples"]:
            if skill_name.lower() in skill.lower():
                return skill
        return None
    
    def get_all_agents(self) -> dict[str, str]:
        """Get all agent definitions"""
        return self.manifest.AGENTS
    
    def get_all_instructions(self) -> dict[str, FileSpec]:
        """Get all instruction files"""
        return self.manifest.INSTRUCTIONS
    
    def get_summary(self) -> dict[str, Any]:
        """Get summary of production framework"""
        plan = self.manifest.get_extraction_plan()
        
        return {
            "project": self.manifest.PROJECT,
            "version": self.manifest.VERSION,
            "author": self.manifest.AUTHOR,
            "total_files": plan.total_files,
            "agents": len(self.manifest.AGENTS),
            "skills": self.manifest.SKILLS_LIBRARY["count"],
            "instructions": len(self.manifest.INSTRUCTIONS),
            "documentation_files": len(self.manifest.DOCUMENTATION),
            "validation_rules": len(self.manifest.VALIDATION_RULES),
            "critical_rules": len(self.manifest.get_critical_rules()),
        }


# === CONVENIENCE FUNCTIONS FOR AGENTS ===

def get_reference() -> OrchestrationReference:
    """Get the master orchestration reference"""
    return OrchestrationReference()


def validate_setup(target_path: str | Path) -> dict:
    """
    Quick validation function for agents.
    
    Usage:
        result = validate_setup("./orchestrator-production")
        if result["is_production_ready"]:
            print("✅ Setup complete")
    """
    ref = get_reference()
    target = Path(target_path)
    is_ready = ref.validator.is_production_ready(target)
    report = ref.validator.generate_report(target)
    
    return {
        "is_production_ready": is_ready,
        "report": report,
    }


def get_extraction_plan() -> dict:
    """Get complete extraction plan for reference"""
    ref = get_reference()
    return {
        "plan": ref.planner.get_full_plan(),
        "summary": ref.manifest.get_extraction_plan(),
    }


def get_production_summary() -> dict:
    """Get summary of the production framework"""
    ref = get_reference()
    return ref.get_summary()


if __name__ == "__main__":
    # Example usage
    ref = get_reference()
    
    print("🚀 ORCHESTRATOR REFERENCE - EXAMPLES")
    print("=" * 60)
    
    print("\n📊 Production Summary:")
    summary = ref.get_summary()
    for key, value in summary.items():
        print(f"  {key}: {value}")
    
    print("\n📋 Extraction Plan:")
    plan_data = get_extraction_plan()
    for step in plan_data["plan"][:3]:  # Show first 3 steps
        print(f"  Step {step['step']}: {step['category']} ({step['file_count']} files)")
    
    print("\n🤖 Agents Available:")
    agents = ref.get_all_agents()
    for i, (path, desc) in enumerate(list(agents.items())[:3]):
        print(f"  {i+1}. {desc}")
    
    print("\n✅ Validation Rules:")
    rules = ref.manifest.get_critical_rules()
    for rule in rules[:3]:
        print(f"  - {rule.requirement}")
    
    print("\n" + "=" * 60)
