#!/bin/bash

# 1. Start Ollama in the background
/bin/ollama serve &
PID=$!

# 2. Wait for Ollama to wake up
echo "Waiting for Ollama service to start..."
while ! ollama list > /dev/null 2>&1; do
    sleep 1
done

# 3. Pull the target models only if missing
echo "Checking Ollama model cache..."
if ! ollama list | grep -q "nomic-embed-text-v2-moe"; then
    echo "Pulling nomic-embed-text-v2-moe:latest..."
    ollama pull nomic-embed-text-v2-moe:latest || echo "WARN: nomic-embed pull failed (non-fatal)"
else
    echo "Model nomic-embed-text-v2-moe is already cached."
fi

if ! ollama list | grep -q "llama3.2"; then
    echo "Pulling llama3.2:3b..."
    ollama pull llama3.2:3b || echo "WARN: llama3.2 pull failed (non-fatal)"
else
    echo "Model llama3.2:3b is already cached."
fi

echo "All models ready."

# 4. Keep the container alive by waiting on the Ollama process
wait $PID
