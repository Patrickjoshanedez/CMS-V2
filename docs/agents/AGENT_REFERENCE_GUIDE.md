# 🤖 AGENT REFERENCE GUIDE - orchestrator_reference.py

**Complete Python Algorithm for Agent-Based Orchestration**

**For:** All AI Agents (Orchestrator, Coder, Reviewer, Researcher, etc.)  
**Version:** 1.0.0  
**Author:** Patrick Josh Añedez

---

## 📚 Overview

The `orchestrator_reference.py` module provides a complete, machine-readable reference of the production orchestration framework. Agents import this to:

- ✅ Access production requirements and specifications
- ✅ Validate extraction completeness
- ✅ Query file locations and purposes
- ✅ Get extraction plans and dependencies
- ✅ Reference all agents, instructions, and skills
- ✅ Understand validation rules

---

## 🚀 Quick Start for Agents

### Import the Reference
```python
from orchestrator_reference import (
    OrchestrationReference,
    get_reference,
    validate_setup,
    get_extraction_plan,
    get_production_summary,
)

# Get master reference
ref = get_reference()  # Single import, all data available
```

### Common Agent Tasks

**Task 1: Validate a Setup**
```python
result = validate_setup("./orchestrator-production")
if result["is_production_ready"]:
    print("✅ All critical files present")
else:
    print("❌ Missing files:", result["report"]["critical_failures"])
```

**Task 2: Get Extraction Plan**
```python
plan_data = get_extraction_plan()
for step in plan_data["plan"]:
    print(f"Step {step['step']}: Extract {step['category']}")
    print(f"  Files to extract: {step['file_count']}")
    print(f"  Requirements: {step['description']}")
```

**Task 3: List All Agents**
```python
ref = get_reference()
agents = ref.get_all_agents()

for agent_path, agent_name in agents.items():
    print(f"🤖 {agent_name}")
    # Can query this agent's instructions
    instr = ref.get_agent_instructions(agent_name.lower().split()[0])
```

**Task 4: Get Summary**
```python
ref = get_reference()
summary = ref.get_summary()

print(f"Framework has {summary['agents']} agents")
print(f"Framework has {summary['skills']} skills")
print(f"Total files to extract: {summary['total_files']}")
```

---

## 📖 Core Classes & Methods

### 1. `OrchestrationReference` (Main Entry Point)

**Purpose:** Master reference providing all production data

**Key Methods:**
```python
ref = OrchestrationReference()

# Get agents
agents = ref.get_all_agents()              # Returns: dict[agent_path, agent_name]

# Get instructions
instructions = ref.get_all_instructions()  # Returns: dict[file_path, FileSpec]

# Get specific instruction
instr = ref.get_agent_instructions("orchestrator")  # Returns: FileSpec or None

# Get specific skill
skill = ref.get_skill("azure-deploy")      # Returns: skill_name or None

# Get summary
summary = ref.get_summary()                 # Returns: dict with all metrics
```

### 2. `ProductionManifest` (Data Storage)

**Purpose:** All production requirements and specifications

**Key Attributes:**
```python
manifest = ProductionManifest()

# Static collections
manifest.PYTHON_MODULES      # Required Python files
manifest.HOOKS               # Git hooks
manifest.INSTRUCTIONS        # Agent instruction files (7)
manifest.AGENTS              # Agent definitions (7)
manifest.DOCUMENTATION       # Documentation files
manifest.CONFIGURATION       # Config files (pyproject.toml, etc.)
manifest.CONTEXT_FILES       # State and architecture files
manifest.VALIDATION_RULES    # All validation rules
manifest.EXCLUDE_PATTERNS    # Files to skip during extraction

# Key methods
files = manifest.get_all_critical_files()            # All required files
plan = manifest.get_extraction_plan()                # Extraction summary
category_files = manifest.get_file_by_category(...)  # Files for category
rules = manifest.get_validation_rules_for_category(...)  # Rules for category
critical = manifest.get_critical_rules()             # All critical rules
```

### 3. `ExtractionValidator` (Validation Engine)

**Purpose:** Validate that extraction is complete and production-ready

**Key Methods:**
```python
validator = ExtractionValidator(manifest)

# Validate single category
is_valid, details = validator.validate_file_category(
    FileCategory.PYTHON_MODULES,
    Path("./target")
)
# Returns: (bool, dict with counts and missing files)

# Validate all critical files
is_valid, results = validator.validate_critical_files(Path("./target"))
# Returns: (bool, dict with results for each category)

# Quick check
is_ready = validator.is_production_ready(Path("./target"))
# Returns: bool

# Generate detailed report
report = validator.generate_report(Path("./target"))
# Returns: dict with status, timestamp, failures
```

