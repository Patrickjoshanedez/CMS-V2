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

---

## Submissions

All submission endpoints are under `/api/submissions`. Authentication required.

### `POST /api/submissions/:projectId/chapters`

Upload a chapter draft for a capstone project. Student-only.

**Auth:** Bearer token (JWT cookie). Roles: `student`
**Content-Type:** `multipart/form-data`

**Request:**
| Field     | Type   | Required    | Description                              |
| --------- | ------ | ----------- | ---------------------------------------- |
| file      | binary | yes         | PDF, DOCX, or TXT — max 25 MB           |
| chapter   | number | yes (param) | Chapter number (1–5)                     |
| remarks   | string | conditional | Required if submission is past deadline   |

**Response (201):**
```json
{
  "success": true,
  "message": "Chapter uploaded successfully",
  "data": { "submission": { "_id": "...", "chapter": 1, "version": 1, "status": "pending", ... } }
}
```

**Errors:** 400 (validation), 403 (not student / title not approved / chapter locked), 409 (late without remarks)

---

### `GET /api/submissions/:submissionId`

Get a single submission by ID.

**Auth:** Bearer token. Roles: `student`, `adviser`, `panelist`, `instructor`

**Response (200):**
```json
{
  "success": true,
  "data": { "submission": { "_id": "...", "chapter": 1, "version": 2, "status": "approved", "annotations": [...], ... } }
}
```

---

### `GET /api/submissions/:submissionId/view`

Generate a temporary pre-signed URL (15 min) to view the uploaded document.

**Auth:** Bearer token. Roles: all authenticated
**Response (200):**
```json
{
  "success": true,
  "data": { "url": "https://s3.amazonaws.com/...", "expiresIn": 900 }
}
```

---

### `GET /api/submissions/project/:projectId`

List all submissions for a project.

