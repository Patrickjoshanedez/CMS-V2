# API Reference — CMS V2

Base URL: `http://localhost:5000/api`

All responses follow a consistent format:

**Success:**
```json
{
  "success": true,
  "message": "Description of result",
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "status": 400
  }
}
```

---

## Health Check

### `GET /api/health`

Returns server status. No authentication required.

**Response (200):**
```json
{
  "success": true,
  "message": "CMS API is running",
  "data": { "timestamp": "2024-01-15T10:30:00.000Z" }
}
```

---

## Authentication

All auth endpoints are under `/api/auth`. Rate-limited to 10 requests per 15 minutes.

---

### `POST /api/auth/register`

Register a new student account. Sends verification OTP to email.

**Body:**
```json
{
  "name": "Juan Dela Cruz",
  "email": "juan@example.com",
  "password": "SecurePass123!"
}
```

| Field    | Type   | Rules                              |
| -------- | ------ | ---------------------------------- |
| name     | string | Required, 2–100 characters         |
| email    | string | Required, valid email format       |
| password | string | Required, minimum 8 characters     |

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": { "email": "juan@example.com" }
}
```

**Errors:** 409 (email already exists), 400 (validation)

---

### `POST /api/auth/login`

Authenticate with email and password. Sets access and refresh token cookies.

**Body:**
```json
{
  "email": "juan@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "...",
      "name": "Juan Dela Cruz",
      "email": "juan@example.com",
      "role": "student",
      "isVerified": true
    }
  }
}
```

**Cookies Set:**
- `accessToken` — JWT, 15 min, HTTPOnly, Secure, SameSite=Strict
- `refreshToken` — opaque token, 7 days, HTTPOnly, Secure, SameSite=Strict, Path=/api/auth/refresh

**Errors:** 401 (invalid credentials), 403 (not verified / inactive)

---

### `POST /api/auth/verify-otp`

Verify email with a 6-digit OTP code.

**Body:**
```json
{
  "email": "juan@example.com",
  "code": "482917",
  "type": "verification"
}
```

| Field | Type   | Rules                                    |
| ----- | ------ | ---------------------------------------- |
| email | string | Required, valid email                    |
| code  | string | Required, exactly 6 digits               |
| type  | string | Required, `verification` or `password_reset` |

**Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

**Errors:** 400 (invalid/expired OTP)

---

### `POST /api/auth/resend-otp`

Resend the OTP code to the given email. Rate-limited to 3 requests per 10 minutes.

**Body:**
```json
{
  "email": "juan@example.com",
  "type": "verification"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "If the email exists, a new OTP has been sent."
}
```

> Response is intentionally vague to prevent email enumeration.

---

### `POST /api/auth/refresh`

Refresh the access token using the refresh token cookie.

**Body:** None (reads from `refreshToken` cookie)

**Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed"
}
```

**Cookies Set:** New `accessToken` and `refreshToken` cookies.

**Security:** Old refresh token is revoked. If an already-revoked token is reused, ALL refresh tokens for that user are revoked (token theft detection).

**Errors:** 401 (missing/invalid/expired refresh token)

---

### `POST /api/auth/logout`

Invalidate the current session.

**Body:** None

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Action:** Revokes refresh token, clears both cookies.

---

### `POST /api/auth/forgot-password`

Request a password reset OTP.

**Body:**
```json
{
  "email": "juan@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "If the email is registered, a reset OTP has been sent."
}
```

> Response is intentionally vague to prevent email enumeration.

---

### `POST /api/auth/reset-password`

Reset password using email, OTP code, and new password.