### 4. `ExtractionPlanner` (Planning & Ordering)

**Purpose:** Plan extraction with proper ordering and dependencies

**Key Methods:**
```python
planner = ExtractionPlanner(manifest)

# Get optimal extraction order
order = planner.get_extraction_order()
# Returns: [FileCategory.CONFIGURATION, FileCategory.PYTHON_MODULES, ...]

# Get details for single step
step = planner.get_extraction_step(1, FileCategory.CONFIGURATION)
# Returns: dict with step, category, file_count, rules

# Get full plan
plan = planner.get_full_plan()
# Returns: list[dict] with all steps
```

---

## 🔍 Data Structures Reference

### FileSpec (Individual File)
```python
@dataclass
class FileSpec:
    source: Path | str              # Source file path
    purpose: str                     # What this file does
    required: bool = True            # Must be extracted?
    criticality: Criticality         # CRITICAL, IMPORTANT, OPTIONAL
    target: Optional[str] = None     # Target path with {target} placeholder
    
    # Method
    resolve_target(target_root: str) -> str  # Resolve target with substitutions
```

### DirectorySpec (Directory Category)
```python
@dataclass
class DirectorySpec:
    name: str                        # Category name
    path: str                        # Directory path
    description: str                 # What it contains
    criticality: Criticality         # CRITICAL, IMPORTANT, OPTIONAL
    file_count: Optional[int]        # Expected file count
    files: list[str]                 # File list
    subdirectories: int              # Subdirectory count
    purpose: Optional[str]           # Purpose description
```

### ValidationRule
```python
@dataclass
class ValidationRule:
    category: FileCategory           # What to validate
    requirement: str                 # What's required
    validation_logic: str            # How to validate
    is_critical: bool                # Critical or optional?
    min_count: Optional[int]         # Minimum expected count
    
    # Property
    rule_id -> str                   # Unique ID for this rule
```

### ExtractionPlan (Summary)
```python
@dataclass
class ExtractionPlan:
    total_files: int                 # Total files to extract
    total_directories: int           # Total directories
    estimated_size: str              # Estimated size
    categories: dict[FileCategory, int]  # Files per category
    excluded_patterns: list[str]     # Patterns to exclude
    critical_count: int              # Count of critical items
    important_count: int             # Count of important items
    optional_count: int              # Count of optional items
```

---

## 🎯 Common Agent Workflows

### Workflow 1: Orchestrator validating a setup
```python
# Agent: Orchestrator
from orchestrator_reference import get_reference

def validate_production_setup(target_path):
    """Check if production setup is valid"""
    ref = get_reference()
    
    # Run validation
    is_ready = ref.validator.is_production_ready(target_path)
    
    if is_ready:
        print("✅ Production ready")
        return True
    else:
        # Get detailed report
        report = ref.validator.generate_report(target_path)
        failures = report["critical_failures"]
        print(f"❌ Missing: {failures}")
        return False
```

### Workflow 2: Coder extracting files
```python
# Agent: Coder
from orchestrator_reference import get_extraction_plan

def generate_extraction_steps():
    """Generate extraction plan"""
    plan_data = get_extraction_plan()
    
    for step in plan_data["plan"]:
        print(f"\nStep {step['step']}: {step['category']}")
        print(f"  Extract {step['file_count']} files")
        
        # Could execute extraction for this step
        extract_category(step['category'])
```

### Workflow 3: Researcher querying agent info
```python
# Agent: Researcher
from orchestrator_reference import get_reference

def get_agent_documentation():
    """Get all agent documentation"""
    ref = get_reference()
    
    agents = ref.get_all_agents()
    instructions = ref.get_all_instructions()
    
    for agent_path, agent_name in agents.items():
        print(f"\n🤖 {agent_name}")
        
        # Find corresponding instruction
        agent_key = agent_name.lower().split()[0]
        for instr_path, spec in instructions.items():
            if agent_key in instr_path.lower():
                print(f"  Instructions: {spec.purpose}")
                break
```

### Workflow 4: Reviewer checking validation rules
```python
# Agent: Reviewer
from orchestrator_reference import get_reference, FileCategory

def review_validation_status():
    """Review all validation requirements"""
    ref = get_reference()
    
    critical_rules = ref.manifest.get_critical_rules()
    
    print("Critical Validation Rules:")
    for rule in critical_rules:
        print(f"\n  {rule.category.value}")
        print(f"    Requirement: {rule.requirement}")
        print(f"    Logic: {rule.validation_logic}")
        
        if rule.min_count:
            print(f"    Minimum: {rule.min_count}")
```

