# 2026-04-06 Incident Notes

- Mixed `docker-compose.yml` + `docker-compose.prod.yml` caused cross-network DNS failure and nginx `502` for `/api`, `/socket.io`, and avatar upload paths.
- `rebuild-prod.ps1` should fail closed on mixed-compose labels via dynamic project-name resolution, and must enforce `cms-server` absence.
- Public exposure preflight must reject default-like `NGROK_BASIC_AUTH` values, not only empty values.
- Post-fix verification bundle: `/api/health` `200`, `/socket.io` polling `200`, `/vite.svg` `200`, `/api/users/me/avatar` non-`502`, and client/server on shared network.
