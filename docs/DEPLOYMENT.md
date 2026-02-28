# Deployment Guide

> Last updated: 2025-07-12

Guide for running the Capstone Management System (CMS) locally and preparing for production deployment.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Running Tests](#running-tests)
- [Building for Production](#building-for-production)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool       | Minimum Version | Purpose                                |
|------------|----------------|----------------------------------------|
| **Node.js** | 18.x           | Runtime for server and client build    |
| **npm**     | 9.x            | Package manager (workspace support)    |
| **MongoDB** | 6.x+           | Database (Atlas or local)              |
| **Git**     | 2.30+          | Version control                        |

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Patrickjoshanedez/CMS-V2.git
cd CMS-V2
```

### 2. Install Dependencies

From the monorepo root (installs all workspace packages — `server`, `client`, `shared`):

```bash
npm install
```

### 3. Configure Environment

Copy the example `.env` file in the server workspace:

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your real values (see [Environment Variables](#environment-variables) below).

### 4. Start Development Servers

Start both server and client concurrently:

```bash
npm run dev
```

Or start them individually:

```bash
npm run dev:server   # Express API at http://localhost:5000
npm run dev:client   # Vite React at http://localhost:5173
```

---

## Environment Variables

All environment configuration lives in `server/.env`. The server validates that required variables exist on startup (see `server/config/env.js`).

### Required Variables

| Variable               | Example                                  | Description                                      |
|------------------------|------------------------------------------|--------------------------------------------------|
| `MONGODB_URI`          | `mongodb+srv://user:pass@host/db`        | MongoDB connection string (Atlas or local)       |
| `JWT_ACCESS_SECRET`    | `your_random_32_char_string`             | Secret for signing JWT access tokens             |
| `JWT_REFRESH_SECRET`   | `another_random_32_char_string`          | Secret for signing JWT refresh tokens            |

### Optional Variables (with defaults)

| Variable               | Default                    | Description                                      |
|------------------------|----------------------------|--------------------------------------------------|
| `NODE_ENV`             | `development`              | `development`, `production`, or `test`           |
| `PORT`                 | `5000`                     | Express server port                              |
| `JWT_ACCESS_EXPIRES_IN`| `15m`                      | Access token TTL (e.g., `15m`, `1h`)             |
| `JWT_REFRESH_EXPIRES_IN`| `7d`                      | Refresh token TTL (e.g., `7d`, `30d`)            |
| `OTP_EXPIRES_MINUTES`  | `10`                       | OTP validity window in minutes                   |
| `SMTP_HOST`            | `smtp.mailtrap.io`         | SMTP server hostname                             |
| `SMTP_PORT`            | `587`                      | SMTP port (`587` for TLS, `465` for SSL)         |
| `SMTP_USER`            | _(empty)_                  | SMTP authentication username                     |
| `SMTP_PASS`            | _(empty)_                  | SMTP authentication password                     |
| `EMAIL_FROM`           | `noreply@cms-buksu.edu.ph` | Sender address for outbound emails               |
| `CLIENT_URL`           | `http://localhost:5173`    | Frontend URL (used for CORS and email links)     |

### Generating Secrets

Use `openssl` or Node.js to generate secure random strings:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Running Tests

The server test suite uses **Vitest** with an in-memory MongoDB instance (no external database needed).

```bash
# Run all tests once
npm run test --workspace=server

# Watch mode (re-runs on file changes)
npm run test:watch --workspace=server
```

**First run note:** `mongodb-memory-server` downloads a MongoDB binary (~780 MB) on its first execution. Subsequent runs reuse the cached binary.

---

## Building for Production

### Client Build

```bash
npm run build --workspace=client
```

This produces optimized static assets in `client/dist/`.

### Server

The server runs Node.js directly — no build step is required. Ensure `NODE_ENV=production` is set.

---

## Production Deployment

### Recommended Architecture

```
┌──────────────┐      ┌───────────────┐      ┌──────────────┐
│   Nginx /    │      │  Node.js      │      │  MongoDB     │
│   Reverse    │─────▶│  Express API  │─────▶│  Atlas       │
│   Proxy      │      │  (port 5000)  │      │              │
└──────┬───────┘      └───────────────┘      └──────────────┘
       │
       │  Serves client/dist/ as static files
       │  Proxies /api/* to Express
```

### Steps

1. **Provision a server** (Ubuntu 22.04 LTS recommended) with Node.js 18+.

2. **Clone and install:**
   ```bash
   git clone https://github.com/Patrickjoshanedez/CMS-V2.git
   cd CMS-V2
   npm ci --production
   ```

3. **Build the client:**
   ```bash
   npm run build --workspace=client
   ```

4. **Configure environment:**
   - Create `server/.env` with production values.
   - Use strong, unique secrets for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
   - Set `NODE_ENV=production`.
   - Set `CLIENT_URL` to the production frontend URL.
   - Configure a production SMTP service (e.g., AWS SES, SendGrid).

5. **Start the server** with a process manager:
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start server/server.js --name cms-api
   pm2 save
   pm2 startup
   ```

6. **Configure Nginx** as a reverse proxy:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       # Serve React static files
       location / {
           root /path/to/CMS-V2/client/dist;
           try_files $uri $uri/ /index.html;
       }

       # Proxy API requests
       location /api/ {
           proxy_pass http://127.0.0.1:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

7. **Enable HTTPS** via Let's Encrypt / Certbot.

### MongoDB Atlas Setup

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Create a database user with read/write permissions.
3. Whitelist your server's IP in Network Access.
4. Copy the connection string into `MONGODB_URI`.

### Security Checklist

- [ ] `NODE_ENV=production` is set
- [ ] JWT secrets are strong, unique, and not shared
- [ ] CORS is restricted to the production frontend URL
- [ ] HTTPS is enabled
- [ ] MongoDB connection uses authentication and TLS
- [ ] SMTP credentials are for a production mail service
- [ ] Rate limiting is active (not in test mode)
- [ ] `npm audit` shows zero critical vulnerabilities

---

## Troubleshooting

| Issue                                  | Solution                                             |
|----------------------------------------|------------------------------------------------------|
| `Missing required environment variable`| Ensure all required vars are set in `server/.env`    |
| `ECONNREFUSED` on port 5000           | Check the server is running and the port is free     |
| MongoDB connection timeout             | Verify `MONGODB_URI`, network access, and IP whitelist |
| SMTP errors in production              | Verify SMTP credentials and port; test with Mailtrap first |
| Tests timeout on first run             | MongoMemoryServer is downloading the binary — wait ~2 min |
| `EADDRINUSE` port conflict             | Kill the process using the port: `npx kill-port 5000` |