### Workflow 5: Context-Manager tracking state
```python
# Agent: Context-Manager
from orchestrator_reference import get_production_summary

def log_framework_state():
    """Log framework state for tracking"""
    summary = get_production_summary()
    
    state = {
        "framework_version": summary["version"],
        "total_agents": summary["agents"],
        "total_skills": summary["skills"],
        "total_files": summary["total_files"],
        "validation_rules": summary["validation_rules"],
    }
    
    # Save or log this state
    return state
```

---

## 🔍 Query Patterns for Agents

### Find Files by Category
```python
ref = get_reference()
from orchestrator_reference import FileCategory

# Get all Python modules
python_files = ref.manifest.get_file_by_category(FileCategory.PYTHON_MODULES)

# Get all instructions
instructions = ref.manifest.get_file_by_category(FileCategory.INSTRUCTIONS)

# Get all agents
agents = ref.manifest.get_file_by_category(FileCategory.AGENTS)
```

### Find Files by Criticality
```python
ref = get_reference()

# Get only critical files
critical = ref.manifest.get_all_critical_files()
for path, spec in critical.items():
    if spec.criticality == "CRITICAL":
        print(f"⚠️ CRITICAL: {path}")
```

### Find Validation Rules
```python
ref = get_reference()

# Get critical rules
critical_rules = ref.manifest.get_critical_rules()

# Get rules for a category
python_rules = ref.manifest.get_validation_rules_for_category(
    FileCategory.PYTHON_MODULES
)

# Search for specific rule
for rule in critical_rules:
    if "agent" in rule.requirement.lower():
        print(f"Found rule: {rule.requirement}")
```

### Get Extraction Dependencies
```python
ref = get_reference()

# Extract in proper order
order = ref.planner.get_extraction_order()
# Order: CONFIG → PYTHON → CONTEXT → INSTRUCTIONS → AGENTS → ...

for i, category in enumerate(order, 1):
    step = ref.planner.get_extraction_step(i, category)
    print(f"Step {step['step']}: {step['category']} ({step['file_count']} files)")
```

---

## 📊 Reference Data

### All File Categories
```python
FileCategory.PYTHON_MODULES    # orchestrator/*.py
FileCategory.HOOKS             # .github/hooks/*
FileCategory.INSTRUCTIONS      # .github/instructions/*.md (7 files)
FileCategory.AGENTS            # .github/agents/*.md (7 files)
FileCategory.SKILLS            # .github/skills/* (20+ dirs)
FileCategory.DOCUMENTATION     # documentation/*.md
FileCategory.CONFIGURATION     # pyproject.toml, etc.
FileCategory.TESTS             # tests/*.py
FileCategory.CONTEXT           # context/*.json
```

### Criticality Levels
```python
Criticality.CRITICAL      # Must exist for production
Criticality.IMPORTANT     # Should exist
Criticality.OPTIONAL      # Nice to have
```

### All Agents
1. orchestrator.agent.md - Main orchestrator
2. coder.agent.md - Code generation
3. context-manager.agent.md - State management
4. logic-debugger.agent.md - Debugging
5. reviewer.agent.md - Code review
6. researcher.agent.md - Research
7. project-manager.agent.md - Project management

### All Instructions (7)
1. context-manager.instructions.md
2. orchestrator.instructions.md
3. logic-debugger.instructions.md
4. python-agents.instructions.md
5. laravel-saas.instructions.md
6. frontend-specialist.instructions.md
7. socrates-vibecoding.instructions.md

### Validation Rules (8 Total, 7 Critical)
- Python modules: >= 4 files
- Instructions: == 7 files
- Agents: == 7 files
- Skills: >= 20 subdirectories
- Documentation: >= 4 files
- Context: >= 2 files
- Configuration: >= 2 files
- Hooks: directory exists

---

## 🛠️ Convenience Functions

### Quick Validation
```python
from orchestrator_reference import validate_setup

result = validate_setup("./orchestrator-production")
# Returns: {"is_production_ready": bool, "report": dict}
```

### Quick Extraction Plan
```python
from orchestrator_reference import get_extraction_plan

plan = get_extraction_plan()
# Returns: {"plan": list[step], "summary": ExtractionPlan}
```

### Quick Summary
```python
from orchestrator_reference import get_production_summary

summary = get_production_summary()
# Returns: dict with project, version, total_files, agents, skills, etc.
```

---

## 💡 Usage Tips for Agents