**Body:**
```json
{
  "email": "juan@example.com",
  "code": "482917",
  "newPassword": "NewSecurePass456!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

**Action:** Verifies OTP, updates password, revokes ALL refresh tokens for user.

---

## Users

All endpoints under `/api/users` require authentication (access token cookie).

---

### `GET /api/users/me`

Get the authenticated user's profile.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "name": "Juan Dela Cruz",
      "email": "juan@example.com",
      "role": "student",
      "isVerified": true,
      "isActive": true,
      "teamId": null,
      "profilePicture": null,
      "lastLoginAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

---

### `PATCH /api/users/me`

Update the authenticated user's profile.

**Body (all optional):**
```json
{
  "name": "Juan D. Cruz",
  "profilePicture": "https://example.com/photo.jpg"
}
```

---

### `GET /api/users`

List all users. **Instructor only.** Supports pagination and filtering.

**Query Parameters:**

| Param  | Type   | Default | Description                        |
| ------ | ------ | ------- | ---------------------------------- |
| page   | number | 1       | Page number                        |
| limit  | number | 20      | Results per page (max 100)         |
| role   | string | —       | Filter by role                     |
| search | string | —       | Search by name or email            |
| status | string | —       | Filter: `active` or `inactive`     |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

---

### `POST /api/users`

Create a new user. **Instructor only.**

**Body:**
```json
{
  "name": "Maria Santos",
  "email": "maria@example.com",
  "password": "TempPass123!",
  "role": "adviser"
}
```

---

### `PATCH /api/users/:id`

Update a user. **Instructor only.**

---

### `PATCH /api/users/:id/role`

Change a user's role. **Instructor only.**

**Body:**
```json
{
  "role": "panelist"
}
```

---

### `DELETE /api/users/:id`

Soft-delete a user (sets `isActive: false`). **Instructor only.**

---

## Teams

All endpoints under `/api/teams` require authentication.

---

### `POST /api/teams`

Create a new team. **Student only.** Creator becomes the team leader.

**Body:**
```json
{
  "name": "Team Alpha",
  "academicYear": "2024-2025"
}
```

| Field        | Type   | Rules                        |
| ------------ | ------ | ---------------------------- |
| name         | string | Required, 3–100 characters   |
| academicYear | string | Required, format: `YYYY-YYYY` |

**Response (201):**
```json
{
  "success": true,
  "message": "Team created successfully",
  "data": { "team": { ... } }
}
```

**Errors:** 400 (user already in a team)

---

### `GET /api/teams/me`

Get the authenticated user's team details (populated with members).

---

### `POST /api/teams/:id/invite`

Invite a student to the team by email. **Team leader only.**

**Body:**
```json
{
  "email": "classmate@example.com"
}
```

**Action:** Creates a `TeamInvite` with UUID token, sends invitation email.

**Errors:** 400 (team full/locked), 404 (user not found with that email)

---

### `POST /api/teams/invites/:token/accept`

Accept a team invitation using the invite token.

**Errors:** 400 (invite expired/invalid), 400 (team full/locked)

---

### `POST /api/teams/invites/:token/decline`

Decline a team invitation.

---

### `PATCH /api/teams/:id/lock`

Lock team membership (prevents new members). **Team leader or Instructor.**

---

### `GET /api/teams`

List all teams with pagination. **Instructor and Adviser only.**

**Query Parameters:**

| Param        | Type   | Default | Description              |
| ------------ | ------ | ------- | ------------------------ |
| page         | number | 1       | Page number              |
| limit        | number | 20      | Results per page         |
| academicYear | string | —       | Filter by academic year  |
| search       | string | —       | Search by team name      |

---

## Notifications

All endpoints under `/api/notifications` require authentication. All operations are scoped to the authenticated user.

---

### `GET /api/notifications`

Get paginated notifications for the current user.

**Query Parameters:**

| Param | Type   | Default | Description      |
| ----- | ------ | ------- | ---------------- |
| page  | number | 1       | Page number      |
| limit | number | 20      | Results per page |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "notifications": [ ... ],
    "unreadCount": 3,
    "pagination": { "page": 1, "limit": 20, "total": 12, "pages": 1 }
  }
}
```

---

### `PATCH /api/notifications/:id/read`

Mark a single notification as read.

---

### `PATCH /api/notifications/read-all`

Mark all unread notifications as read for the current user.

---

### `DELETE /api/notifications/:id`

Delete a single notification.

---

### `DELETE /api/notifications`

Delete all notifications for the current user.

---

## Rate Limiting

| Category | Limit              | Endpoints                      |
| -------- | ------------------ | ------------------------------ |
| General  | 100 req / 15 min   | All endpoints                  |
| Auth     | 10 req / 15 min    | `/api/auth/*`                  |
| OTP      | 3 req / 10 min     | `/api/auth/resend-otp`         |

When rate limited, the server responds with HTTP 429:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT",
    "message": "Too many requests. Please try again later.",
    "status": 429
  }
}
```
