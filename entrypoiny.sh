#!/bin/bash

# 1. Start Ollama in the background
/bin/ollama serve &
PID=$!

# 2. Wait for Ollama to wake up
echo "Waiting for Ollama service to start..."
while ! curl -s http://localhost:11434/ > /dev/null; do
    sleep 1
done

# 3. Pull the target models
echo "Pulling models..."
ollama pull nomic-embed-text-v2-moe:latest
ollama pull llama3.2:3b

# 4. Keep the container alive by waiting on the Ollama process
wait $PID