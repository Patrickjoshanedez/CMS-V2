# Database Schema — CMS V2

This document describes all MongoDB collections used in Phase 1 of the Capstone Management System.

---

## Collections Overview

| Collection       | Description                               |
| ---------------- | ----------------------------------------- |
| `users`          | All system users (students, faculty)      |
| `otps`           | One-time passwords for verification/reset |
| `refreshtokens`  | Hashed refresh tokens for session mgmt    |
| `teams`          | Capstone project teams                    |
| `teaminvites`    | Pending team membership invitations       |
| `notifications`  | In-app notification messages              |
| `projects`       | Capstone projects with title workflow      |
| `submissions`    | Chapter uploads with versioning & review  |

---

## 1. Users Collection

```
{
  _id: ObjectId,
  name: String (required, 2–100 chars),
  email: String (required, unique, lowercase, trimmed),
  password: String (required, bcrypt-hashed, select: false),
  role: String (enum: student|adviser|panelist|instructor, default: student),
  isVerified: Boolean (default: false),
  isActive: Boolean (default: true),
  teamId: ObjectId | null (ref: Team),
  profilePicture: String | null (URL),
  lastLoginAt: Date | null,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:** `{ email: 1 }` (unique), `{ role: 1-to-many }`, `{ teamId: 1 }`

**Business Rules:**
- Password is hashed with bcrypt (12 rounds) on save if modified
- Password field excluded from queries by default (`select: false`)
- `toJSON` and `toObject` transforms strip `password` and `__v`
- Instance method: `comparePassword(candidatePassword)` → Boolean

---

## 2. OTPs Collection

```
{
  _id: ObjectId,
  email: String (required, lowercase),
  code: String (required, bcrypt-hashed),
  type: String (enum: verification|password_reset),
  expiresAt: Date (default: now + 10 minutes),
  createdAt: Date
}
```

**Indexes:** `{ expiresAt: 1 }` (TTL — auto-deletes expired docs), `{ email: 1, type: 1 }`

**Business Rules:**
- 6-digit OTP generated via `crypto.randomInt`
- Code bcrypt-hashed before storage
- Instance method: `compareCode(candidateCode)` → Boolean
- Old OTPs for same email+type deleted before creating new ones

---

## 3. RefreshTokens Collection

```
{
  _id: ObjectId,
  userId: ObjectId (required, ref: User),
  token: String (required, unique, SHA-256 hash),
  expiresAt: Date (required),
  revokedAt: Date | null,
  replacedByToken: String | null,
  createdAt: Date
}
```

**Indexes:** `{ token: 1 }` (unique), `{ userId: 1 }`, `{ expiresAt: 1 }`

**Business Rules:**
- Raw token is SHA-256 hashed before storage
- `isValid()` → checks not expired AND not revoked
- `revoke()` → sets `revokedAt` to now
- `revokeAllForUser(userId)` static → revokes all tokens for a user (reuse detection)
- Token rotation: on refresh, old token revoked + new token issued

---

## 4. Teams Collection

```
{
  _id: ObjectId,
  name: String (required, 3–100 chars),
  leaderId: ObjectId (required, ref: User),
  members: [ObjectId] (ref: User, max: 4),
  isLocked: Boolean (default: false),
  academicYear: String (required, pattern: YYYY-YYYY),
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:** `{ leaderId: 1 }`, `{ academicYear: 1 }`

**Business Rules:**
- Maximum 4 members per team (enforced via pre-validate hook)
- Virtual: `memberCount` → `members.length`
- Virtual: `isFull` → `members.length >= MAX_TEAM_MEMBERS`
- Only students can create teams
- Creator automatically becomes leader and first member
- Locked teams cannot accept new members

---

## 5. TeamInvites Collection

```
{
  _id: ObjectId,
  teamId: ObjectId (required, ref: Team),
  email: String (required, lowercase),
  token: String (required, unique, UUID v4),
  status: String (enum: pending|accepted|declined|expired, default: pending),
  expiresAt: Date (default: now + 48 hours),
  createdAt: Date
}
```

**Indexes:** `{ token: 1 }` (unique), `{ teamId: 1, email: 1 }`, `{ expiresAt: 1 }`

**Business Rules:**
- Token is a UUID v4 string
- `isValid()` → checks status is 'pending' AND not expired
- On accept: updates status, adds user to team, notifies team members
- On decline: updates status only
- Orphaned students (already in a different team) are handled gracefully on accept

---

## 6. Notifications Collection

```
{
  _id: ObjectId,
  userId: ObjectId (required, ref: User),
  type: String (enum: team_invite|team_joined|team_locked|welcome|system),
  title: String (required),
  message: String (required),
  isRead: Boolean (default: false),
  metadata: Mixed (flexible JSON object),
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:** `{ userId: 1, isRead: 1, createdAt: -1 }`

**Business Rules:**
- Ownership enforced on all operations (userId must match authenticated user)
- `markAllAsRead` updates all unread notifications for the user
- Sorted by `createdAt` descending (newest first)
- Query response includes `unreadCount` alongside paginated data

---

## Entity Relationships

```
User 1──────N RefreshToken
User 1──────N OTP (via email)
User N──────1 Team (via teamId)
Team 1──────N TeamInvite
Team 1──────1 User (leaderId)
User 1──────N Notification
Team 1──────N Project
Project 1───N Submission
User 1──────N Submission (submittedBy)
User 1──────N Submission (reviewedBy)
```

---

## 8. Submissions Collection

> Added in Sprint 6 — Cloud Storage, Document Upload & Versioning

```
{
  _id: ObjectId,
  projectId: ObjectId (ref: Project, required),
  chapter: Number (1–5, required),
  version: Number (default: 1),
  fileName: String (required),
  fileType: String (required, enum: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain),
  fileSize: Number (required),
  storageKey: String (required — S3 object key),
  status: String (enum: pending, under_review, approved, revisions_required, rejected, locked — default: pending),
  originalityScore: Number | null (populated async by plagiarism job),
  plagiarismResult: {
    status: String (enum: queued, processing, completed, failed — default: queued),
    score: Number | null (0–100, populated on completion),
    matchedSources: [
      {
        source: String (required — name/identifier of matched source),
        matchPercentage: Number (required — 0–100)
      }
    ],
    error: String | null (populated on failure),
    completedAt: Date | null
  } | null,
  extractedText: String | null (select: false — hidden by default, populated by plagiarism worker),
  submittedBy: ObjectId (ref: User, required),
  reviewedBy: ObjectId | null (ref: User),
  isLate: Boolean (default: false),
  remarks: String | null (required if isLate),
  reviewNote: String | null,
  annotations: [
    {
      _id: ObjectId,
      userId: ObjectId (ref: User, required),
      page: Number (default: 1),
      content: String (required),
      highlightCoords: { x: Number, y: Number, width: Number, height: Number } | null,
      createdAt: Date
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ projectId: 1, chapter: 1, version: 1 }` (unique compound)
- `{ status: 1, createdAt: -1 }`
- `{ submittedBy: 1, createdAt: -1 }`
- `{ 'plagiarismResult.status': 1 }` (for querying pending plagiarism checks)

**Business Rules:**
- Version auto-increments on re-upload for a given project + chapter
- Approved submissions are automatically locked
- Locked chapters block new uploads until faculty unlocks them
- Late submissions require a remarks field (enforced server-side)
- Only students can upload; only faculty can review, unlock, and annotate
- Annotations are embedded subdocuments; author or instructor can remove
- `storageKey` format: `projects/{projectId}/chapters/{chapter}/v{version}/{safeFileName}`
- Document viewing uses temporary pre-signed S3 URLs (15 min expiry)
- `plagiarismResult` is embedded; status transitions: `queued → processing → completed | failed`
- `extractedText` is hidden from default queries (`select: false`) to keep payloads lean
- The originality `score` represents the percentage of original (non-plagiarised) content
