# 🚀 Next Steps - Plagiarism Checker Integration

## Quick Start Checklist

### Phase 1: Backend Setup (30 min)

#### Step 1.1: Mount Routes in Express App
**File:** `server/app.js`

```javascript
// Add at top with other imports
import plagiarismRoutes from './modules/plagiarism/plagiarism.routes.js';

// Add after your other route mounts (around line 50-60)
app.use('/api/submissions', plagiarismRoutes);
```

**Verification:**
```bash
npm run dev
# Look for log output confirming routes mounted
# Test: curl http://localhost:3000/api/submissions/test-id/plagiarism/result
```

---

#### Step 1.2: Configure Environment Variables
**File:** `.env` (add these lines)

```env
# Plagiarism Engine
PLAGIARISM_ENGINE_URL=http://localhost:5000
PLAGIARISM_ENGINE_TIMEOUT=120000

# Thresholds (0-100)
PLAGIARISM_WARNING_THRESHOLD=30
PLAGIARISM_REJECT_THRESHOLD=50

# Polling
PLAGIARISM_POLL_INTERVAL=2000
PLAGIARISM_POLL_MAX_ATTEMPTS=60

# Retention
PLAGIARISM_RESULTS_TTL=7776000  # 90 days
```

**Verification:**
```javascript
// In server code
console.log(process.env.PLAGIARISM_ENGINE_URL); // Should print http://localhost:5000
```

---

#### Step 1.3: Verify Plagiarism Engine Running
**Command:**
```bash
docker-compose up plagiarism-engine -d
docker ps | grep plagiarism
```

**Expected Output:**
```
plagiarism-engine   plagiarism_engine   python main.py   Up 2 minutes
```

---

### Phase 2: Frontend Setup (20 min)

#### Step 2.1: Add Component to Submission Review Page
**Find:** Your submission review component (e.g., `SubmissionReview.jsx`)

**Add Component:**
```jsx
// At top
import PlagiarismChecker from '../components/Submissions/PlagiarismChecker';

// In JSX render, after document viewer (approximately line 120-150):
<PlagiarismChecker
  submissionId={submission._id}
  submissionTitle={submission.title}
  onCheckComplete={(result) => {
    // Handle check completion if needed
    console.log('Plagiarism check complete:', result);
  }}
  showMatchDetails={true}
/>
```

**Verification:**
```bash
npm run dev
# Navigate to a submission review page
# Should see "🔍 Plagiarism Analysis" section
# Button should say "▶ Expand"
```

---

#### Step 2.2: Test Component Interaction
**Manual Test:**
1. Open browser to submission review page
2. Click "Expand" on Plagiarism Analysis section
3. Click "🚀 Start Plagiarism Check" button
4. Watch loading spinner
5. Wait for result (should complete in 5-30 sec)
6. Verify similarity % displays with color
7. Verify matched sources appear (if > 0)

**Expected Result:**
- Green indicator for low similarity
- Warning flag if high similarity (>30%)
- List of matched sources

---

### Phase 3: Backend Integration (45 min)

#### Step 3.1: Integrate with Submission Approval Workflow
**File:** `server/modules/submissions/submissions.service.js`

**Find:** The `approveSubmission()` function (should be around line 150-200)

**Add Before Approval:**
```javascript
// At top of file, add import
import { plagiarismService } from '../plagiarism/plagiarism.service.js';

// In approveSubmission function, BEFORE marking as approved:
async function approveSubmission(submissionId, adviserId) {
  const submission = await Submission.findById(submissionId);
  if (!submission) throw new AppError('Submission not found', 404);

  // ✅ NEW: Check plagiarism before approval
  if (process.env.PLAGIARISM_CHECK_REQUIRED === 'true') {
    const plagiarismResult = submission.plagiarismResult;
    
    if (!plagiarismResult) {
      throw new AppError(
        'Plagiarism check required before approval. Please run check first.',
        422
      );
    }

    if (plagiarismResult.similarity_percentage > process.env.PLAGIARISM_REJECT_THRESHOLD) {
      throw new AppError(
        `Similarity too high (${plagiarismResult.similarity_percentage}%). ` +
        `Please request revision or reject submission.`,
        422
      );
    }
  }

  // Index submission in corpus (so future submissions checked against it)
  if (submission.extractedText) {
    await plagiarismService.indexDocument(submissionId, submission.extractedText, {
      title: submission.title,
      author: submission.studentName,
      chapter: submission.chapter,
      project_id: submission.projectId,
      year: new Date().getFullYear(),
    });
  }

  // ✅ Rest of approval workflow continues...
  submission.status = 'approved';
  submission.approvedBy = adviserId;
  submission.approvedAt = new Date();
  await submission.save();

  logger.info(`Submission approved: ${submissionId}`);
}
```

