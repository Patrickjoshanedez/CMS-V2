# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased] — Phase 2 Planning

### Added
- Phase 2 Strategy document (`docs/PHASE_2_STRATEGY.md`) covering the complete Capstone 1 workflow: project creation, title submission with similarity detection, cloud storage uploads, adviser review with annotations, plagiarism checker integration, document locking, unlock requests, and proposal compilation
- Five sprint plans (Sprints 5–9) with ~120 tasks across backend, frontend, and documentation
- Three new database collection schemas: `projects`, `submissions`, `unlockrequests`
- ~40 new API endpoint specifications across projects, submissions, reviews, and unlock requests
- Third-party integration plans: AWS S3, Copyleaks API, Redis/BullMQ
- Risk register with 9 identified risks and mitigations
- Phase 1 completion gap analysis (Sprint 4 prerequisites)
- Phase 2 → Phase 3 handoff checklist

---

## [0.1.0] — 2025-01-15

### Added

**Server — Core Infrastructure**
- Express server with Mongoose (MongoDB) connection
- Environment configuration with validation (`config/env.js`)
- Centralized error handling (`AppError`, `catchAsync`, `errorHandler`)
- JWT token utilities with refresh token rotation and SHA-256 hashing
- OTP generation (6-digit, crypto-secure) with bcrypt hashing
- Rate limiting middleware (general, auth, OTP tiers)
- Request validation middleware using Zod schemas
- Authentication middleware (JWT from HTTP-only cookies)
- Role-based authorization middleware

**Server — Feature Modules**
- **Auth module:** register, login, verify OTP, resend OTP, refresh token, logout, forgot password, reset password
- **Users module:** get/update profile, list users (instructor), create/update/soft-delete users, change roles
- **Teams module:** create team, invite members (email + UUID token), accept/decline invites, lock team, list teams
- **Notifications module:** CRUD operations, mark as read, bulk operations, unread count

**Server — Models**
- User (bcrypt passwords, role enum, soft-delete via isActive)
- OTP (TTL index, bcrypt-hashed codes)
- RefreshToken (SHA-256 hashed, rotation with reuse detection)
- Team (max 4 members, leader, academic year, lock)
- TeamInvite (UUID token, 48h expiry, status tracking)
- Notification (typed, metadata, read tracking)

**Server — Services**
- Email service (Nodemailer, HTML templates for OTP and team invites)

**Client — Infrastructure**
- React 18 + Vite 6 scaffold with path alias (`@/`)
- Tailwind CSS 3.4 with `tw-` prefix and shadcn/ui-compatible theme
- Dark/light/system theme with CSS custom properties (HSL)
- Axios API layer with 401 refresh interceptor and request queuing
- Zustand auth store with full auth flow actions
- React Query client (5min stale, no retry on 4xx)
- React Router v6 with lazy-loaded routes

**Client — UI Components**
- Button (6 variants, 4 sizes)
- Input, Label
- Card (6 sub-components)
- Alert (4 variants with icons)
- ThemeProvider + ThemeToggle

**Client — Pages**
- Login (email/password, visibility toggle)
- Register (with password confirmation, redirects to OTP)
- Verify OTP (6-digit auto-advance, paste support, resend cooldown)
- Forgot Password (email form, auto-redirect to OTP)
- Reset Password (new password + confirm, with email/code from state)
- Dashboard (role-based cards for student/instructor/adviser/panelist)

**Client — Layout System**
- AuthLayout (centered card with branding)
- DashboardLayout (sidebar + header + content)
- Sidebar (role-based navigation, collapsible, mobile responsive)
- Header (user avatar, notifications, theme toggle)

**Shared Package (`@cms/shared`)**
- Role constants (STUDENT, ADVISER, PANELIST, INSTRUCTOR)
- HTTP status code constants

**Documentation**
- README with setup instructions
- Phase 1 Strategy document (4 sprints, risk register)
- Database schema documentation
- API reference (all endpoints)
- Architecture overview
- Contributing guidelines

**Configuration**
- npm workspaces monorepo (server, client, shared)
- ESLint + Prettier (root config)
- EditorConfig
- Git ignore rules
