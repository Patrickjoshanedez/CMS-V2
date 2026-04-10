#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();

const requiredAgentNames = [
  'context-manager',
  'researcher',
  'Thinker pro',
  'product-design-handoff',
  'coder',
  'logic-debugger',
  'test-automation',
  '100x Code Reviewer',
];

const requiredPreToolScripts = [
  '.github/hooks/scripts/hllm_regex_preflight.py',
  '.github/hooks/scripts/static_gatekeeper.py',
  '.github/hooks/scripts/continual_learning_checkpoint.py',
];

function readJson(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

function safeRead(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function parseAgentName(agentFilePath) {
  const content = safeRead(agentFilePath);
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) return null;
  const frontmatter = frontmatterMatch[1];
  const nameMatch = frontmatter.match(/^name:\s*['\"]?(.+?)['\"]?\s*$/im);
  if (!nameMatch) return null;
  return nameMatch[1].trim();
}

function extractScriptPathFromCommand(command) {
  const match = String(command || '').match(/\.github[\\/]hooks[\\/]scripts[\\/][\w.-]+\.py/);
  if (!match) return null;
  return match[0].replace(/\\/g, '/');
}

function validateCopilotHooks(checks) {
  const filePath = path.join(root, '.github', 'hooks', 'copilot-runtime-hooks.json');
  if (!fs.existsSync(filePath)) {
    checks.push({
      name: 'copilot-runtime-hooks.json exists',
      ok: false,
      details: 'Missing .github/hooks/copilot-runtime-hooks.json',
    });
    return;
  }

  let parsed;
  try {
    parsed = readJson(filePath);
  } catch (error) {
    checks.push({
      name: 'copilot-runtime-hooks.json parse',
      ok: false,
      details: error.message,
    });
    return;
  }

  const hooks = parsed.hooks || {};
  const preTool = Array.isArray(hooks.PreToolUse) ? hooks.PreToolUse : [];
  const postTool = Array.isArray(hooks.PostToolUse) ? hooks.PostToolUse : [];

  checks.push({
    name: 'copilot PreToolUse handlers present',
    ok: preTool.length > 0,
    details: `PreToolUse handler count=${preTool.length}`,
  });

  checks.push({
    name: 'copilot PostToolUse handlers present',
    ok: postTool.length > 0,
    details: `PostToolUse handler count=${postTool.length}`,
  });

  const discoveredScripts = new Set();
  for (const handler of [...preTool, ...postTool]) {
    const scriptPath = extractScriptPathFromCommand(handler.command || handler.windows || handler.linux || handler.osx);
    if (scriptPath) discoveredScripts.add(scriptPath);
  }

  for (const script of requiredPreToolScripts) {
    checks.push({
      name: `copilot PreToolUse includes ${script}`,
      ok: discoveredScripts.has(script),
      details: discoveredScripts.has(script) ? 'found' : 'missing',
    });
  }
}

function validateOrchestratorHooks(checks) {
  const filePath = path.join(root, '.github', 'hooks', 'orchestrator-automation.json');
  if (!fs.existsSync(filePath)) {
    checks.push({
      name: 'orchestrator-automation.json exists',
      ok: false,
      details: 'Missing .github/hooks/orchestrator-automation.json',
    });
    return;
  }

  let parsed;
  try {
    parsed = readJson(filePath);
  } catch (error) {
    checks.push({
      name: 'orchestrator-automation.json parse',
      ok: false,
      details: error.message,
    });
    return;
  }

  const preToolRaw = parsed?.hooks?.PreToolUse;
  let handlers = [];

  if (Array.isArray(preToolRaw)) {
    handlers = preToolRaw;
  } else if (preToolRaw && Array.isArray(preToolRaw.handlers)) {
    handlers = preToolRaw.handlers;
  }

  checks.push({
    name: 'orchestrator PreToolUse handlers present',
    ok: handlers.length > 0,
    details: `handler count=${handlers.length}`,
  });

  const ids = new Set(handlers.map((handler) => handler.id));
  checks.push({
    name: 'orchestrator has hllm-regex-preflight handler',
    ok: ids.has('hllm-regex-preflight'),
    details: ids.has('hllm-regex-preflight') ? 'found' : 'missing',
  });
  checks.push({
    name: 'orchestrator has static-gatekeeper handler',
    ok: ids.has('static-gatekeeper'),
    details: ids.has('static-gatekeeper') ? 'found' : 'missing',
  });

  for (const handler of handlers) {
    const declaredScript = typeof handler.script === 'string' ? handler.script.trim() : '';
    const commandScript = extractScriptPathFromCommand(
      handler.command || handler.windows || handler.linux || handler.osx,
    );
    const scriptRef = declaredScript || commandScript || '';

    if (!scriptRef) {
      checks.push({
        name: `handler ${handler.id || '<unknown>'} script path`,
        ok: false,
        details: 'script path missing',
      });
      continue;
    }

    const absoluteScriptPath = path.join(root, ...scriptRef.split('/'));
    checks.push({
      name: `script exists for handler ${handler.id}`,
      ok: fs.existsSync(absoluteScriptPath),
      details: scriptRef,
    });
  }
}

function validateAgentTokens(checks) {
  const agentsDir = path.join(root, '.github', 'agents');
  if (!fs.existsSync(agentsDir)) {
    checks.push({
      name: 'agents directory exists',
      ok: false,
      details: 'Missing .github/agents directory',
    });
    return;
  }

  const files = fs.readdirSync(agentsDir).filter((entry) => entry.endsWith('.agent.md'));
  const resolvedNames = new Set();

  for (const file of files) {
    const fullPath = path.join(agentsDir, file);
    const name = parseAgentName(fullPath);
    if (name) resolvedNames.add(name);
  }

  for (const requiredName of requiredAgentNames) {
    checks.push({
      name: `agent token resolved: ${requiredName}`,
      ok: resolvedNames.has(requiredName),
      details: resolvedNames.has(requiredName) ? 'found' : 'missing',
    });
  }

  const orchestratorPath = path.join(agentsDir, 'orchestrator.agent.md');
  if (!fs.existsSync(orchestratorPath)) {
    checks.push({
      name: 'orchestrator.agent.md exists',
      ok: false,
      details: 'missing orchestrator agent file',
    });
    return;
  }

  const orchestratorText = safeRead(orchestratorPath);
  for (const requiredName of requiredAgentNames) {
    checks.push({
      name: `orchestrator references ${requiredName}`,
      ok: orchestratorText.includes(requiredName),
      details: orchestratorText.includes(requiredName)
        ? 'referenced'
        : 'not referenced in orchestrator instructions',
    });
  }
}

function validateStateIntegrity(checks) {
  const stateFile = path.join(root, '.github', 'hooks', 'state', 'test_fix_state.json');
  if (!fs.existsSync(stateFile)) {
    checks.push({
      name: 'test_fix_state.json exists',
      ok: false,
      details: 'missing .github/hooks/state/test_fix_state.json',
    });
    return;
  }

  let state;
  try {
    state = readJson(stateFile);
  } catch (error) {
    checks.push({
      name: 'test_fix_state.json parse',
      ok: false,
      details: error.message,
    });
    return;
  }

  const hasPendingFailures = Array.isArray(state.pendingFailures);
  const hasObserved = typeof state.observedTestActivity === 'boolean';
  const gate = state.publicExposureGate || {};

  checks.push({
    name: 'state.pendingFailures is array',
    ok: hasPendingFailures,
    details: hasPendingFailures ? `count=${state.pendingFailures.length}` : 'invalid type',
  });
  checks.push({
    name: 'state.observedTestActivity is boolean',
    ok: hasObserved,
    details: hasObserved ? String(state.observedTestActivity) : 'invalid type',
  });

  const gateKeys = ['pending', 'pendingContext', 'passed', 'lastVerifiedAt', 'lastAttemptedCommand', 'lastBlockedAt', 'evidenceMap', 'updatedAt'];
  for (const key of gateKeys) {
    checks.push({
      name: `state.publicExposureGate.${key} exists`,
      ok: Object.prototype.hasOwnProperty.call(gate, key),
      details: Object.prototype.hasOwnProperty.call(gate, key) ? 'ok' : 'missing',
    });
  }

  const patternFile = path.join(root, '.github', 'hooks', 'state', 'hllm_blacklist_patterns.json');
  if (!fs.existsSync(patternFile)) {
    checks.push({
      name: 'hllm_blacklist_patterns.json exists',
      ok: false,
      details: 'missing .github/hooks/state/hllm_blacklist_patterns.json',
    });
    return;
  }

  let patternState;
  try {
    patternState = readJson(patternFile);
  } catch (error) {
    checks.push({
      name: 'hllm_blacklist_patterns.json parse',
      ok: false,
      details: error.message,
    });
    return;
  }

  const patterns = Array.isArray(patternState.patterns) ? patternState.patterns : [];
  checks.push({
    name: 'hllm blacklist pattern list non-empty',
    ok: patterns.length > 0,
    details: `count=${patterns.length}`,
  });

  for (const entry of patterns) {
    const patternText = entry && typeof entry.pattern === 'string' ? entry.pattern : '';
    if (!patternText) {
      checks.push({
        name: 'hllm blacklist pattern has regex text',
        ok: false,
        details: JSON.stringify(entry),
      });
      continue;
    }

    try {
      // Validate regex compiles.
      new RegExp(patternText, 'i');
      checks.push({
        name: `regex compiles: ${entry.id || patternText}`,
        ok: true,
        details: 'ok',
      });
    } catch (error) {
      checks.push({
        name: `regex compiles: ${entry.id || patternText}`,
        ok: false,
        details: error.message,
      });
    }
  }
}

function validateAgentPrefetchRegistry(checks) {
  const filePath = path.join(root, '.github', 'hooks', 'state', 'agent_prefetch_registry.json');
  if (!fs.existsSync(filePath)) {
    checks.push({
      name: 'agent_prefetch_registry.json exists',
      ok: false,
      details: 'missing .github/hooks/state/agent_prefetch_registry.json',
    });
    return;
  }

  let registry;
  try {
    registry = readJson(filePath);
  } catch (error) {
    checks.push({
      name: 'agent_prefetch_registry.json parse',
      ok: false,
      details: error.message,
    });
    return;
  }

  const agentCount = registry.agent_count || 0;
  checks.push({
    name: 'agent_prefetch_registry.json non-empty',
    ok: agentCount > 0,
    details: `agent_count=${agentCount}`,
  });

  const validationSummary = registry.validation_summary || {};
  checks.push({
    name: 'prefetch registry has valid agents',
    ok: validationSummary.valid > 0,
    details: `valid=${validationSummary.valid}, invalid=${validationSummary.invalid}`,
  });

  const agents = Object.keys(registry.agents || {});
  for (const requiredName of ['context-manager', 'researcher', 'coder', 'logic-debugger', 'test-automation']) {
    const found = agents.some((name) => name.toLowerCase().includes(requiredName.toLowerCase()));
    checks.push({
      name: `prefetch registry includes ${requiredName}`,
      ok: found,
      details: found ? 'found' : 'missing',
    });
  }
}

function validateAgentSyncDAG(checks) {
  const filePath = path.join(root, '.github', 'hooks', 'state', 'agent_communication_dag.json');
  if (!fs.existsSync(filePath)) {
    checks.push({
      name: 'agent_communication_dag.json exists',
      ok: false,
      details: 'missing .github/hooks/state/agent_communication_dag.json',
    });
    return;
  }

  let dag;
  try {
    dag = readJson(filePath);
  } catch (error) {
    checks.push({
      name: 'agent_communication_dag.json parse',
      ok: false,
      details: error.message,
    });
    return;
  }

  const metadata = dag.metadata || {};
  checks.push({
    name: 'sync DAG has agents',
    ok: metadata.agent_count > 0,
    details: `agent_count=${metadata.agent_count}`,
  });

  checks.push({
    name: 'sync DAG has edges',
    ok: metadata.edges_count > 0,
    details: `edges_count=${metadata.edges_count}`,
  });

  checks.push({
    name: 'sync DAG has no cycles',
    ok: !metadata.has_cycles,
    details: metadata.has_cycles ? 'cycles detected' : 'no cycles',
  });

  checks.push({
    name: 'sync DAG has no deadlocks',
    ok: !metadata.has_deadlocks,
    details: metadata.has_deadlocks ? 'deadlocks detected' : 'no deadlocks',
  });

  checks.push({
    name: 'sync DAG validation status',
    ok: metadata.validation_status === 'valid',
    details: metadata.validation_status,
  });
}

function validateDecisionCoherence(checks) {
  const filePath = path.join(root, '.github', 'hooks', 'state', 'decision_coherence_report.json');
  if (!fs.existsSync(filePath)) {
    checks.push({
      name: 'decision_coherence_report.json exists',
      ok: false,
      details: 'missing .github/hooks/state/decision_coherence_report.json',
    });
    return;
  }

  let report;
  try {
    report = readJson(filePath);
  } catch (error) {
    checks.push({
      name: 'decision_coherence_report.json parse',
      ok: false,
      details: error.message,
    });
    return;
  }

  checks.push({
    name: 'coherence report validation status',
    ok: report.validation_status === 'valid',
    details: report.validation_status,
  });

  const summary = report.summary || {};
  checks.push({
    name: 'coherence report has no errors',
    ok: summary.errors === 0,
    details: `errors=${summary.errors}, warnings=${summary.warnings}`,
  });

  checks.push({
    name: 'coherence report has routing rules',
    ok: (summary.routing_rules_count || 0) > 0,
    details: `routing_rules_count=${summary.routing_rules_count}`,
  });

  checks.push({
    name: 'coherence report has no conflicts',
    ok: (summary.conflicts_count || 0) === 0,
    details: `conflicts_count=${summary.conflicts_count}`,
  });
}

function main() {
  const checks = [];

  validateCopilotHooks(checks);
  validateOrchestratorHooks(checks);
  validateAgentTokens(checks);
  validateStateIntegrity(checks);
  validateAgentPrefetchRegistry(checks);
  validateAgentSyncDAG(checks);
  validateDecisionCoherence(checks);

  const failed = checks.filter((check) => !check.ok);
  const passed = checks.filter((check) => check.ok);

  console.log('Agentic System Audit');
  console.log('====================');
  for (const check of checks) {
    const marker = check.ok ? 'PASS' : 'FAIL';
    console.log(`[${marker}] ${check.name} :: ${check.details}`);
  }

  const summary = {
    ok: failed.length === 0,
    total: checks.length,
    passed: passed.length,
    failed: failed.length,
    failedChecks: failed.map((check) => ({ name: check.name, details: check.details })),
  };

  console.log('\nAudit Summary JSON');
  console.log(JSON.stringify(summary, null, 2));

  if (failed.length > 0) {
    process.exitCode = 1;
    return;
  }

  process.exitCode = 0;
}

main();
