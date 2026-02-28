# Contributing — CMS V2

## Getting Started

1. Clone the repository and install dependencies from the root:
   ```bash
   npm install
   ```
2. Copy the environment template and fill in your values:
   ```bash
   cp server/.env.example server/.env
   ```
3. Start development:
   ```bash
   npm run dev
   ```

---

## Project Conventions

### Monorepo Layout

This project uses **npm workspaces** with three packages:

- `server/` — Express backend
- `client/` — React frontend (Vite)
- `shared/` — Constants shared between client and server (`@cms/shared`)

Always install dependencies from the **root** directory:

```bash
# Add to a specific workspace
npm install <package> -w server
npm install <package> -w client
```

### Code Style

- **ESLint** + **Prettier** are configured at the root
- Run `npm run lint` before committing
- Run `npm run format` to auto-format
- Single quotes, trailing commas, 100-char line width, semicolons

### File Naming

| Type        | Convention         | Example                    |
| ----------- | ------------------ | -------------------------- |
| Components  | PascalCase.jsx     | `LoginPage.jsx`            |
| Services    | camelCase.js       | `authService.js`           |
| Models      | singular.model.js  | `user.model.js`            |
| Validation  | module.validation.js | `auth.validation.js`     |
| Controllers | module.controller.js | `auth.controller.js`     |
| Routes      | module.routes.js   | `auth.routes.js`           |
| Constants   | camelCase.js       | `statusCodes.js`           |

### Server Module Pattern

Each feature module has 4 files:

```
modules/feature/
├── feature.validation.js   # Zod schemas
├── feature.service.js      # Business logic
├── feature.controller.js   # HTTP handlers (thin)
└── feature.routes.js       # Express router
```

Controllers should be thin — delegate all logic to services.

### Frontend Component Pattern

```jsx
// Use functional components with hooks
// Export with React.memo for expensive components
// Use @/ path alias for imports

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

const MyComponent = ({ title, className }) => {
  // ...
  return <div className={cn('tw-base-style', className)}>{title}</div>;
};

export default MyComponent;
```

### Tailwind CSS

All Tailwind utility classes use the `tw-` prefix (configured in `tailwind.config.js`). This is **non-negotiable**:

```jsx
// Correct
<div className="tw-bg-blue-500 tw-text-white tw-p-4">

// Wrong
<div className="bg-blue-500 text-white p-4">
```

---

## Git Workflow

### Branch Naming

```
feature/<short-description>    # New features
fix/<short-description>        # Bug fixes
docs/<short-description>       # Documentation
refactor/<short-description>   # Code refactoring
```

### Commit Messages

Follow conventional commits:

```
feat: add team invitation email template
fix: resolve OTP expiry check race condition
docs: update API reference for notifications
style: adjust sidebar responsive breakpoints
refactor: extract token generation into utility
test: add unit tests for auth service
chore: update dependencies
```

### Pull Request Process

1. Create a feature branch from `develop`
2. Make changes with clear, atomic commits
3. Run `npm run lint` and fix any issues
4. Open a PR against `develop`
5. Request review from at least one team member
6. Squash merge after approval

---

## Adding a New Server Module

1. Create the module directory: `server/modules/<name>/`
2. Create all 4 files (validation, service, controller, routes)
3. Mount routes in `server/app.js`
4. Add any new Mongoose models in the module directory
5. Update API documentation in `docs/API.md`

---

## Adding a New Client Page

1. Create the page component in `client/src/pages/<category>/`
2. Add the lazy import and route in `client/src/App.jsx`
3. If it requires auth, wrap in `ProtectedRoute`
4. Add navigation link in `Sidebar.jsx` (role-gated if needed)

---

## Environment Variables

See `server/.env.example` for all required variables. Never commit `.env` files.

Key variables:
- `MONGODB_URI` — MongoDB connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — distinct random strings
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — email service
- `CLIENT_URL` — frontend URL for CORS and email links