**Environment Variable:**
```env
PLAGIARISM_CHECK_REQUIRED=true  # or false to make optional
PLAGIARISM_REJECT_THRESHOLD=50
```

**Verification:**
```bash
# Test approval endpoint with high similarity
# Should throw error: "Similarity too high"
curl -X POST http://localhost:3000/api/submissions/sub-123/approve \
  -H "Authorization: Bearer TOKEN" \
  # Response should have error about high similarity
```

---

#### Step 3.2: Enhance Submission Model
**File:** `server/modules/submissions/submissions.model.js`

**Add Fields to Schema:**
```javascript
// Add to Schema definition
plagiarismTaskId: String,         // Task ID from plagiarism engine
plagiarismStatus: {
  type: String,
  enum: ['pending', 'completed', 'failed'],
  default: null,
},
plagiarismResult: {
  similarity_percentage: Number,
  text_matches: [Object],
  checked_at: Date,
  warning_flag: Boolean,
},
plagiarismIndexed: {
  type: Boolean,
  default: false,
},
extractedText: String,            // Store extracted text for corpus indexing
```

**Add Index:**
```javascript
// Improve query performance
submissionSchema.index({ plagiarismTaskId: 1 });
submissionSchema.index({ plagiarismStatus: 1 });
```

---

#### Step 3.3: Add Text Extraction Function
**File:** `server/utils/textExtraction.js` (NEW FILE)

```javascript
/**
 * Extract text from PDF or DOCX files
 */

import pdfParse from 'pdf-parse';
import { parseBuffer as parseDocx } from 'docx-parser';
import fs from 'fs';
import path from 'path';

export async function extractTextFromFile(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.pdf') {
      const data = await pdfParse(buffer);
      return data.text;
    } else if (ext === '.docx') {
      const data = await parseDocx({ buffer });
      return data.text || data.toString();
    } else {
      throw new Error(`Unsupported file format: ${ext}`);
    }
  } catch (error) {
    throw new Error(`Text extraction failed: ${error.message}`);
  }
}
```

**Install Dependencies:**
```bash
npm install pdf-parse docx-parser
```

---

### Phase 4: Testing (30 min)

#### Step 4.1: Unit Test - API Endpoints

**File:** `server/tests/integration/plagiarism.test.js` (NEW FILE)

```javascript
const request = require('supertest');
const app = require('../../app');
const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');

describe('Plagiarism Checker Endpoints', () => {
  let submissionId = 'test-submission-123';
  let token = 'valid-jwt-token'; // Replace with real token

  it('should start plagiarism check', async () => {
    const response = await request(app)
      .post(`/api/submissions/${submissionId}/plagiarism/check`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        text: 'This is a sample submission text...',
        title: 'Chapter 1',
        chapter: 'Chapter 1',
        projectId: 'proj-456',
      });

    expect(response.status).toBe(202);
    expect(response.body.success).toBe(true);
    expect(response.body.taskId).toBeDefined();
  });

  it('should get plagiarism result', async () => {
    const response = await request(app)
      .get(`/api/submissions/${submissionId}/plagiarism/result`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(['pending', 'completed', 'failed']).toContain(response.body.status);
  });
});
```

**Run Test:**
```bash
npm test -- plagiarism.test.js
```

---

#### Step 4.2: Browser Test - Full Workflow

**Checklist:**
```
[ ] Open submission review page
[ ] Plagiarism section visible
[ ] Click "Expand" button
[ ] Click "Start Plagiarism Check"
[ ] Loading spinner appears
[ ] Result loads after 5-30 seconds
[ ] Similarity percentage displays
[ ] Color coding matches threshold
[ ] Matched sources appear (if any)
[ ] Can see excerpt from matched source
[ ] Click "Approve" successfully indexes
[ ] Log message shows "Submission indexed"
```

---

#### Step 4.3: Edge Case Testing

**Large File (>50MB):**
```javascript
// Should use streaming, not buffer entire file
const stream = fs.createReadStream(largeFile.pdf);
// Extract text incrementally
```

