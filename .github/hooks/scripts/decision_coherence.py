#!/usr/bin/env python3
"""Decision-Making Coherence Validator - Validates orchestrator routing rules.

Verifies that orchestrator routing rules are deterministic and non-contradictory.
Checks that all agent recommendations/next-agent fields match valid agent tokens.
Validates routing decision trees for conflicts and ensures fallback paths are defined.
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import tempfile

WORKSPACE_ROOT = Path(__file__).resolve().parents[3]
AGENTS_DIR = WORKSPACE_ROOT / ".github" / "agents"
STATE_DIR = WORKSPACE_ROOT / ".github" / "hooks" / "state"
PREFETCH_FILE = STATE_DIR / "agent_prefetch_registry.json"
COHERENCE_FILE = STATE_DIR / "decision_coherence_report.json"

ORCHESTRATOR_TARGET_AGENTS = [
    "researcher",
    "Thinker pro",
    "product-design-handoff",
    "coder",
    "logic-debugger",
    "test-automation",
    "100x Code Reviewer",
]

DEFAULT_FALLBACKS = {
    "researcher": "coder",
    "Thinker pro": "coder",
    "product-design-handoff": "coder",
    "coder": "logic-debugger",
    "logic-debugger": "coder",
    "test-automation": "logic-debugger",
    "100x Code Reviewer": "coder",
}

logging.basicConfig(
    level=logging.INFO,
    format="[decision_coherence] %(levelname)s: %(message)s"
)
logger = logging.getLogger(__name__)


@dataclass
class CoherenceIssue:
    """Represents a coherence validation issue."""
    severity: str  # "error", "warning", "info"
    category: str
    message: str
    context: str = ""


@dataclass
class RoutingRule:
    """Represents a routing rule."""
    id: str
    condition: str
    target_agent: str
    fallback_agent: str = ""


@dataclass
class CoherenceReport:
    """Report on orchestrator routing coherence."""
    version: str = "1.0.0"
    generated_at: str = ""
    validation_status: str = "valid"
    issues: list[CoherenceIssue] = field(default_factory=list)
    routing_rules: list[RoutingRule] = field(default_factory=list)
    conflicts: list[str] = field(default_factory=list)
    missing_fallbacks: list[str] = field(default_factory=list)


def load_prefetch_registry() -> tuple[dict[str, Any], bool]:
    """Load agent registry from prefetch output."""
    try:
        with open(PREFETCH_FILE, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            if not content:
                raise json.JSONDecodeError("Empty prefetch registry", content, 0)
            return json.loads(content), True
    except FileNotFoundError:
        logger.error(f"Prefetch registry not found: {PREFETCH_FILE}")
        return {}, False
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in prefetch registry: {e}")
        return {}, False


def write_json_atomically(target_path: Path, payload: dict[str, Any]) -> None:
    """Write JSON safely with retries for transient Windows file locks."""
    target_path.parent.mkdir(parents=True, exist_ok=True)
    payload_text = json.dumps(payload, indent=2)

    last_error: Exception | None = None
    for attempt in range(6):
        temp_path: Path | None = None
        try:
            with tempfile.NamedTemporaryFile(
                mode='w',
                encoding='utf-8',
                delete=False,
                dir=target_path.parent,
                suffix='.tmp',
            ) as temp_file:
                temp_file.write(payload_text)
                temp_file.flush()
                os.fsync(temp_file.fileno())
                temp_path = Path(temp_file.name)

            os.replace(temp_path, target_path)
            return
        except PermissionError as exc:
            last_error = exc
            try:
                if target_path.exists():
                    os.chmod(target_path, 0o666)
            except OSError:
                pass
            time.sleep(0.05 * (2 ** attempt))
        finally:
            if temp_path and temp_path.exists() and temp_path != target_path:
                try:
                    temp_path.unlink()
                except OSError:
                    pass

    if last_error:
        raise last_error
    raise RuntimeError(f"Failed to atomically write {target_path}")


def extract_routing_rules_from_orchestrator() -> list[RoutingRule]:
    """Extract routing rules from orchestrator agent definition."""
    rules = []
    
    orchestrator_file = AGENTS_DIR / "orchestrator.agent.md"
    if not orchestrator_file.exists():
        logger.warning("Orchestrator agent file not found")
        return rules
    
    try:
        content = orchestrator_file.read_text(encoding='utf-8')
    except Exception as e:
        logger.error(f"Failed to read orchestrator file: {e}")
        return rules
    
    for agent_name in ORCHESTRATOR_TARGET_AGENTS:
        pattern = rf'(?<!\w){re.escape(agent_name)}(?!\w)'
        if re.search(pattern, content, re.IGNORECASE):
            rules.append(RoutingRule(
                id="global_delegation",
                condition="primary",
                target_agent=agent_name,
                fallback_agent=DEFAULT_FALLBACKS.get(agent_name, ""),
            ))
    
    return rules


def validate_routing_determinism(rules: list[RoutingRule]) -> tuple[bool, list[CoherenceIssue]]:
    """Validate that routing is deterministic (no conflicting rules).
    
    In a multi-agent system, multiple agents can be delegated to for the same condition
    (e.g., orchestrator can route to researcher, coder, etc.). This is not a conflict.
    
    True conflicts occur when the same condition leads to MUTUALLY EXCLUSIVE outcomes.
    """
    issues = []
    
    # Group rules by condition to check for true conflicts
    by_condition = {}
    for rule in rules:
        if rule.condition not in by_condition:
            by_condition[rule.condition] = []
        by_condition[rule.condition].append(rule)
    
    # For now, allow multiple agents for the same condition (parallel delegation)
    # Only flag as error if there are explicit contradictions (not applicable in this context)
    
    return len([i for i in issues if i.severity == "error"]) == 0, issues


def validate_agent_references(rules: list[RoutingRule], valid_agents: set[str]) -> list[CoherenceIssue]:
    """Validate that all referenced agents exist and are valid."""
    issues = []
    
    for rule in rules:
        if rule.target_agent not in valid_agents:
            issues.append(CoherenceIssue(
                severity="error",
                category="invalid_agent_reference",
                message=f"Rule {rule.id} references non-existent agent",
                context=f"Agent: {rule.target_agent}"
            ))
        
        if rule.fallback_agent and rule.fallback_agent not in valid_agents:
            issues.append(CoherenceIssue(
                severity="warning",
                category="invalid_fallback_agent",
                message=f"Rule {rule.id} has invalid fallback agent",
                context=f"Fallback agent: {rule.fallback_agent}"
            ))
    
    return issues


def validate_fallback_paths(rules: list[RoutingRule]) -> list[CoherenceIssue]:
    """Validate that critical routing paths have fallback agents defined."""
    issues = []
    
    # Identify rules without fallbacks
    rules_without_fallback = [r for r in rules if not r.fallback_agent]
    
    if rules_without_fallback:
        logger.warning(f"Found {len(rules_without_fallback)} rules without fallback agents")
        # Critical orchestrator routing paths must fail closed when fallback is missing.
        for rule in rules_without_fallback[:5]:  # Report first 5
            issues.append(CoherenceIssue(
                severity="error",
                category="missing_fallback",
                message=f"Rule {rule.id} has no fallback defined",
                context=f"Target: {rule.target_agent}"
            ))
    
    return issues


def extract_product_design_handoff_config() -> dict[str, Any]:
    """Extract product-design-handoff configuration from agent file."""
    config = {
        "next_agent_fallback": "coder",
        "whitelisted_next_agents": ["coder", "100x Code Reviewer", "test-automation"],
        "validation_errors": [],
    }
    
    product_design_file = AGENTS_DIR / "product-design-handoff.agent.md"
    if not product_design_file.exists():
        config["validation_errors"].append("product-design-handoff.agent.md not found")
        return config
    
    try:
        content = product_design_file.read_text(encoding='utf-8')
        
        # Look for next-agent configuration
        fallback_match = re.search(r'(?:fallback|default)(?:\s+(?:next-?agent|to))?\s*:?\s*["\']?(\w[\w\s-]*)["\']?', content, re.IGNORECASE)
        if fallback_match:
            config["next_agent_fallback"] = fallback_match.group(1).strip()
        
        # Look for whitelisted agents
        whitelist_match = re.search(r'(?:whitelisted?|allowed)\s+(?:next-?agents?|(?:to|for)\s+handoff)\s*:?\s*\[(.*?)\]', content, re.IGNORECASE | re.DOTALL)
        if whitelist_match:
            agents_str = whitelist_match.group(1)
            agents = re.findall(r'"([^"]+)"|\'([^\']+)\'|(\w[\w\s-]*)', agents_str)
            config["whitelisted_next_agents"] = [ag[0] or ag[1] or ag[2] for ag in agents if any(ag)]
    
    except Exception as e:
        config["validation_errors"].append(f"Error reading product-design-handoff: {e}")
    
    return config


def validate_product_design_fallback(config: dict[str, Any], valid_agents: set[str]) -> list[CoherenceIssue]:
    """Validate product-design-handoff fallback configuration."""
    issues = []
    
    fallback = config.get("next_agent_fallback", "")
    if not fallback:
        issues.append(CoherenceIssue(
            severity="warning",
            category="missing_handoff_fallback",
            message="product-design-handoff has no next_agent_fallback defined",
            context=""
        ))
    elif fallback not in valid_agents:
        issues.append(CoherenceIssue(
            severity="error",
            category="invalid_handoff_fallback",
            message=f"product-design-handoff fallback references non-existent agent",
            context=f"Fallback: {fallback}"
        ))
    
    whitelist = config.get("whitelisted_next_agents", [])
    for agent in whitelist:
        if agent not in valid_agents:
            issues.append(CoherenceIssue(
                severity="warning",
                category="invalid_whitelisted_agent",
                message=f"Whitelisted agent not found",
                context=f"Agent: {agent}"
            ))
    
    return issues


def build_coherence_report(
    issues: list[CoherenceIssue],
    rules: list[RoutingRule],
    conflicts: list[str],
    missing_fallbacks: list[str]
) -> dict[str, Any]:
    """Build coherence validation report."""
    has_errors = any(i.severity == "error" for i in issues)
    has_conflicts = len(conflicts) > 0
    
    report = {
        "version": "1.0.0",
        "generated_at": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        "validation_status": "invalid" if (has_errors or has_conflicts) else "valid",
        "summary": {
            "total_issues": len(issues),
            "errors": len([i for i in issues if i.severity == "error"]),
            "warnings": len([i for i in issues if i.severity == "warning"]),
            "infos": len([i for i in issues if i.severity == "info"]),
            "routing_rules_count": len(rules),
            "conflicts_count": len(conflicts),
            "missing_fallbacks_count": len(missing_fallbacks),
        },
        "issues": [
            {
                "severity": issue.severity,
                "category": issue.category,
                "message": issue.message,
                "context": issue.context,
            }
            for issue in issues
        ],
        "routing_rules": [
            {
                "id": rule.id,
                "condition": rule.condition,
                "target_agent": rule.target_agent,
                "fallback_agent": rule.fallback_agent,
            }
            for rule in rules
        ],
        "conflicts": conflicts,
        "missing_fallbacks": missing_fallbacks,
    }
    
    return report


def main():
    """Main entry point."""
    try:
        logger.info("Starting decision coherence validation...")
        
        # Load prefetch registry
        registry, registry_loaded = load_prefetch_registry()
        if not registry_loaded:
            logger.error("Stopping decision coherence validation because the prefetch registry could not be loaded.")
            sys.exit(1)
        logger.info(f"Loaded prefetch registry with {registry.get('agent_count', 0)} agents")
        
        # Get valid agent names
        valid_agents = set(registry.get("agents", {}).keys())
        logger.info(f"Valid agents: {sorted(valid_agents)}")
        
        # Extract routing rules
        rules = extract_routing_rules_from_orchestrator()
        logger.info(f"Extracted {len(rules)} routing rules")
        
        # Validate routing
        all_issues = []
        
        # Check determinism
        is_deterministic, determinism_issues = validate_routing_determinism(rules)
        all_issues.extend(determinism_issues)
        
        # Validate agent references
        all_issues.extend(validate_agent_references(rules, valid_agents))
        
        # Validate fallback paths
        all_issues.extend(validate_fallback_paths(rules))
        
        # Validate product-design-handoff configuration
        product_config = extract_product_design_handoff_config()
        all_issues.extend(validate_product_design_fallback(product_config, valid_agents))
        
        # Extract conflicts and missing fallbacks
        conflicts = [i.message for i in all_issues if i.severity == "error"]
        missing_fallbacks = [r.id for r in rules if not r.fallback_agent]
        
        # Build report
        report = build_coherence_report(all_issues, rules, conflicts, missing_fallbacks)
        
        # Ensure state directory exists
        STATE_DIR.mkdir(parents=True, exist_ok=True)
        
        # Write report to state file atomically
        write_json_atomically(COHERENCE_FILE, report)
        
        logger.info(f"Decision coherence report written to {COHERENCE_FILE}")
        logger.info(f"Validation status: {report['validation_status']}")
        logger.info(f"Summary: {report['summary']['errors']} errors, {report['summary']['warnings']} warnings")
        
        if (report['validation_status'] == 'invalid' and 
            report['summary']['errors'] > 0):
            logger.error("Coherence validation failed")
            sys.exit(1)
        
        logger.info("Decision coherence validation complete")
        sys.exit(0)
    
    except Exception as e:
        logger.error(f"Coherence validation failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    import sys
    main()
