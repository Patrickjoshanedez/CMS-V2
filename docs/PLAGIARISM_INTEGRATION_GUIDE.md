# Plagiarism Checker Integration Guide

## Overview

The CMS includes a sophisticated plagiarism detection system that integrates with an external plagiarism checking engine. Students' and advisers' submissions are checked for originality before approval, displaying a similarity percentage and matched sources.

## Architecture

```
┌─────────────────────────────────────────────┐
│ Frontend (React)                            │
│ ├─ PlagiarismChecker.jsx (UI Component)     │
│ └─ plagiarism.service.js (API Service)      │
└──────────────┬──────────────────────────────┘
               │ HTTP REST API
┌──────────────▼──────────────────────────────┐
│ Backend (Express.js)                        │
│ ├─ plagiarism.controller.ts (Routes)        │
│ ├─ plagiarism.service.ts (Business Logic)   │
│ └─ plagiarism.model.ts (MongoDB Schema)     │
└──────────────┬──────────────────────────────┘
               │ gRPC / HTTP
┌──────────────▼──────────────────────────────┐
│ Plagiarism Engine (Python)                  │
│ ├─ main.py (gRPC Server)                    │
│ ├─ engine.py (Detection Logic)              │
│ ├─ embeddings.py (Document Embeddings)      │
│ ├─ winnowing.py (Winnowing Algorithm)       │
│ └─ database.py (Corpus Management)          │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│ MongoDB                                      │
│ ├─ plagiarism_results (Check Results)       │
│ └─ documents (Indexed Corpus)               │
└─────────────────────────────────────────────┘
```

## API Endpoints

### 1. Start Plagiarism Check

**Request:**
```http
POST /api/submissions/{submissionId}/plagiarism/check
Content-Type: application/json
Authorization: Bearer {token}

{
  "text": "Full text of the submission...",
  "title": "Chapter Title",
  "chapter": "Chapter 1",
  "projectId": "project-uuid-here"
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "taskId": "task-123-abc-def",
  "message": "Plagiarism check queued. Poll /plagiarism/result/{taskId} for progress."
}
```

**Status Codes:**
- `202 Accepted` — Check queued successfully
- `400 Bad Request` — Missing/invalid parameters
- `403 Forbidden` — User lacks permission (must be adviser, instructor, or panelist)
- `404 Not Found` — Submission not found
- `422 Unprocessable Entity` — No text extracted from submission

---

### 2. Get Plagiarism Result

**Request:**
```http
GET /api/submissions/{submissionId}/plagiarism/result
Authorization: Bearer {token}
```

**Response (200 OK) — Completed:**
```json
{
  "success": true,
  "status": "completed",
  "similarity_percentage": 23.5,
  "warning_flag": false,
  "checked_at": "2025-03-09T14:32:00Z",
  "text_matches": [
    {
      "id": "doc-456",
      "title": "Previous Capstone Project - 2024",
      "url": "https://archive.example.com/doc-456",
      "excerpt": "We implemented a machine learning model to classify...",
      "similarity": 45.2
    },
    {
      "id": "src-789",
      "title": "Wikipedia - Machine Learning",
      "url": "https://en.wikipedia.org/wiki/Machine_learning",
      "excerpt": "Machine learning is a field of study in artificial intelligence...",
      "similarity": 12.3
    }
  ]
}
```

**Response (200 OK) — Still Processing:**
```json
{
  "success": true,
  "status": "pending",
  "message": "Plagiarism check not yet completed. Please try again in a few seconds."
}
```

**Response (200 OK) — Failed:**
```json
{
  "success": false,
  "status": "failed",
  "errorMessage": "Could not process the submission file."
}
```

**Status Codes:**
- `200 OK` — Result retrieved (check status in response)
- `404 Not Found` — Submission or result not found

---

### 3. Index Submission in Corpus

**Request (After Approval):**
```http
POST /api/submissions/{submissionId}/plagiarism/index
Content-Type: application/json
Authorization: Bearer {token}

{
  "text": "Full submission text...",
  "title": "Chapter Title",
  "author": "Student Name",
  "chapter": "Chapter 1",
  "projectId": "project-uuid-here"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Submission indexed and will be checked against future submissions."
}
```

**Status Codes:**
- `200 OK` — Submission indexed successfully
- `403 Forbidden` — User lacks permission (adviser or instructor only)
- `422 Unprocessable Entity` — No text provided

---

### 4. Remove Submission from Corpus

**Request (If Submission Deleted/Rejected):**
```http
DELETE /api/submissions/{submissionId}/plagiarism/index
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Submission removed from plagiarism corpus."
}
```

---

