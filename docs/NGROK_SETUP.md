# NGROK Setup (Production Compose)

> Last updated: 2026-04-02

## Prerequisites
- Create an ngrok account.
- Get your ngrok authtoken from the ngrok dashboard.

## Public Internet Exposure Gate (Required, Fail Closed)

Do not expose CMS publicly unless all checks below are verified and documented.

1. Production compose only (`docker-compose.prod.yml`).
2. Secret hygiene: no tracked plaintext production secrets, no secret env values baked into image context.
3. Placeholder/default secrets blocked.
4. Effective rate limiter active globally and on auth routes.
5. ngrok ingress auth policy enabled (OAuth/basic auth) with explicit domain policy.
6. CORS uses exact public origin values (no wildcard/ambiguous values).
7. `trust proxy` and secure/`SameSite` cookie settings are compatible.
8. No LocalStack/test object storage in public production profile.
9. Least-privilege container runtime controls are applied where feasible.
10. Verification summary includes explicit evidence mapping for checks 1-10; fail closed if missing.

Required verification summary contract:

```text
Public Internet Exposure Gate: PASS
GATE-1: <evidence>
GATE-2: <evidence>
GATE-3: <evidence>
GATE-4: <evidence>
GATE-5: <evidence>
GATE-6: <evidence>
GATE-7: <evidence>
GATE-8: <evidence>
GATE-9: <evidence>
GATE-10: <evidence mapping completeness statement>
```

## 1) Configure `.env.prod`
Set the following keys in `.env.prod`:

- `NGROK_AUTHTOKEN` (required)
- `NGROK_DOMAIN` (required)
- `NGROK_OAUTH_PROVIDER` (preferred for OAuth)
- `NGROK_OAUTH_ALLOW_EMAILS` (conditionally required with OAuth, comma-separated)
- `NGROK_OAUTH_ALLOW_DOMAINS` (conditionally required with OAuth, comma-separated)
- `NGROK_BASIC_AUTH` (fallback only when OAuth provider is not set)
- `CLIENT_URL` (set this to your public ngrok URL)
- `CORS_ALLOWED_ORIGINS` (include your ngrok URL)

OAuth-first example (preferred):

```env
CLIENT_URL=https://your-subdomain.ngrok-free.dev
CORS_ALLOWED_ORIGINS=https://your-subdomain.ngrok-free.dev
NGROK_AUTHTOKEN=your_ngrok_token
NGROK_DOMAIN=your-subdomain.ngrok-free.dev
NGROK_OAUTH_PROVIDER=google
NGROK_OAUTH_ALLOW_EMAILS=alice@example.com,bob@example.com
NGROK_OAUTH_ALLOW_DOMAINS=example.com
```

Basic auth fallback example:

```env
CLIENT_URL=https://your-subdomain.ngrok-free.dev
CORS_ALLOWED_ORIGINS=https://your-subdomain.ngrok-free.dev
NGROK_AUTHTOKEN=your_ngrok_token
NGROK_DOMAIN=your-subdomain.ngrok-free.dev
NGROK_BASIC_AUTH=your_username:your_strong_password
```

Fail-closed policy:
- `NGROK_AUTHTOKEN` and `NGROK_DOMAIN` must always be set.
- If `NGROK_OAUTH_PROVIDER` is set, at least one of `NGROK_OAUTH_ALLOW_EMAILS` or `NGROK_OAUTH_ALLOW_DOMAINS` must be set.
- If `NGROK_OAUTH_PROVIDER` is not set, `NGROK_BASIC_AUTH` is required.

## 2) Start the full production stack with public exposure profile

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml --profile public-exposure up -d --build
```

Do not use ngrok-only/client-only starts or `--no-deps` in production. Always bring up the full production stack to keep `client` and `server` on the same compose network.

## 3) Check ngrok logs

```bash
docker logs -f cms-ngrok-prod
```

## Google Login Note
If Google login is enabled, add your ngrok URL to Google Cloud Console as an **Authorized JavaScript origin** for your OAuth client.
