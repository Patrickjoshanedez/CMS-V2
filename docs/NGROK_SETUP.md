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

Fail-closed preflight (must fail if both profiles are requested together):

```bash
COMPOSE_PROFILES="public-exposure"
if printf '%s' "$COMPOSE_PROFILES" | grep -Eq '(^|,)public-exposure(,|$)' \
	&& printf '%s' "$COMPOSE_PROFILES" | grep -Eq '(^|,)localstack-testing(,|$)'; then
	echo "ERROR: public-exposure and localstack-testing cannot be active together."
	exit 1
fi
```

```bash
PUBLIC_EXPOSURE_MODE=true docker compose --env-file .env.prod -f docker-compose.prod.yml --profile public-exposure up -d --build
```

Do not use ngrok-only/client-only starts or `--no-deps` in production. Always bring up the full production stack to keep `client` and `server` on the same compose network.

## 3) Check ngrok logs

```bash
docker logs -f cms-ngrok-prod
```

## Google Login Note
If Google login is enabled, add your ngrok URL to Google Cloud Console as an **Authorized JavaScript origin** for your OAuth client.

## LocalStack S3 Tunnel (Testing Only)

Use this mode when mobile apps or external webhooks must access LocalStack-backed S3 presigned URLs.

Requirements:
- Start the optional LocalStack testing profile in production compose.
- Use path-style addressing (`S3_FORCE_PATH_STYLE=true`).
- Set `S3_PUBLIC_URL` to the ngrok URL used for the LocalStack tunnel.

Suggested `.env.prod` values for this mode:

```env
S3_ENDPOINT=http://localstack:4566
S3_ACCESS_KEY_ID=test
S3_SECRET_ACCESS_KEY=test
S3_FORCE_PATH_STYLE=true
S3_PUBLIC_URL=https://your-ngrok-domain.ngrok-free.app
NGROK_LOCALSTACK_DOMAIN=your-ngrok-domain.ngrok-free.app
```

Run:

```bash
PUBLIC_EXPOSURE_MODE=false docker compose --env-file .env.prod -f docker-compose.prod.yml --profile localstack-testing up -d
```

Notes:
- `localstack-ngrok` forwards to `localstack:4566` on the same compose network.
- If `NGROK_LOCALSTACK_DOMAIN` is set, ngrok runs with `--domain` for a stable URL.
- `S3_PUBLIC_URL` with `S3_FORCE_PATH_STYLE=false` is rejected by the server to prevent invalid presigned URLs.
