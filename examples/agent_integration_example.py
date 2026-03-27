#!/usr/bin/env python3
"""
AGENT INTEGRATION EXAMPLE
Example Python scripts showing how each agent type uses orchestrator_reference.py

Author: Patrick Josh Añedez
Version: 1.0.0
"""

from pathlib import Path
from orchestrator_reference import (
    get_reference,
    validate_setup,
    get_extraction_plan,
    get_production_summary,
    FileCategory,
    Criticality,
)


# ============================================================================
# AGENT 1: ORCHESTRATOR - Validation & Routing
# ============================================================================

class OrchestratorAgentExample:
    """Master orchestrator agent validates setup and routes work"""
    
    def __init__(self):
        self.ref = get_reference()
    
    def validate_and_report(self, target_path: str) -> dict:
        """Validate production setup and generate report"""
        print("\n🎯 ORCHESTRATOR: Validating Production Setup")
        print("=" * 70)
        
        result = validate_setup(target_path)
        
        if result["is_production_ready"]:
            print("✅ Production setup is VALID")
            print(f"   All critical files present and accounted for")
            return {"status": "ready", "can_proceed": True}
        else:
            print("❌ Production setup has ISSUES")
            categories = result["report"].get("categories", {})
            for category, cat_info in categories.items():
                if not cat_info.get("valid", True):
                    print(f"   ❌ {category}: {cat_info.get('requirement', 'Unknown requirement')}")
            return {"status": "failed", "can_proceed": False, "failures": categories}
    
    def route_to_workers(self) -> list:
        """Determine which agents need to be called"""
        print("\n📋 ORCHESTRATOR: Planning Work Distribution")
        print("=" * 70)
        
        plan_data = get_extraction_plan()
        steps = plan_data["plan"]
        
        work_items = []
        for step in steps:
            work_item = {
                "step": step["step"],
                "agent": self._select_agent_for_category(step["category"]),
                "category": step["category"],
                "file_count": step["file_count"],
            }
            work_items.append(work_item)
            print(f"Step {step['step']}: Assign {work_item['agent']} → Extract {step['category']} ({step['file_count']} files)")
        
        return work_items
    
    @staticmethod
    def _select_agent_for_category(category: str) -> str:
        """Route category to appropriate agent"""
        routing = {
            "configuration": "Coder",
            "python_modules": "Coder",
            "context": "Context-Manager",
            "instructions": "Researcher",
            "agents": "Researcher",
            "documentation": "Researcher",
            "skills": "Researcher",
            "hooks": "Coder",
            "tests": "Test-Automation",
        }
        return routing.get(category, "Coder")


# ============================================================================
# AGENT 2: CODER - File Extraction & Preparation
# ============================================================================

class CoderAgentExample:
    """Coder agent handles file extraction and code generation"""
    
    def __init__(self):
        self.ref = get_reference()
    
    def extract_category(self, category: str, target_path: str) -> dict:
        """Extract files for a specific category"""
        print(f"\n💻 CODER: Extracting {category}")
        print("=" * 70)
        
        try:
            cat_enum = FileCategory[category.upper()]
            files = self.ref.manifest.get_file_by_category(cat_enum)
            
            results = {
                "category": category,
                "files_extracted": len(files),
                "details": [],
            }
            
            for file_path, spec in list(files.items())[:5]:  # Show first 5
                print(f"  ✓ {file_path}")
                print(f"    Purpose: {spec.purpose}")
                print(f"    Criticality: {spec.criticality}")
                
                results["details"].append({
                    "path": str(file_path),
                    "purpose": spec.purpose,
                    "criticality": spec.criticality,
                })
            
            if len(files) > 5:
                print(f"  ... and {len(files) - 5} more files")
            
            return {"status": "success", "result": results}
        
        except Exception as e:
            print(f"❌ Error extracting {category}: {e}")
            return {"status": "failed", "error": str(e)}
    
    def validate_extraction(self, category: str, target_path: str) -> bool:
        """Validate that extraction was successful"""
        print(f"\n💻 CODER: Validating {category} extraction")
        
        is_valid, details = self.ref.validator.validate_file_category(
            FileCategory[category.upper()],
            Path(target_path),
        )
        
        if is_valid:
            print(f"✅ {category} extraction is valid")
        else:
            print(f"❌ {category} extraction has issues:")
            for issue, count in details.items():
                print(f"   {issue}: {count}")
        
        return is_valid


# ============================================================================
# AGENT 3: CONTEXT-MANAGER - State & Metadata
# ============================================================================

