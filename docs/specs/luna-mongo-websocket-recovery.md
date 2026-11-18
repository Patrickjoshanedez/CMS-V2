# Luna medium — MongoMemoryServer and WebSocket recovery

## Verified diagnosis (27 October 2026)

The repeated failures have a confirmed execution-permission cause. Do not begin by changing MongoDB versions, weakening authorization, or increasing timeouts.

| Probe or suite | Restricted runtime | Approved localhost execution |
| --- | --- | --- |
| Isolated HTTP/WebSocket probe | HTTP connection fails with `connect EACCES 127.0.0.1:<port>` | HTTP and WebSocket both pass |
| Cached MongoDB 8.2.6 | `mongod --version` passes; startup aborts with `fassert()` | Starts successfully in 4,813 ms and stops |
| `tests/unit/socket.service.test.js` | Transport fails before authorization can be evaluated | **5/5 passed**, 5.71 seconds |
| `tests/integration/documentExtraction.async.test.js` | Earlier runs timed out in database setup | **6/6 passed**, 64.79 seconds total |
| Live backend `127.0.0.1:43210` | Not accessible from restricted probe | Engine.IO WebSocket opens; missing-token Socket.IO connection is rejected |
| Live Vite proxy `127.0.0.1:43211` | Not accessible from restricted probe | Same successful transport and expected missing-token rejection |

The paired probe establishes that MongoDB 8.2.6 works on this host with the needed execution permissions. It does not identify the internal assertion's exact syscall. Browser login, token renewal, room delivery, and the external tunnel were not exercised by the unauthenticated live probe.

Diagnostic tool: `scratch/audit-runtime-probe.mjs` (`ws`, `mongo 8.2.6`, or `live`). Each run owns and closes its temporary resources and has a 110-second watchdog. Startup debug log: `scratch/mongo-runtime-probe.log` (ephemeral supporting evidence).

## Your task, Luna

Preserve the existing dirty checkout and the 13 audit repairs. Read AGENTS.md and the verification-loop skill. Execute the following tasks in order, one test process at a time. Do not point tests at the running CMS MongoDB container or its database.

### 1. Use a localhost-capable test runner

1. Run the isolated probe before a database or socket suite. If it reports `EACCES`, obtain approval to run that exact targeted command with localhost networking, or run it in an already authorized local terminal/CI runner. Do not repeatedly retry inside the restricted runtime.
2. Keep `TEMP`/`TMP` under the workspace scratch directory for the Windows Vitest cache. Directory creation must happen before resolving it.
3. The installed MongoMemoryServer package currently defaults to 8.2.6; that cached binary was verified. An installation can use `MONGOMS_VERSION` to select its tested version, and `MONGOMS_SYSTEM_BINARY` to supply a binary path. Never hardcode this user's cache path into repository code.
4. Set `MONGOMS_RUNTIME_DOWNLOAD=false` only after checking that the selected binary is installed. If missing, download/provision it in a separate bounded bootstrap step, then run the suite. An absent binary is a provisioning failure, not a test assertion failure.
5. Do not disable Windows Firewall, change system security policy, disable TLS/checksums, edit secret files, or alter production database settings to repair the test runner.

Run these commands in an approved localhost-capable PowerShell session from the repository root:

```powershell
$testTempPath = Join-Path (Get-Location) 'scratch/audit-runtime-temp'
New-Item -ItemType Directory -Force -Path $testTempPath | Out-Null
$env:TEMP = (Resolve-Path $testTempPath).Path
$env:TMP = $env:TEMP
$env:MONGOMS_RUNTIME_DOWNLOAD = 'false'

node scratch/audit-runtime-probe.mjs ws
node scratch/audit-runtime-probe.mjs mongo 8.2.6

npm test --workspace=server -- tests/unit/socket.service.test.js --testTimeout=10000 --hookTimeout=15000 --pool=threads --maxWorkers=1
npm test --workspace=server -- tests/integration/documentExtraction.async.test.js --testTimeout=15000 --hookTimeout=30000 --pool=threads --maxWorkers=1
```

Run the commands separately and inspect each exit result. Stop any command still running at 110 seconds; diagnose it before another attempt.

### 2. Make database startup failures easy to diagnose

Targets: `server/tests/setup.js` and `server/vitest.config.js`.

