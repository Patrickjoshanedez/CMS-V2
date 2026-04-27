# CMS V2 — Capstone Management System

A full-stack **Capstone Management and Archiving System** with plagiarism checking, built for the BukSU IT Department. MERN stack (MongoDB, Express, React, Node.js) with role-based access control for Students, Advisers, Panelists, and Instructors.

---

## Tech Stack

| Layer    | Technology                                                 |
| -------- | ---------------------------------------------------------- |
| Frontend | React 18 + Vite 6, Tailwind CSS 3.4, Zustand, React Query |
| Backend  | Node.js + Express 4.21, Mongoose 8.9 (MongoDB)            |
| Auth     | JWT (HTTP-only cookies), refresh token rotation, OTP       |
| Shared   | `@cms/shared` workspace package (roles, status codes)      |
| Styling  | shadcn/ui-compatible CSS custom properties (dark/light)    |

---

## Plagiarism Pipeline

The plagiarism checker now runs as a native Node.js workflow in this monorepo.

- Queue + worker orchestration: `server/jobs/plagiarism.job.js` (BullMQ + Redis)
- Core scoring engine: `server/services/plagiarism.service.js` (winnowing fingerprints + span-union scoring)
- Inverted index candidate retrieval: `server/services/fingerprintIndex.service.js`
- Fingerprint persistence model: `server/modules/plagiarism/documentFingerprint.model.js`

This architecture avoids full corpus scans for each request and does not require an external Python plagiarism microservice for the active check path.

---

## Project Structure

```text
CMS V2/
├── client/                   # React frontend (Vite)
│   └── src/
│       ├── components/       # UI components (layouts, ui primitives, theme)
│       ├── pages/            # Route pages (auth, dashboard)
│       ├── services/         # Axios API layer
│       ├── stores/           # Zustand state management
│       └── lib/              # Utility functions
├── server/                   # Express backend
│   ├── config/               # Environment & database config
│   ├── middleware/            # Auth, validation, error handling, rate limiting
│   ├── modules/              # Feature modules
│   │   ├── auth/             # Registration, login, OTP, refresh tokens
│   │   ├── users/            # User CRUD, profile management
│   │   ├── teams/            # Team creation, invites, locking
│   │   └── notifications/    # In-app notifications, email service
│   └── utils/                # AppError, catchAsync, token helpers
├── shared/                   # Shared constants (roles, HTTP status codes)
├── docs/                     # Project documentation
└── package.json              # Root workspace config
```

---

## Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x (uses npm workspaces)
- **MongoDB** >= 6.x (local or Atlas)
- **SMTP server** for email (e.g., Gmail App Password, Mailtrap)

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd "CMS V2"
```

### 2. Install dependencies

From the root directory (installs all workspaces):

```bash
npm install
```

### 3. Configure environment variables

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your MongoDB URI, JWT secrets, and SMTP credentials. Refer to the `.env.example` file for all required variables.

### Google Sign-In setup (prevents Error 400: origin_mismatch)

If Google login is enabled, configure both frontend and Google Cloud Console:

1. Set `VITE_GOOGLE_CLIENT_ID` in `client/.env`.
2. Set `GOOGLE_AUTH_CLIENT_ID` in `server/.env` to the same value.
3. In Google Cloud Console: `APIs & Services > Credentials > OAuth 2.0 Client IDs > <your web client>`.
4. Add every frontend origin you actually use to `Authorized JavaScript origins`, for example:

   - `http://localhost:43211`
   - `http://127.0.0.1:43211`
   - `https://<your-ngrok-subdomain>.ngrok-free.dev`

Important:

- Google matches origin exactly (`scheme + host + port`).
- Wildcards are not supported for OAuth JavaScript origins.
- After edits, restart the client dev server/container.

### 4. Start development servers

```bash
npm run dev
```

This starts both the Express server (port 43210) and the Vite dev server (port 43211) concurrently. The client proxies `/api` requests to the backend.

### 5. Access the application

- **Frontend:** <http://localhost:43211>
- **API:** <http://localhost:43210/api>
- **Health check:** <http://localhost:43210/api/health>

---

## Docker (Development)

This repository now includes a Docker development stack for the full workspace (npm workspaces supported).

Operational rule: this repo contains both `compose.yaml` and `docker-compose.yml`. For the full CMS runtime, always run Docker Compose with `-f docker-compose.yml` explicitly.

### Services

- `client` (Vite React app) → <http://localhost:43211>
- `server` (Express API) → <http://localhost:43210>
- `mongodb` (MongoDB 7) → internal container network
- `redis` (Redis 7) → internal container network

### Start

```bash
docker compose -f docker-compose.yml up --build
```

### Stop

```bash
docker compose -f docker-compose.yml down
```

To also remove database/cache volumes:

```bash
docker compose -f docker-compose.yml down -v
```

## Docker (Production-like)

The production stack builds optimized images:

- `client`: multi-stage Vite build served by Nginx
- `server`: Node.js production runtime (`npm run start --workspace=server`)
- `mongodb`, `redis`: internal services

### Start

```bash
cp .env.prod.example .env.prod
```

Edit `.env.prod` with real secrets/config, then run:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Open the app at <http://localhost:8080>.

### Stop

```bash
docker compose -f docker-compose.prod.yml down
```

### Environment variables

The production compose file reads values from `.env.prod` via `env_file`. At minimum, set:

- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `MONGODB_URI` (optional if using included `mongodb` service)

