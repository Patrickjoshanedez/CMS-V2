// Isolated local AI provider for Ollama-backed execution loops.

const HARDWARE_LIMITS = {
  MAX_OLLAMA_CONTEXT: 8192,
  WORKING_BUDGET: 3000,
};

/**
 * Truncate context to keep the local model within the hardware envelope.
 *
 * @param {string} contextString
 * @returns {string}
 */
function enforceHardwareCap(contextString) {
  const safeContext = String(contextString ?? '');
  const approxTokens = safeContext.length / 4;

  if (approxTokens > HARDWARE_LIMITS.MAX_OLLAMA_CONTEXT) {
    console.warn(
      `[Local AI] Context truncated from ~${Math.round(approxTokens)} to ${HARDWARE_LIMITS.MAX_OLLAMA_CONTEXT} tokens to protect system RAM.`,
    );
    return safeContext.substring(0, HARDWARE_LIMITS.MAX_OLLAMA_CONTEXT * 4);
  }

  return safeContext;
}

/**
 * Isolated provider for the local Qwen 2.5 Coder swarm.
 *
 * @param {string} rolePrompt - The system instructions / agent persona.
 * @param {string} taskContext - The user request or previous agent output.
 * @returns {Promise<string>}
 */
export async function callLocalSwarm(rolePrompt, taskContext) {
  const safeContext = enforceHardwareCap(taskContext);

  const payload = {
    model: 'qwen2.5-coder:7b',
    keep_alive: '1h',
    stream: false,
    options: {
      num_ctx: HARDWARE_LIMITS.MAX_OLLAMA_CONTEXT,
      temperature: 0.1,
    },
    messages: [
      { role: 'system', content: String(rolePrompt ?? '') },
      { role: 'user', content: safeContext },
    ],
  };

  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`[Local AI] Ollama API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data?.message?.content ?? '';
  } catch (error) {
    console.error(
      `[Local AI] Execution Failed for role [${String(rolePrompt ?? '').substring(0, 30)}...]`,
    );
    throw error;
  }
}