- Preserve the existing unit-test bypass and isolated database cleanup.
- Own the MongoMemoryServer instance before awaiting startup: construct it, assign it to the teardown variable, then call `start()`. Ensure startup failure and teardown both stop that owned instance.
- Log bounded startup stages and elapsed time: binary resolution, instance startup, and Mongoose connection. Print error name/code/message and a bounded diagnostic tail on failure; never print environment secrets or account tokens.
- Give Mongoose explicit short connection/server-selection deadlines. Keep the Mongo launch deadline inside the hook deadline and both inside the 110-second command budget. Do not use an uncancelled `Promise.race()` that leaves a child `mongod` running.
- The successful API run spent about 41 seconds importing modules and 17 seconds in hooks/tests. Separate module-import slowness from database-startup timing; a long total duration alone does not prove a Mongo crash.
- Validate cleanup after failed startup as well as success. Stop only child processes owned by this run; never kill all Node or MongoDB processes.

### 3. Fix the remaining authenticated WebSocket lifecycle gap

Confirmed source gap: `server/services/socket.service.js` expires a token with `socket.disconnect(true)`. `client/src/hooks/useSocket.js` handles connection errors and Manager reconnection events, but does not refresh the session and reconnect after this server-initiated disconnect. Reconnection settings in `client/src/services/socket.js` do not repair that case automatically.

Targets: `server/services/socket.service.js`, `client/src/services/socket.js`, `client/src/hooks/useSocket.js`, and `client/src/services/api.js`.

1. Define structured reasons for ordinary access-token expiry and irreversible session invalidation. Preserve session-version checks, current-account checks, project-room permissions, and immediate invalidation on logout/password/account changes.
2. For ordinary expiry, refresh through the same single-flight coordinator used by HTTP requests. `api.js` already has `isRefreshing`/`failedQueue`; reuse or extract that coordinator. Do not create a second independent refresh pipeline that races refresh-token rotation.
3. After a successful refresh updates the HTTP-only cookies, call `socket.connect()` explicitly once. Do not copy JWTs into localStorage or expose them in logs.
4. End recovery cleanly on logout, deactivation, verification loss, session-version mismatch, or refresh failure. Never loop refresh/reconnect requests after these failures.
5. Rejoin authorized project subscriptions on the new connection. The server must authorize them again. Keep event handlers registered once, and remove timers/listeners when authentication ends or the hook unmounts.
6. Complete the test connection helper: the unrelated-faculty case in `server/tests/unit/socket.service.test.js` still calls the generic `waitForEvent(..., 'connect')`; use the connection helper that rejects immediately on `connect_error`. Clean up listeners on success, failure, and timeout.

### 4. Verify behavior without weakening the tests

- Approved-runner socket suite: all existing assignment, denial, and stale-session assertions pass.
- Controlled expiry test: valid connection expires, one refresh occurs, socket reconnects with current cookies, and authorized room delivery resumes.
- HTTP 401 and socket expiry at the same time: one refresh request; no duplicate token rotation or global logout from an ordinary race.
- Invalidated/deactivated account: no successful refresh or protected event delivery; recovery stops.
- Failed startup/failed handshake: bounded errors and no leaked test child processes, sockets, or listeners.
- Run evaluation and plagiarism-approval integration suites individually with the same approved database runner. Previous setup-blocked runs are not application failures or passes.
- If user-facing connection messages change in `client/src/`, perform the repository's light/dark and desktop/mobile visual verification. Keep all frontend service/hook tests targeted.

### 5. Investigate a live browser/tunnel failure only if it remains

The local backend and Vite WebSocket paths already worked in the follow-up probe. Do not change their proxy configuration without a new reproduction.

Capture sanitized client `connect_error` message/description and server Engine.IO error code. Compare direct backend, Vite proxy, then the actual external origin. Distinguish transport HTTP 400 from Socket.IO authentication rejection. Inspect `client/vite.config.js`, cookie domain/SameSite/Secure behavior, and the actual proxy/tunnel only when the failing layer is identified. Keep cookies, JWTs, request authorization headers, and secrets out of diagnostics.

## Completion evidence

Update `docs/specs/system-flaw-audit-luna-medium.md` with terminal results and current source scope. Report the runner permission used, binary version, startup time, focused test counts, client expiry/reconnect behavior, and any remaining live-browser limitation. Keep old failed runs as history. Do not mark unexecuted approval/evaluation/browser flows passed.

References: [MongoMemoryServer configuration](https://typegoose.github.io/mongodb-memory-server/docs/api/config-options/), [Socket.IO client lifecycle](https://socket.io/docs/v4/client-socket-instance/), and [connection troubleshooting](https://socket.io/docs/v4/troubleshooting-connection-issues/). Server-denied connections require an explicit reconnect; transport errors and authentication rejection need different recovery decisions.
