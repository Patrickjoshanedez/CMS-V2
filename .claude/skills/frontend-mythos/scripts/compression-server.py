"""
LLMLingua-2 Local Token Compression Microservice
Provides ultra-fast, local prompt & log compression for LLM agent loops.
Preserves critical code and HTML/DOM structural tokens.
"""

import re
from typing import List, Optional
from fastapi import FastAPI
from pydantic import BaseModel

try:
    from llmlingua import PromptCompressor
    HAS_LLMLINGUA = True
except ImportError:
    HAS_LLMLINGUA = False

app = FastAPI(title="Mythos Token Compression API", version="1.0.0")

# Critical structural tokens preserved during code & DOM compression
STRUCTURAL_FORCE_TOKENS = [
    '\n', '\t', ' ', '{', '}', '[', ']', '(', ')',
    '<', '>', '/', '=', ':', '"', "'", 'class', 'id',
    'role', 'aria-', 'data-testid', 'div', 'button', 'span'
]

# Fallback regex pruner when LLMLingua is loading or unavailable
def heuristic_dom_and_log_compressor(raw_text: str, target_rate: float = 0.3) -> str:
    """Heuristic compression: strips repetitive stack traces, SVGs, and duplicate lines."""
    lines = raw_text.splitlines()
    unique_lines = []
    seen = set()

    for line in lines:
        cleaned = line.strip()
        # Collapse massive SVG path coordinates
        if '<path' in cleaned and 'd="' in cleaned:
            cleaned = re.sub(r'd="[^"]+"', 'd="[svg-path]"', cleaned)
        # Collapse base64 data URLs
        if 'data:image/' in cleaned:
            cleaned = re.sub(r'data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+', '[base64-data]', cleaned)

        # Skip duplicate React or Webpack warning lines
        norm = re.sub(r'at\s+.+?:\d+:\d+', '', cleaned)
        if norm in seen and len(norm) > 15:
            continue
        seen.add(norm)
        unique_lines.append(cleaned)

    result = '\n'.join(unique_lines)
    return result

# Lazy compressor holder
compressor_instance = None

def get_compressor():
    global compressor_instance
    if HAS_LLMLINGUA and compressor_instance is None:
        try:
            compressor_instance = PromptCompressor(
                model_name="microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank",
                use_llmlingua2=True,
            )
        except Exception as e:
            print(f"[Compression Server] Error initializing LLMLingua-2: {e}")
    return compressor_instance

class CompressionPayload(BaseModel):
    text: str
    target_rate: float = 0.33  # Target 33% of original token count
    force_tokens: Optional[List[str]] = None
    is_dom_tree: bool = False

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "llmlingua_loaded": HAS_LLMLINGUA and get_compressor() is not None,
    }

@app.post("/compress")
def compress_text(payload: CompressionPayload):
    text = payload.text
    if not text or len(text.strip()) == 0:
        return {"compressed_text": "", "original_tokens": 0, "compressed_tokens": 0, "ratio": 1.0}

    # Pre-clean DOM tree if specified
    if payload.is_dom_tree:
        text = heuristic_dom_and_log_compressor(text, payload.target_rate)

    compressor = get_compressor()
    if compressor is not None:
        try:
            force_tokens = payload.force_tokens or STRUCTURAL_FORCE_TOKENS
            result = compressor.compress_prompt(
                text,
                rate=payload.target_rate,
                force_tokens=force_tokens,
                drop_consecutive=True,
            )
            return {
                "compressed_text": result["compressed_prompt"],
                "original_tokens": result.get("origin_tokens", len(text.split())),
                "compressed_tokens": result.get("compressed_tokens", len(result["compressed_prompt"].split())),
                "ratio": result.get("ratio", payload.target_rate),
            }
        except Exception as err:
            print(f"[Compression Server] Compression failed, falling back to heuristic: {err}")

    # Fallback to heuristic compression
    compressed = heuristic_dom_and_log_compressor(text, payload.target_rate)
    return {
        "compressed_text": compressed,
        "original_tokens": len(text.split()),
        "compressed_tokens": len(compressed.split()),
        "ratio": round(len(compressed.split()) / max(1, len(text.split())), 2),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
