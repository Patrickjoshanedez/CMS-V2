# Docker Refactor Speed and Sync (2026-04-11)

- Use workspace-targeted npm installs in Dockerfiles (`--workspace=... --include-workspace-root=false`) to reduce install time and image size.
- Keep production/service-specific Docker contexts minimal (`COPY server ./server`, `COPY client ./client`, `COPY shared ./shared`) to maximize layer cache reuse.
- In Docker Compose networks, route inter-service traffic by service name (for example `client:80`) rather than container_name aliases.
- Add consistent healthchecks + `depends_on.condition: service_healthy` to avoid startup race conditions.
- Revert generated hook cache/state artifacts (`.pyc`, hook state JSON timestamps) before finalizing to keep diffs clean.