## Frontend Usage

### Using PlagiarismChecker Component

```jsx
import PlagiarismChecker from './components/Submissions/PlagiarismChecker';

function SubmissionReview({ submissionId, submissionTitle }) {
  const handleCheckComplete = (result) => {
    console.log('Plagiarism check complete:', result);
    
    if (result.similarity_percentage > 30) {
      alert('⚠️ High similarity detected — careful review recommended');
    }
  };

  return (
    <div>
      <h2>Review Submission</h2>
      
      {/* Plagiarism checker component */}
      <PlagiarismChecker
        submissionId={submissionId}
        submissionTitle={submissionTitle}
        onCheckComplete={handleCheckComplete}
        showMatchDetails={true}
      />

      {/* Other submission content */}
    </div>
  );
}
```

### Using plagiarism.service Directly

```javascript
import {
  startPlagiarismCheck,
  getPlagiarismResult,
  indexSubmissionInCorpus,
  pollPlagiarismResult,
} from './services/plagiarism.service';

// Start check
async function checkSubmission(submissionId, extractedText) {
  try {
    const { taskId } = await startPlagiarismCheck(submissionId, {
      text: extractedText,
      title: 'Chapter 1',
      chapter: 'Chapter 1',
      projectId: 'proj-123',
    });

    console.log(`Check started, task: ${taskId}`);

    // Poll for result
    const result = await pollPlagiarismResult(submissionId);
    console.log(`Similarity: ${result.similarity_percentage}%`);
    
    return result;
  } catch (error) {
    console.error('Plagiarism check failed:', error);
  }
}

// Index approved submission
async function approveAndIndex(submissionId, text) {
  try {
    const response = await indexSubmissionInCorpus(submissionId, {
      text,
      title: 'Approved Chapter',
      author: 'Student Name',
      chapter: 'Chapter 1',
      projectId: 'proj-123',
    });
    
    console.log(response.message);
  } catch (error) {
    console.error('Indexing failed:', error);
  }
}
```

---

## Backend Integration

### Mounting Routes

In `server/app.js`:

```javascript
import plagiarismRoutes from './modules/plagiarism/plagiarism.routes';

// Mount plagiarism routes under /api/submissions
app.use('/api/submissions', plagiarismRoutes);
```

### Triggering Plagiarism Check on Approval

In `server/modules/submissions/submissions.service.js`:

```javascript
import { plagiarismService } from '../plagiarism/plagiarism.service';

async function approveSubmission(submissionId) {
  const submission = await Submission.findById(submissionId);

  // Extract text from document
  const extractedText = await extractSubmissionText(submission.fileUrl);

  // Submit to plagiarism engine
  const taskId = await plagiarismService.checkDocument({
    document_id: submissionId,
    text: extractedText,
    metadata: {
      title: submission.title,
      author: submission.studentName,
      chapter: submission.chapter,
    },
  });

  // Store task ID for polling
  submission.plagiarismTaskId = taskId;
  submission.plagiarismStatus = 'pending';
  await submission.save();
}
```

---

## Workflow: Complete Submission Review Cycle

### 1. Student Submits Chapter

```
Student uploads PDF/DOCX → Stored in S3/Google Drive
                            ↓
                    Submission created in MongoDB
```

### 2. Adviser Reviews & Triggers Check

```
Adviser clicks "Check Plagiarism" on submission
                            ↓
             Frontend extracts text from document
                            ↓
        POST /api/submissions/{id}/plagiarism/check
                            ↓
      Backend submits to plagiarism engine (async)
                            ↓
     Frontend polls GET /api/submissions/{id}/plagiarism/result
                            ↓
       Result display: "23% similarity" (GREEN — OK)
                            ↓
            Adviser clicks "Approve Submission"
```

### 3. On Approval, Index for Future Checks

```
POST /api/submissions/{id}/plagiarism/index
                            ↓
     Submission added to plagiarism corpus
                            ↓
Future student submissions will be checked against it
```

### 4. Student Resubmits (If Requested)

```
New submission from same student/project
                            ↓
        Plagiarism engine compares against:
        • Previous submissions from this project
        • All indexed approved submissions from corpus
        • Public sources (if configured)
                            ↓
     Result: "45% similarity" (YELLOW/RED — CAUTION)
                            ↓
         Adviser investigates matched sources
```

### 5. On Rejection, Remove from Corpus (if mistakenly indexed)

```
DELETE /api/submissions/{id}/plagiarism/index
                            ↓
   Submission removed from corpus
```

---

## Configuration

### Environment Variables