### 1. Use Single Import
```python
# DO THIS
from orchestrator_reference import get_reference
ref = get_reference()
# Use ref.manifest, ref.validator, ref.planner

# AVOID THIS
from orchestrator_reference import ProductionManifest, ExtractionValidator, ExtractionPlanner
```

### 2. Cache the Reference
```python
# In agent initialization
class MyAgent:
    def __init__(self):
        self.ref = get_reference()  # Store once
    
    def my_method(self):
        # Reuse throughout
        self.ref.get_all_agents()
```

### 3. Handle Missing Results
```python
# Always check for None
instr = ref.get_agent_instructions("unknown")
if instr is not None:
    print(f"Found: {instr.purpose}")
else:
    print("Agent not found")
```

### 4. Use FileCategory Enum
```python
# DO THIS
from orchestrator_reference import FileCategory
files = ref.manifest.get_file_by_category(FileCategory.PYTHON_MODULES)

# AVOID THIS (strings aren't type-checked)
files = ref.manifest.get_file_by_category("python_modules")
```

---

## 📈 Performance Notes

- **Reference creation**: ~milliseconds (class instantiation)
- **File lookups**: O(1) (dictionary-based)
- **Category queries**: O(n) where n = category size
- **Full validation**: O(n) where n = files to check (filesystem I/O bound)
- **Memory**: ~10KB for reference (static data only)

---

## 🔗 Integration Examples

### With Production Scripts
```python
# In production_orchestrator.py
from orchestrator_reference import get_reference

ref = get_reference()
plan = ref.planner.get_full_plan()

for step in plan:
    # Execute extraction step
    category = step['category']
    # ...
    
    # Validate step
    is_valid, details = ref.validator.validate_file_category(category, target)
```

### With Agent Dispatch
```python
# In agent dispatcher
from orchestrator_reference import get_reference

ref = get_reference()
agents = ref.get_all_agents()

for agent_path, agent_name in agents.items():
    agent = dispatch_agent(agent_name)
    
    instructions = ref.get_agent_instructions(agent_name.lower().split()[0])
    if instructions:
        # Pass instructions to agent
        agent.set_instructions(instructions.purpose)
```

### With Validation Pipeline
```python
# In validation system
from orchestrator_reference import validate_setup

for target in setup_locations:
    result = validate_setup(target)
    if not result["is_production_ready"]:
        log_failures(result["report"]["critical_failures"])
```

---

## ❓ FAQ

**Q: How do I get the list of required files?**  
A: Use `ref.manifest.get_all_critical_files()` or `ref.manifest.PYTHON_MODULES`, etc.

**Q: How do I validate a setup?**  
A: Use `validate_setup(path)` or `ref.validator.is_production_ready(path)`

**Q: How do I get agent instructions?**  
A: Use `ref.get_agent_instructions("agent_name")`

**Q: Where are the skills?**  
A: Use `ref.manifest.SKILLS_LIBRARY` or `ref.get_skill("skill_name")`

**Q: How do I know the extraction order?**  
A: Use `ref.planner.get_extraction_order()`

**Q: Can I add custom validation rules?**  
A: Subclass `ProductionManifest` and extend `VALIDATION_RULES`

---

## 🎓 Example Script

```python
#!/usr/bin/env python3
"""Example: Agent using orchestrator reference"""

from orchestrator_reference import (
    get_reference,
    validate_setup,
    get_extraction_plan,
    FileCategory,
)

def run_diagnostics(target_path):
    """Run full diagnostics on a target setup"""
    print("🔍 ORCHESTRATOR DIAGNOSTICS")
    print("=" * 60)
    
    # Check if production ready
    result = validate_setup(target_path)
    print(f"\nProduction Ready: {result['is_production_ready']}")
    
    if not result['is_production_ready']:
        failures = result['report']['critical_failures']
        print(f"Failures: {failures}")
    
    # Get extraction plan
    plan = get_extraction_plan()
    print(f"\nExtraction steps: {len(plan['plan'])}")
    
    # Get reference
    ref = get_reference()
    summary = ref.get_summary()
    
    print(f"\nFramework Summary:")
    for key, value in summary.items():
        print(f"  {key}: {value}")

if __name__ == "__main__":
    run_diagnostics(".")
```

---

## 📞 Support

- Generated from: `PRODUCTION_EXTRACTION_MANIFEST.json`
- Implementation: `orchestrator_reference.py`
- For agents to import and use: Yes ✅
- Extensible: Yes ✅
- Type-safe: Yes ✅

---

**Author:** Patrick Josh Añedez  
**License:** MIT  
**Version:** 1.0.0