**Auth:** Bearer token. Roles: all authenticated
**Query Params:** `chapter` (optional, 1–5), `page`, `limit`, `sort`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "submissions": [...],
    "pagination": { "total": 12, "page": 1, "limit": 20, "pages": 1 }
  }
}
```

---

### `GET /api/submissions/project/:projectId/chapters/:chapter`

Get version history for a specific chapter.

**Auth:** Bearer token. Roles: all authenticated

**Response (200):**
```json
{
  "success": true,
  "data": { "submissions": [{ "version": 3, ... }, { "version": 2, ... }, { "version": 1, ... }] }
}
```

---

### `GET /api/submissions/project/:projectId/chapters/:chapter/latest`

Get only the latest version submission for a chapter.

**Auth:** Bearer token. Roles: all authenticated

**Response (200):**
```json
{
  "success": true,
  "data": { "submission": { "_id": "...", "version": 3, "status": "pending", ... } }
}
```

---

### `POST /api/submissions/:submissionId/review`

Approve, request revisions, or reject a submission. Faculty-only.

**Auth:** Bearer token. Roles: `adviser`, `instructor`

**Request Body:**
| Field      | Type   | Required | Description                                                   |
| ---------- | ------ | -------- | ------------------------------------------------------------- |
| status     | string | yes      | One of: `approved`, `revisions_required`, `rejected`          |
| reviewNote | string | no       | Feedback from the reviewer                                    |

**Response (200):**
```json
{
  "success": true,
  "message": "Submission approved",
  "data": { "submission": { "status": "approved", "reviewedBy": "...", ... } }
}
```

**Note:** Approving a submission automatically sets its status to `locked`.

---

### `POST /api/submissions/:submissionId/unlock`

Unlock a locked submission to allow re-upload. Faculty-only.

**Auth:** Bearer token. Roles: `adviser`, `instructor`

**Request Body:**
| Field  | Type   | Required | Description              |
| ------ | ------ | -------- | ------------------------ |
| reason | string | yes      | Reason for unlocking     |

**Response (200):**
```json
{
  "success": true,
  "message": "Submission unlocked",
  "data": { "submission": { "status": "revisions_required", ... } }
}
```

---

### `POST /api/submissions/:submissionId/annotations`

Add a highlight/comment annotation to a submission. Faculty-only.

**Auth:** Bearer token. Roles: `adviser`, `panelist`, `instructor`

**Request Body:**
| Field           | Type   | Required | Description                          |
| --------------- | ------ | -------- | ------------------------------------ |
| content         | string | yes      | The annotation text                  |
| page            | number | no       | Page number reference (default: 1)   |
| highlightCoords | object | no       | `{ x, y, width, height }` rectangle |

**Response (201):**
```json
{
  "success": true,
  "data": { "submission": { "annotations": [...] } }
}
```

---

### `DELETE /api/submissions/:submissionId/annotations/:annotationId`

Remove an annotation. Author or instructor can delete.

**Auth:** Bearer token. Roles: `adviser`, `panelist`, `instructor`

**Response (200):**
```json
{
  "success": true,
  "message": "Annotation removed",
  "data": { "submission": { "annotations": [...] } }
}
```

---

### `GET /api/submissions/:submissionId/plagiarism`

Fetch the plagiarism / originality check result for a submission.

**Auth:** Bearer token. Roles: `student`, `adviser`, `panelist`, `instructor`

**Path Parameters:**
| Param        | Type   | Description                        |
| ------------ | ------ | ---------------------------------- |
| submissionId | string | MongoDB ObjectId of the submission |

**Response (200) — Completed:**
```json
{
  "success": true,
  "data": {
    "plagiarismResult": {
      "status": "completed",
      "score": 87,
      "checkedAt": "2025-07-10T12:00:00.000Z",
      "matchedSources": [
        { "sourceId": "...", "title": "...", "matchPercentage": 12.5 }
      ]
    }
  }
}
```

**Response (200) — Queued/Processing:**
```json
{
  "success": true,
  "data": {
    "plagiarismResult": {
      "status": "queued",
      "score": null,
      "checkedAt": null,
      "matchedSources": []
    }
  }
}
```

**Errors:**
- 400 — Invalid submission ID format
- 401 — Not authenticated
- 404 — Submission not found

---

### `POST /api/submissions/:projectId/proposal`

Compile and upload the full proposal document after Chapters 1–3 are approved and locked.

**Auth:** Bearer token. Roles: `student`

**Content-Type:** `multipart/form-data`

**URL Params:**
| Field     | Type   | Required | Description           |
| --------- | ------ | -------- | --------------------- |
| projectId | string | yes      | MongoDB ObjectId      |

**Body (form-data):**
| Field   | Type   | Required    | Description                                       |
| ------- | ------ | ----------- | ------------------------------------------------- |
| file    | binary | yes         | PDF/DOCX/TXT, max 25 MB                           |
| remarks | string | conditional | Required if submission is past project deadline    |

**Response (201):**
```json
{
  "success": true,
  "message": "Proposal compiled and submitted successfully",
  "data": {
    "_id": "...",
    "projectId": "...",
    "type": "proposal",
    "chapter": null,
    "version": 1,
    "status": "pending",
    "fileUrl": "projects/.../proposal/v1/proposal.pdf",
    "fileName": "proposal.pdf",
    "fileSize": 1024000,
    "mimeType": "application/pdf",
    "isLate": false,
    "plagiarismResult": { "status": "queued" }
  }
}
```

**Errors:**
- 400 — Validation error (missing file, missing late remarks, unsupported MIME type)
- 400 — Not all chapters (1–3) are locked (approved). Each must be individually approved before proposal compilation
- 401 — Not authenticated
- 403 — Not a member of this project's team
- 404 — Project not found

**Business Rules:**
- Chapters 1, 2, and 3 must each have a submission with `status: 'locked'` before compilation is allowed
- Submitting a proposal transitions the project status from `active` to `proposal_submitted`
- A plagiarism check job is automatically enqueued on successful upload
- The adviser is notified via `proposal_submitted` notification type
- If the proposal is later approved (via `reviewSubmission` with `decision: 'approve'`), the project transitions to `proposal_approved`

---

## Dashboard

All dashboard endpoints are under `/api/dashboard`. Require authentication.

---

### `GET /api/dashboard/stats`

Returns role-aware dashboard statistics for the authenticated user.

**Auth:** Bearer token. Roles: all authenticated users

**Response (200) — Student:**
```json
{
  "success": true,
  "data": {
    "role": "student",
    "team": { "name": "...", "members": [...] } | null,
    "project": { "title": "...", "titleStatus": "...", "projectStatus": "..." } | null,
    "chapterProgress": { "1": { "status": "approved", "version": 2 }, ... },
    "recentNotifications": [...]
  }
}
```

**Response (200) — Instructor:**
```json
{
  "success": true,
  "data": {
    "role": "instructor",
    "counts": { "students": 0, "teams": 0, "projects": 0, "submissions": 0 },
    "pendingTitles": [...],
    "recentSubmissions": [...],
    "projectsByStatus": { "active": 0, "proposal_submitted": 0, ... }
  }
}
```

**Response (200) — Adviser:**
```json
{
  "success": true,
  "data": {
    "role": "adviser",
    "assignedProjects": [...],
    "pendingReviews": [...]
  }
}
```

**Response (200) — Panelist:**
```json
{
  "success": true,
  "data": {
    "role": "panelist",
    "assignedProjects": [...]
  }
}
```

**Errors:** 401 (not authenticated)

---

## Change Password

### `POST /api/auth/change-password`

Change the authenticated user's password. Revokes all existing refresh tokens (forces re-login on other devices).

**Auth:** Bearer token. Roles: all authenticated users

**Request Body:**
| Field           | Type   | Required | Description                                      |
| --------------- | ------ | -------- | ------------------------------------------------ |
| currentPassword | string | yes      | The user's current password                       |
| newPassword     | string | yes      | 8–128 chars, must contain uppercase, lowercase, digit |

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Errors:**
- 400 — Validation error (weak password, missing fields)
- 400 — New password same as current password
- 401 — Current password is incorrect
- 401 — Not authenticated

---

## Project Archiving & Certificates

### `POST /api/projects/:id/archive`

Archive a project after Capstone 4 completion. Requires both final papers (academic + journal) with passing plagiarism checks.

**Auth:** Bearer token. Roles: `instructor`

**Request Body:**
| Field           | Type   | Required | Description             |
| --------------- | ------ | -------- | ----------------------- |
| completionNotes | string | no       | Notes about completion  |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "project": { "isArchived": true, "projectStatus": "archived", ... }
  }
}
```