```bash
# Plagiarism Engine
PLAGIARISM_ENGINE_URL=http://plagiarism-engine:5000
PLAGIARISM_ENGINE_TIMEOUT=120000

# Similarity Thresholds
PLAGIARISM_WARNING_THRESHOLD=30       # % — when to flag as warning
PLAGIARISM_REJECT_THRESHOLD=50        # % — suggest rejection
PLAGIARISM_MAX_MATCH_SOURCES=10       # Max sources to display

# Task Polling
PLAGIARISM_POLL_INTERVAL=2000         # ms between polls
PLAGIARISM_POLL_MAX_ATTEMPTS=60       # Max 60 polls × 2s = 120s max wait

# MongoDB
MONGODB_PLAGIARISM_DB=plagiarism_results
PLAGIARISM_RESULTS_TTL=7776000        # Expire results after 90 days
```

---

## Similarity Score Interpretation

| Score | Interpretation | Action |
|-------|---|---|
| 0-15% | ✅ Very Low | Accept as original |
| 15-30% | ⚠️ Low-Medium | Review briefly, usually OK |
| 30-50% | 🟡 Medium-High | Detailed review required |
| 50%+ | 🔴 Very High | Likely plagiarism — reject or request rewrite |

---

## Error Handling

### Common Errors & Solutions

**Error: "No text extracted from submission"**
- Cause: PDF/DOCX upload failed or file is corrupt
- Solution: Ask student to re-upload; verify file format

**Error: "Plagiarism check timeout"**
- Cause: Large file or engine overloaded
- Solution: Retry after a few minutes; for files > 50MB, use streaming extraction

**Error: "Plagiarism engine unavailable"**
- Cause: Docker container for plagiarism engine not running
- Solution: `docker-compose up plagiarism-engine`

**Error: "Not authorized to check plagiarism"**
- Cause: User is not adviser, instructor, or panelist
- Solution: Verify user role in MongoDB; ensure RBAC middleware is configured

---

## Testing Plagiarism Check

### Manual Test via cURL

```bash
# 1. Start a check
curl -X POST http://localhost:3000/api/submissions/sub-123/plagiarism/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "text": "This is a sample submission text about machine learning algorithms...",
    "title": "Chapter 1",
    "chapter": "Chapter 1",
    "projectId": "proj-456"
  }'

# Response: { "taskId": "task-abc-123" }

# 2. Poll for result (repeat every 2 seconds)
curl -X GET http://localhost:3000/api/submissions/sub-123/plagiarism/result \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response: { "status": "pending" } → { "status": "completed", "similarity_percentage": 23.5, ... }
```

### Automated Test (Jest)

```javascript
describe('Plagiarism Checker', () => {
  it('should start plagiarism check', async () => {
    const response = await request(app)
      .post('/api/submissions/sub-123/plagiarism/check')
      .set('Authorization', `Bearer ${token}`)
      .send({
        text: 'Sample text...',
        title: 'Chapter 1',
        chapter: 'Chapter 1',
        projectId: 'proj-456',
      });

    expect(response.status).toBe(202);
    expect(response.body.taskId).toBeDefined();
  });

  it('should retrieve plagiarism result', async () => {
    const response = await request(app)
      .get('/api/submissions/sub-123/plagiarism/result')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status');
  });
});
```

---

## Performance Considerations

- **Large Files (>50MB):** Use streaming to extract text; avoid loading entire file into memory
- **Concurrent Checks:** Plagiarism engine queues up to 10 concurrent checks; queue additional checks in Redis
- **Caching:** Cache plagiarism results for 24 hours; invalidate on resubmission
- **Timeout:** Set 2-minute timeout for checks; notify user if timeout occurs

---

## Security & Privacy

- ✅ Only advisers, instructors, and panelists can trigger checks
- ✅ Students see their own results; archived academic versions hidden
- ✅ All API calls require JWT authentication
- ✅ Rate limiting: 10 checks per user per hour
- ✅ Corpus data encrypted at rest (MongoDB)
- ✅ Plagiarism results expire after 90 days (configurable TTL)

---

## Troubleshooting

**Frontend:** Browser dev tools → Console for logs
**Backend:** `docker logs cms-server` for API logs
**Plagiarism Engine:** `docker logs cms-plagiarism-engine` for engine logs
**Database:** Connect to MongoDB with Compass; query `plagiarism_results` collection

---

## Next Steps

1. ✅ Deploy plagiarism engine Docker container
2. ✅ Mount routes in main Express app
3. ✅ Configure environment variables
4. ✅ Add PlagiarismChecker component to submission review page
5. ✅ Test end-to-end workflow
6. ✅ Monitor performance in production
7. ⏳ Collect student feedback; iterate on UX