class ContextManagerAgentExample:
    """Context manager agent handles state, tracking, and metadata"""
    
    def __init__(self):
        self.ref = get_reference()
        self.state = {}
    
    def initialize_context(self) -> dict:
        """Initialize context with reference data"""
        print("\n📚 CONTEXT-MANAGER: Initializing Framework Context")
        print("=" * 70)
        
        summary = get_production_summary()
        
        self.state = {
            "framework": {
                "name": summary["project"],
                "version": summary["version"],
                "author": summary["author"],
            },
            "inventory": {
                "total_files": summary["total_files"],
                "agents": summary["agents"],
                "skills": summary["skills"],
                "instructions": summary["instructions"],
                "validation_rules": summary["validation_rules"],
            },
            "agents": self.ref.get_all_agents(),
            "agent_instructions": self.ref.get_all_instructions(),
        }
        
        print(f"Framework: {self.state['framework']['name']} v{self.state['framework']['version']}")
        print(f"Total files: {self.state['inventory']['total_files']}")
        print(f"Agents: {self.state['inventory']['agents']}")
        print(f"Skills: {self.state['inventory']['skills']}")
        
        return self.state
    
    def track_progress(self, stage: str, details: dict):
        """Track extraction progress"""
        print(f"\n📚 CONTEXT-MANAGER: Tracking {stage}")
        
        if "progress" not in self.state:
            self.state["progress"] = []
        
        self.state["progress"].append({
            "stage": stage,
            "details": details,
        })
        
        print(f"✓ Tracked: {stage}")
        print(f"  Details: {details}")


# ============================================================================
# AGENT 4: RESEARCHER - Information Lookup
# ============================================================================

class ResearcherAgentExample:
    """Researcher agent queries and reports on framework data"""
    
    def __init__(self):
        self.ref = get_reference()
    
    def get_agent_profiles(self) -> dict:
        """Research all agents and their instructions"""
        print("\n🔍 RESEARCHER: Profiling All Agents")
        print("=" * 70)
        
        agents = self.ref.get_all_agents()
        instructions = self.ref.get_all_instructions()
        
        profiles = {}
        
        for agent_path, agent_name in list(agents.items())[:3]:  # First 3
            print(f"\n🤖 {agent_name}")
            print(f"   Path: {agent_path}")
            
            # Find corresponding instruction
            agent_key = agent_name.lower().split()[0]
            instr_file = None
            
            for instr_path, spec in instructions.items():
                if agent_key in instr_path.lower():
                    instr_file = instr_path
                    print(f"   Instructions: {spec.purpose}")
                    print(f"   Criticality: {spec.criticality}")
                    break
            
            profiles[agent_name] = {
                "path": agent_path,
                "instructions": instr_file,
            }
        
        return profiles
    
    def research_skills(self) -> dict:
        """Research available skills"""
        print("\n🔍 RESEARCHER: Researching Available Skills")
        print("=" * 70)
        
        summary = get_production_summary()
        print(f"Total skills available: {summary['skills']}")
        
        # Get skill files
        skills = self.ref.manifest.get_file_by_category(FileCategory.SKILLS)
        
        print("\nSkill categories (sample):")
        for skill_path, spec in list(skills.items())[:5]:
            print(f"  • {skill_path}")
            print(f"    {spec.purpose}")
        
        return {
            "total_skills": summary["skills"],
            "sample_count": 5,
        }


# ============================================================================
# AGENT 5: REVIEWER - Quality Assurance
# ============================================================================

class ReviewerAgentExample:
    """Reviewer agent checks quality and compliance"""
    
    def __init__(self):
        self.ref = get_reference()
    
    def review_production_readiness(self, target_path: str) -> dict:
        """Review if production setup meets all requirements"""
        print("\n👁️ REVIEWER: Auditing Production Readiness")
        print("=" * 70)
        
        report = self.ref.validator.generate_report(Path(target_path))
        is_ready = self.ref.validator.is_production_ready(Path(target_path))
        
        verdict = "✅ APPROVED" if is_ready else "❌ REJECTED"
        print(f"Verdict: {verdict}")
        
        critical_rules = self.ref.manifest.get_critical_rules()
        print(f"\nCritical rules checked: {len(critical_rules)}")
        
        for rule in critical_rules[:3]:
            category_status = report.get("categories", {}).get(rule.category.value, {})
            status = "✓" if category_status.get("valid", False) else "✗"
            print(f"  {status} {rule.requirement}")
        
        return {
            "verdict": verdict,
            "is_approved": is_ready,
            "report": report,
        }


# ============================================================================
# AGENT 6: TEST-AUTOMATION - Verification
# ============================================================================

class TestAutomationAgentExample:
    """Test automation agent creates and runs test suite"""
    
    def __init__(self):
        self.ref = get_reference()
    
    def generate_test_plan(self) -> dict:
        """Generate test plan based on extraction requirements"""
        print("\n🧪 TEST-AUTOMATION: Generating Test Plan")
        print("=" * 70)
        
        critical_files = self.ref.manifest.get_all_critical_files()
        
        test_plan = {
            "total_tests": len(critical_files),
            "test_categories": {},
        }
        
        for category in FileCategory:
            rules = self.ref.manifest.get_validation_rules_for_category(category)
            if rules:
                test_plan["test_categories"][category.value] = {
                    "count": len(rules),
                    "rules": [r.requirement for r in rules],
                }
                print(f"\n{category.value}")
                for rule in rules[:2]:
                    print(f"  - {rule.requirement}")
        
        return test_plan