**Errors:**
- 400 `MISSING_ACADEMIC` — Final academic version not uploaded
- 400 `MISSING_JOURNAL` — Final journal version not uploaded
- 400 `PLAGIARISM_CHECK_PENDING` — Plagiarism check not run or still in progress
- 400 `PLAGIARISM_CHECK_FAILED` — Plagiarism check failed for a final paper
- 400 `ORIGINALITY_BELOW_THRESHOLD` — Originality score below 75%
- 400 `ALREADY_ARCHIVED` — Project is already archived
- 403 — Not an instructor
- 404 — Project not found

---

### `GET /api/projects/archive/search`

Search archived projects with filters.

**Auth:** Bearer token. Roles: all authenticated

**Query Parameters:**
| Param        | Type   | Description                      |
| ------------ | ------ | -------------------------------- |
| keyword      | string | Search by title or keywords      |
| academicYear | string | Filter by academic year          |
| page         | number | Page number (default: 1)         |
| limit        | number | Results per page (default: 10)   |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "projects": [...],
    "pagination": { "page": 1, "limit": 10, "total": 5 }
  }
}
```

**Notes:** Students see `canViewAcademic: false` (journal version only). Faculty see `canViewAcademic: true`.

---

### `POST /api/projects/:id/certificate`

Upload a completion certificate for an archived project.

**Auth:** Bearer token. Roles: `instructor`

**Request:** `multipart/form-data` with `file` field (PDF only, max 10MB)

**Response (200):**
```json
{
  "success": true,
  "data": { "certificateUrl": "s3://..." }
}
```

**Errors:** 400 (not archived), 403 (not instructor)

---

### `GET /api/projects/:id/certificate`

Get a signed URL for the project's completion certificate.

**Auth:** Bearer token. Roles: all authenticated

**Response (200):**
```json
{
  "success": true,
  "data": { "url": "https://signed-url..." }
}
```

**Errors:** 404 (no certificate uploaded)

---

### `GET /api/projects/reports`

Generate reports of capstone counts grouped by academic year.

**Auth:** Bearer token. Roles: `instructor`

**Query Parameters:**
| Param        | Type   | Description                    |
| ------------ | ------ | ------------------------------ |
| academicYear | string | Filter by specific year        |

**Response (200):**
```json
{
  "success": true,
  "data": { "report": [{ "_id": "2024-2025", "count": 12 }] }
}
```

---

### `POST /api/projects/archive/bulk`

Bulk upload a legacy document, bypassing the standard workflow.

**Auth:** Bearer token. Roles: `instructor`

**Request:** `multipart/form-data`
| Field        | Type   | Required | Description             |
| ------------ | ------ | -------- | ----------------------- |
| title        | string | yes      | Project title           |
| abstract     | string | yes      | Project abstract        |
| keywords     | string | yes      | Comma-separated         |
| academicYear | string | yes      | e.g., "2024-2025"       |
| file         | binary | yes      | PDF, max 25MB           |

**Errors:** 400 (missing fields), 403 (not instructor)

---

## Dual Version Upload (Final Papers)

### `POST /api/submissions/:projectId/final-academic`

Upload the final full academic version of the capstone paper.

**Auth:** Bearer token. Roles: `student` (project member)

**Request:** `multipart/form-data` with `file` field (PDF, max 25MB)

**Response (201):**
```json
{
  "success": true,
  "data": {
    "submission": { "type": "final_academic", "plagiarismResult": { "status": "queued" }, ... }
  }
}
```

---

### `POST /api/submissions/:projectId/final-journal`

Upload the condensed journal/publishable version.

**Auth:** Bearer token. Roles: `student` (project member)

**Request:** Same as final-academic.

**Response (201):** Same structure with `type: "final_journal"`.

---

## Evaluations

### `GET /api/evaluations/:projectId/:defenseType`

Get or create a draft evaluation for the authenticated panelist.

**Auth:** Bearer token. Roles: `panelist`, `instructor`

**Params:** `defenseType` — `proposal`, `mid_term`, or `final`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "evaluation": { "status": "draft", "criteria": [...], "defenseType": "proposal", ... }
  }
}
```

