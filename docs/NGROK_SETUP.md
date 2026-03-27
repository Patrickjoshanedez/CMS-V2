# NGROK Setup (Production Compose)

## Prerequisites
- Create an ngrok account.
- Get your ngrok authtoken from the ngrok dashboard.

## 1) Configure `.env.prod`
Set the following keys in `.env.prod`:

- `NGROK_AUTHTOKEN` (required)
- `NGROK_DOMAIN` (optional, if you reserved a static domain)
- `CLIENT_URL` (set this to your public ngrok URL)
- `CORS_ALLOWED_ORIGINS` (include your ngrok URL)

Example:

```env
CLIENT_URL=https://your-subdomain.ngrok-free.app
CORS_ALLOWED_ORIGINS=https://your-subdomain.ngrok-free.app
NGROK_AUTHTOKEN=your_ngrok_token
NGROK_DOMAIN=
```

## 2) Start the ngrok service

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d ngrok
```

## 3) Check ngrok logs

```bash
docker logs -f cms-ngrok-prod
```

## Google Login Note
If Google login is enabled, add your ngrok URL to Google Cloud Console as an **Authorized JavaScript origin** for your OAuth client.
