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

### 4. Start development servers

```bash
npm run dev
```

This starts both the Express server (port 5000) and the Vite dev server (port 5173) concurrently. The client proxies `/api` requests to the backend.

### 5. Access the application

- **Frontend:** <http://localhost:5173>
- **API:** <http://localhost:5000/api>
- **Health check:** <http://localhost:5000/api/health>

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