---

### `PATCH /api/evaluations/:evaluationId`

Update a draft evaluation (save scores/comments without submitting).

**Auth:** Bearer token. Roles: `panelist`, `instructor`

**Request Body:**
```json
{
  "criteria": [{ "name": "Technical Merit", "score": 85, "maxScore": 100, "weight": 0.3 }],
  "comments": "Good progress"
}
```

---

### `POST /api/evaluations/:evaluationId/submit`

Submit a completed evaluation (locks it from further edits).

**Auth:** Bearer token. Roles: `panelist`, `instructor`

---

### `POST /api/evaluations/:projectId/:defenseType/release`

Release all submitted evaluations to students.

**Auth:** Bearer token. Roles: `instructor`

---

### `GET /api/evaluations/project/:projectId/:defenseType`

List all evaluations for a project's defense type.

**Auth:** Bearer token. Roles: all authenticated

---

### `GET /api/evaluations/detail/:evaluationId`

Get a single evaluation by ID.

**Auth:** Bearer token. Roles: all authenticated

---

## Phase Advancement

### `POST /api/projects/:id/advance-phase`

Advance a project to the next capstone phase (1 → 2 → 3 → 4).

**Auth:** Bearer token. Roles: `instructor`

**Response (200):**
```json
{
  "success": true,
  "data": { "project": { "capstonePhase": 2, ... } }
}
```

**Errors:** 400 (prerequisites not met), 400 (already at max phase)

---

## Prototypes

### `POST /api/projects/:id/prototypes`

Add a prototype (media upload or external link).

**Auth:** Bearer token. Roles: `student` (project member)

**Request (file):** `multipart/form-data` with `file` field (image/video)
**Request (link):** `{ "type": "link", "url": "https://...", "title": "Demo" }`

**Errors:** 400 (max 20 prototypes), 400 (invalid MIME type)

---

### `DELETE /api/projects/:id/prototypes/:prototypeId`

Remove a prototype.

**Auth:** Bearer token. Roles: `student` (project member)

---

### `GET /api/projects/:id/prototypes`

List all prototypes for a project.

**Auth:** Bearer token. Roles: all authenticated

---

## WebSocket Events

### Connection

Connect to `ws://localhost:5000` with `accessToken` cookie for authentication.

### Events (Server → Client)

| Event              | Payload                                    | Description                           |
| ------------------ | ------------------------------------------ | ------------------------------------- |
| `notification:new` | `{ type, message, projectId, ... }`        | New notification pushed in real-time  |
