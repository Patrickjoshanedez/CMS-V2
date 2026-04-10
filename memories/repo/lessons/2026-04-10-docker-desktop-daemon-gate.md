# Lesson: Docker Desktop Daemon Gate (Windows)

- Scenario: docker compose recreation failed because the `//./pipe/dockerDesktopLinuxEngine` endpoint was unavailable on Windows (Docker daemon not ready).
- Attempted recoveries:
  - Tried starting `com.docker.service` (service access/open failure).
  - Launched Docker Desktop executable, but daemon remained unavailable.
- Prevention rule: before any compose lifecycle command (`docker compose down|up|ps`), run `docker info` and require success. If it fails, prompt the user to fully start Docker Desktop and retry only after daemon readiness is confirmed.