# ============================================================================
# AGENT 7: LOGIC-DEBUGGER - Troubleshooting
# ============================================================================

class LogicDebuggerAgentExample:
    """Logic debugger agent diagnoses and fixes issues"""
    
    def __init__(self):
        self.ref = get_reference()
    
    def diagnose_extraction_issue(self, category: str, target_path: str) -> dict:
        """Diagnose extraction issues for a category"""
        print(f"\n🐛 LOGIC-DEBUGGER: Diagnosing {category}")
        print("=" * 70)
        
        try:
            is_valid, details = self.ref.validator.validate_file_category(
                FileCategory[category.upper()],
                Path(target_path),
            )
            
            if is_valid:
                print(f"✅ No issues found in {category}")
                return {"status": "healthy", "category": category}
            
            else:
                print(f"❌ Issues detected in {category}:")
                for key, value in details.items():
                    print(f"   {key}: {value}")
                
                # Get validation rules for this category
                rules = self.ref.manifest.get_validation_rules_for_category(
                    FileCategory[category.upper()]
                )
                
                print(f"\nApplicable validation rules:")
                for rule in rules:
                    print(f"   - {rule.requirement}")
                
                return {
                    "status": "issues_found",
                    "category": category,
                    "details": details,
                    "rules": [r.requirement for r in rules],
                }
        
        except Exception as e:
            print(f"❌ Error diagnosing: {e}")
            return {"status": "error", "error": str(e)}


# ============================================================================
# MAIN ORCHESTRATION PIPELINE
# ============================================================================

def run_full_agent_workflow():
    """Demonstrate full workflow with all agents"""
    
    print("\n" + "=" * 70)
    print("🚀 FULL AGENT WORKFLOW DEMONSTRATION")
    print("=" * 70)
    
    target_path = "."
    
    # 1. Orchestrator validates and routes
    orchestrator = OrchestratorAgentExample()
    validation = orchestrator.validate_and_report(target_path)
    work_items = orchestrator.route_to_workers()
    
    # 2. Context-Manager initializes state
    context_mgr = ContextManagerAgentExample()
    context = context_mgr.initialize_context()
    context_mgr.track_progress("initial_validation", validation)
    
    # 3. Coder handles extraction
    coder = CoderAgentExample()
    extraction_result = coder.extract_category("python_modules", target_path)
    is_valid = coder.validate_extraction("python_modules", target_path)
    
    # 4. Researcher gathers information
    researcher = ResearcherAgentExample()
    agent_profiles = researcher.get_agent_profiles()
    skills = researcher.research_skills()
    
    # 5. Reviewer checks quality
    reviewer = ReviewerAgentExample()
    review = reviewer.review_production_readiness(target_path)
    
    # 6. Test-Automation creates test plan
    test_automation = TestAutomationAgentExample()
    test_plan = test_automation.generate_test_plan()
    
    # 7. Logic-Debugger diagnoses issues
    debugger = LogicDebuggerAgentExample()
    diagnosis = debugger.diagnose_extraction_issue("python_modules", target_path)
    
    # Final summary
    print("\n" + "=" * 70)
    print("📊 WORKFLOW SUMMARY")
    print("=" * 70)
    print(f"✅ Orchestration complete")
    print(f"✅ Context initialized")
    print(f"✅ Extraction validated: {is_valid}")
    print(f"✅ Review verdict: {review['verdict']}")
    print(f"✅ Tests planned: {test_plan['total_tests']} tests")
    print(f"✅ Diagnostics: {diagnosis['status']}")


# ============================================================================
# QUICK REFERENCE EXAMPLES
# ============================================================================

def quick_examples():
    """Show quick usage examples"""
    
    print("\n" + "=" * 70)
    print("🎯 QUICK AGENT REFERENCE EXAMPLES")
    print("=" * 70)
    
    ref = get_reference()
    
    print("\n1️⃣ Get all agents:")
    agents = ref.get_all_agents()
    for path, name in list(agents.items())[:3]:
        print(f"   • {name}")
    
    print("\n2️⃣ Get all instructions:")
    instructions = ref.get_all_instructions()
    for path, spec in list(instructions.items())[:3]:
        print(f"   • {path}")
    
    print("\n3️⃣ Get extraction plan:")
    plan_data = get_extraction_plan()
    for step in plan_data["plan"][:3]:
        print(f"   Step {step['step']}: {step['category']}")
    
    print("\n4️⃣ Validate setup:")
    result = validate_setup(".")
    print(f"   Is production ready: {result['is_production_ready']}")
    
    print("\n5️⃣ Get summary:")
    summary = get_production_summary()
    print(f"   Framework: {summary['project']}")
    print(f"   Total files: {summary['total_files']}")


if __name__ == "__main__":
    # Run full workflow
    run_full_agent_workflow()
    
    # Show quick examples
    quick_examples()
    
    print("\n" + "=" * 70)
    print("✅ ALL AGENTS EXECUTED SUCCESSFULLY")
    print("=" * 70)