**Timeout Simulation:**
```javascript
// Delay the plagiarism engine response
// Verify frontend polling continues
// Verify timeout after max attempts (60 × 2s = 120s)
```

**RBAC Testing:**
```
[ ] Student can view their result
[ ] Student cannot trigger check
[ ] Student cannot approve/index
[ ] Adviser can do all actions
[ ] Instructor can do all actions
[ ] Panelist cannot approve/index
```

---

### Phase 5: Deployment (15 min)

#### Step 5.1: Verify Production Configuration
**File:** `.env.production`

```env
PLAGIARISM_ENGINE_URL=$PLAGIARISM_ENGINE_SERVICE_URL  # From Docker network
PLAGIARISM_RESULTS_TTL=7776000  # 90 days
PLAGIARISM_WARNING_THRESHOLD=30
PLAGIARISM_REJECT_THRESHOLD=50
PLAGIARISM_POLL_INTERVAL=2000
PLAGIARISM_POLL_MAX_ATTEMPTS=60
```

**Docker Compose:**
```yaml
# In docker-compose.prod.yml, add or verify plagiarism service
plagiarism-engine:
  build: ./plagiarism_engine
  container_name: cms-plagiarism-engine
  ports:
    - "5000:5000"
  environment:
    ENVIRONMENT: production
  volumes:
    - plagiarism_data:/data
  restart: always
  networks:
    - cms-network

volumes:
  plagiarism_data:

networks:
  cms-network:
```

---

#### Step 5.2: Deploy
```bash
# Build Docker images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Verify all running
docker-compose ps

# View logs
docker-compose logs -f cms-server
docker-compose logs -f plagiarism-engine
```

---

#### Step 5.3: Monitor in Production
```bash
# Watch for errors
docker logs cms-server | grep -i plagiarism

# Check plagiarism engine health
curl http://plagiarism-engine:5000/health

# Monitor MongoDB
mongo cms-prod collections plagiarism_results --count
```

---

## 📊 Summary of Changes

| Component | Status | Files |
|-----------|--------|-------|
| Backend API | ✅ Complete | plagiarism.controller.ts, routes.ts |
| Frontend Component | ✅ Complete | PlagiarismChecker.jsx |
| Frontend Service | ✅ Complete | plagiarism.service.js |
| Data Model | ✅ Complete | plagiarism.model.ts |
| Documentation | ✅ Complete | PLAGIARISM_INTEGRATION_GUIDE.md |
| Routes Mounting | ⏳ TODO | server/app.js |
| Approval Integration | ⏳ TODO | submissions.service.js |
| Environment Config | ⏳ TODO | .env |
| UI Integration | ⏳ TODO | submission-review page |
| Text Extraction | ⏳ TODO | Create utils/textExtraction.js |

---

## ⏱️ Time Estimates

- Phase 1 (Backend Setup): **30 minutes**
- Phase 2 (Frontend Setup): **20 minutes**
- Phase 3 (Integration): **45 minutes**
- Phase 4 (Testing): **30 minutes**
- Phase 5 (Deployment): **15 minutes**

**Total: ~2.5 hours** for full integration and testing

---

## 🆘 Troubleshooting

**"Routes not mounting"**
→ Check `app.use('/api/submissions', plagiarismRoutes)` is called
→ Restart dev server with `npm run dev`

**"Plagiarism engine not responding"**
→ Verify `docker-compose up plagiarism-engine` is running
→ Check `PLAGIARISM_ENGINE_URL` in `.env`
→ Test: `curl http://localhost:5000/health`

**"Component not appearing"**
→ Check component import path is correct
→ Verify JSX placement in render
→ Check browser console for errors

**"Approval fails with plagiarism error"**
→ Check `PLAGIARISM_CHECK_REQUIRED=true` in `.env`
→ Check threshold values in `.env`
→ Ensure plagiarism result stored in MongoDB

---

## ✅ Success Criteria

When you see this, integration is complete:

✅ "🔍 Plagiarism Analysis" section visible on submission page
✅ "🚀 Start Plagiarism Check" button clickable
✅ Result displays with similarity % and color coding
✅ Matched sources appear in expandable list
✅ Adviser can approve when similarity < threshold
✅ Submission indexed in corpus (visible to future checks)
✅ No console errors

---

**Ready to integrate? Start with Phase 1, Step 1.1!** 🚀

For detailed reference, see `docs/PLAGIARISM_INTEGRATION_GUIDE.md`