For email, S3, reCAPTCHA, and Google integrations, set the corresponding env vars from `server/.env.example`.

---

## LAN Deployment (Demo with Classmates)

Share the running app with anyone on the same Wi-Fi / LAN — one command does everything:

### Prerequisites

- **Docker Desktop** running
- **PowerShell** opened **as Administrator** (right-click → *Run as Administrator*)

### Deploy

```powershell
.\lan-deploy.ps1
```

The script automatically:

1. Detects your LAN IP address
2. Creates `.env.prod` from the example template (if missing)
3. Sets `CLIENT_URL` to your LAN IP for CORS
4. Generates a Docker Compose LAN override file
5. Opens Windows Firewall port 8080
6. Builds & starts the production containers
7. Runs a health check and prints the URLs

After it finishes, share the printed URL (e.g. `http://192.168.1.5:8080`) with your classmates.

### Restart (without rebuilding)

```powershell
.\lan-deploy.ps1 -SkipBuild
```

### Stop

```powershell
.\lan-deploy.ps1 -Stop
```

### Full cleanup (removes database data too)

```powershell
.\lan-deploy.ps1 -Clean
```

### View logs

```powershell
docker compose -f docker-compose.prod.yml -p cms-v2-lan logs -f
```

---

## Available Scripts

| Script               | Description                              |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Start both client and server in dev mode |
| `npm run dev:server` | Start only the Express server            |
| `npm run dev:client` | Start only the Vite dev server           |
| `npm run build`      | Build the client for production          |
| `npm run lint`       | Run ESLint across all packages           |
| `npm run format`     | Run Prettier to format all files         |

---

## User Roles

| Role         | Description                                        |
| ------------ | -------------------------------------------------- |
| `student`    | Works in teams, submits documents, tracks progress |
| `adviser`    | Guides teams, reviews chapters, approves revisions |
| `panelist`   | Reviews drafts, selects topics, evaluates defenses |
| `instructor` | Admin — manages the capstone process and archive   |

---

## API Endpoints (Phase 1)

### Authentication (`/api/auth`)

| Method | Endpoint            | Description                |
| ------ | ------------------- | -------------------------- |
| POST   | `/register`         | Register a new student     |
| POST   | `/login`            | Login with email/password  |
| POST   | `/verify-otp`       | Verify email via OTP       |
| POST   | `/resend-otp`       | Resend verification OTP    |
| POST   | `/refresh`          | Refresh access token       |
| POST   | `/logout`           | Logout (revoke tokens)     |
| POST   | `/forgot-password`  | Request password reset OTP |
| POST   | `/reset-password`   | Reset password with OTP    |

### Users (`/api/users`) — requires authentication

| Method | Endpoint       | Description                | Access        |
| ------ | -------------- | -------------------------- | ------------- |
| GET    | `/me`          | Get current user profile   | All roles     |
| PATCH  | `/me`          | Update own profile         | All roles     |
| GET    | `/`            | List all users (paginated) | Instructor    |
| POST   | `/`            | Create a new user          | Instructor    |
| PATCH  | `/:id`         | Update a user              | Instructor    |
| PATCH  | `/:id/role`    | Change user's role         | Instructor    |
| DELETE | `/:id`         | Soft-delete a user         | Instructor    |

### Teams (`/api/teams`) — requires authentication

| Method | Endpoint                  | Description              | Access           |
| ------ | ------------------------- | ------------------------ | ---------------- |
| POST   | `/`                       | Create a new team        | Student          |
| GET    | `/me`                     | Get own team details     | All roles        |
| POST   | `/:id/invite`             | Invite member by email   | Student (leader) |
| POST   | `/invites/:token/accept`  | Accept team invite       | Any authenticated|
| POST   | `/invites/:token/decline` | Decline team invite      | Any authenticated|
| PATCH  | `/:id/lock`               | Lock team membership     | Leader/Instructor|
| GET    | `/`                       | List all teams           | Instructor/Adviser |

### Notifications (`/api/notifications`) — requires authentication

| Method | Endpoint       | Description                    |
| ------ | -------------- | ------------------------------ |
| GET    | `/`            | Get paginated notifications    |
| PATCH  | `/:id/read`    | Mark one notification as read  |
| PATCH  | `/read-all`    | Mark all as read               |
| DELETE | `/:id`         | Delete one notification        |
| DELETE | `/`            | Clear all notifications        |

---

## Security Features

- **JWT in HTTP-only cookies** — tokens never exposed to JavaScript
- **Refresh token rotation** — old tokens revoked on reuse (detects theft)
- **Rate limiting** — auth endpoints: 10/15min, OTP: 3/10min, general: 100/15min
- **Helmet.js** — secure HTTP headers
- **bcrypt** — password hashing (12 salt rounds)
- **OTP hashing** — 6-digit codes are bcrypt-hashed before storage
- **CORS** — restricted to configured CLIENT_URL origin
- **Input validation** — Zod schemas on all request bodies

---

## Documentation

- [Phase 1 Strategy](docs/PHASE_1_STRATEGY.md) — Sprint plan, DB design, API spec, risk register
- [Database Schema](docs/DATABASE.md) — MongoDB collections and relationships
- [API Reference](docs/API.md) — Detailed endpoint documentation
- [Architecture](docs/ARCHITECTURE.md) — System design and data flow

---

## License

This project is developed as a capstone requirement for BukSU IT Department. All rights reserved.
