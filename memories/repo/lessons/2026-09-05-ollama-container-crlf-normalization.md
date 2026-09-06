# Lesson: Ollama Container Stability & Shell Script CRLF Normalization

## Incident Summary
The `cms-ollama` Docker container entered a continuous crash-loop state (`STATUS: Restarting (2)`). Container logs revealed repeating syntax errors:
```
/entrypoint.sh: line 2: $'\r': command not found
/entrypoint.sh: line 4: $'\r': command not found
/entrypoint.sh: line 6: $'\r': command not found
/entrypoint.sh: line 33: syntax error: unexpected end of file
```

## Root Cause Analysis
The `./entrypoint.sh` file mounted into `cms-ollama` from the host filesystem had Windows CRLF (`\r\n`) line terminators. When the Linux bash interpreter inside `ollama/ollama:latest` parsed the script, `\r` carriage returns were evaluated as literal command names (`$'\r'`) and corrupted bash control structures (`if ... then ... fi`, `while ... do ... done`), triggering an immediate exit with code 1.

## Prevention & Runbook Checklist
1. **Checklist**: Before mounting any host shell script (`.sh`) into a container, verify syntax with `bash -n` and ensure line endings are strictly LF (`\n`).
2. **Prevention**: Added `.gitattributes` enforcing `*.sh text eol=lf` to prevent Windows git checkouts from altering LF line terminators.
3. **Runbook**:
   - Step 1: Diagnose container stability via `docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"`.
   - Step 2: Inspect failing container logs with `docker logs <container_name> --tail 50`.
   - Step 3: Check for CR bytes: `node -e "console.log(fs.readFileSync('entrypoint.sh').filter(b => b === 13).length)"`.
   - Step 4: Normalize to LF: `content.replace(/\r\n/g, '\n')`.
   - Step 5: Test syntax inside a container: `docker run --rm -v "${PWD}/entrypoint.sh:/test.sh" bash:5 bash -n /test.sh`.
   - Step 6: Restart container: `docker restart <container_name>`.
   - Step 7: Probe HTTP endpoints: `curl http://localhost:11434/api/tags`.

## Verification Evidence
- `entrypoint.sh` bash syntax check passed with exit code 0.
- `cms-ollama` container status updated from `Restarting` to `Up (healthy)` with `RestartCount=0`.
- All 10 project containers (`cms-mongodb`, `cms-redis`, `cms-plagiarism-redis`, `cms-minio`, `cms-server`, `cms-client`, `cms-plagiarism-api`, `cms-plagiarism-worker`, `cms-ngrok-dev`, `cms-ollama`) verified running and healthy.
- Ollama inference tests passed with HTTP 200 responses from models `llama3.2:3b` and `nomic-embed-text-v2-moe:latest`.
