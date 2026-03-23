# Google Docs Integration - Verification Checklist

This checklist helps you verify that the Google Docs integration is working correctly.

## Pre-Flight Checklist

- [ ] Service account credentials are configured in `.env`
- [ ] Master template Google Doc ID is set in `GOOGLE_DRIVE_TEMPLATE_FULL_PAPER_ID`
- [ ] Template folder ID is set in `GOOGLE_DRIVE_TEMPLATE_FOLDER_ID`
- [ ] Service account has Editor access to master template
- [ ] Service account has Editor access to template folder
- [ ] Server has been restarted after `.env` changes

## Code Verification

### 1. Check API Methods Exist

```bash
# Verify createFromTemplate method exists
grep -n "createFromTemplate" server/services/google-drive-review.service.js
# Expected: Should find the method definition

# Verify setAnyoneCanEditPermission method exists
grep -n "setAnyoneCanEditPermission" server/services/google-drive-review.service.js
# Expected: Should find the method definition
```

### 2. Check Imports in Submission Service

```bash
grep -n "googleDriveReviewService" server/modules/submissions/submission.service.js
# Expected: Should see import and usage

grep -n "auditService" server/modules/submissions/submission.service.js
# Expected: Should see import for audit logging
```

### 3. Check Submission Model Has Fields

```bash
grep -n "syncedGoogleDocId" server/modules/submissions/submission.model.js
# Expected: Should find all Google Doc fields

grep -n "googleDocSyncStatus" server/modules/submissions/submission.model.js
# Expected: Should find enum with 'synced', 'not_requested', 'not_supported', 'failed'
```

## Unit Test Verification

```bash
# Run Google Docs integration tests
cd server
npm run test -- modules/submissions/__tests__/google-docs.integration.test.js

# Expected output:
# ✓ GoogleDriveReviewService > Configuration Check
# ✓ createFromTemplate()
# ✓ setAnyoneCanEditPermission()
# ✓ Full Workflow
# ✓ SubmissionService Google Docs Sync
```

## Manual Integration Test

### Test 1: Verify Configuration Loading

```javascript
// In Node REPL:
import env from './server/config/env.js';
console.log('Template ID:', env.GOOGLE_DRIVE_TEMPLATE_FULL_PAPER_ID);
console.log('Template Folder:', env.GOOGLE_DRIVE_TEMPLATE_FOLDER_ID);
// Expected: Both should have values
```

### Test 2: Clone a Template Document

```javascript
import googleDriveReviewService from './server/services/google-drive-review.service.js';
import env from './server/config/env.js';

const cloned = await googleDriveReviewService.createFromTemplate(
  env.GOOGLE_DRIVE_TEMPLATE_FULL_PAPER_ID,
  `Test Document ${Date.now()}`,
  env.GOOGLE_DRIVE_TEMPLATE_FOLDER_ID
);

console.log('Cloned Doc ID:', cloned.clonedDocId);
console.log('Edit URL:', cloned.editUrl);

// Expected: Returns a clonedDocId and valid edit URL
// You should be able to open the edit URL in a browser and see the cloned doc
```

### Test 3: Set Edit Permission

```javascript
const permission = await googleDriveReviewService.setAnyoneCanEditPermission(
  cloned.clonedDocId
);

console.log('Permission Set:', permission.permissionSet);
console.log('Share URL:', permission.shareableLink);

// Expected: permissionSet should be true
// You should be able to share the URL with anyone and they can edit
```

### Test 4: Full Submission Upload Flow

1. Open the CMS UI
2. Login as a student
3. Navigate to "Upload Chapter"
4. Upload a PDF file
5. Submit the form
6. Verify in MongoDB:

```javascript
// In MongoDB console:
db.submissions.findOne({ 
  submittedBy: ObjectId("student-id")
}).pretty()

// Expected fields should exist:
// {
//   syncedGoogleDocId: "1a2b3c...",
//   syncedGoogleDocUrl: "https://docs.google.com/document/d/...",
//   googleDocSyncStatus: "synced",
//   googleDocSyncedAt: ISODate(...)
// }
```

### Test 5: Audit Trail Logging

```javascript
// In MongoDB console:
db.auditlogs.find({ 
  action: { $regex: 'submission.google_docs' }
}).pretty()

// Expected: Should see entries like:
// {
//   action: "submission.google_docs_created",
//   description: "Created Google Doc for chapter submission (v1): 1a2b3c...",
//   metadata: { googleDocId: "1a2b3c...", ... }
// }
```

## Error Scenario Testing

### Scenario 1: Template Not Found

```javascript
// Try to clone with wrong template ID
await googleDriveReviewService.createFromTemplate(
  'wrong-template-id-12345',
  'Test',
  env.GOOGLE_DRIVE_TEMPLATE_FOLDER_ID
);

// Expected: Throws error with message "Template document not found (ID: wrong-template-id-12345)"
```

Then verify in audit logs:
```javascript
db.auditlogs.findOne({ 
  action: 'submission.google_docs_creation_failed' 
})
// Should have error details in metadata
```

### Scenario 2: No Service Account Configured

```javascript
// Temporarily set credentials to empty
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = '';
process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = '';

// Try to upload
// Expected: googleDocSyncStatus = 'not_supported' (graceful degradation)
// Expected: Submission upload still succeeds with S3 backup
```

### Scenario 3: Folder Not Configured

```javascript
// Temporarily empty the folder ID
process.env.GOOGLE_DRIVE_TEMPLATE_FOLDER_ID = '';

// Try to upload
// Expected: Throws error "Destination folder not configured"
// Expected: Audit log shows failure with error code
```

## Performance Verification

### Test Rate Limiting

When Google Drive quota is exceeded (429 error), the service should:
1. Retry automatically with exponential backoff
2. Wait: 1s, 2s, 4s, 8s, 16s (with jitter)
3. Try up to 5 times

To verify this is working:
```javascript
// Monitor server logs during high upload volume
// Look for:
// [GoogleDocs] Cloning template...
// [GoogleDocs] Retry attempt 2/5 after backoff...
// [GoogleDocs] Setting edit permission...

// This indicates retry logic is active
```

## Cleanup

After testing, clean up test documents:

```javascript
// Option 1: Delete from Google Drive UI
// Go to GOOGLE_DRIVE_TEMPLATE_FOLDER_ID and delete test docs manually

// Option 2: Query MongoDB for test submissions
db.submissions.deleteMany({
  syncedGoogleDocUrl: { $regex: 'Test Document' }
})
```

## Troubleshooting Guide

| Symptom | Cause | Solution |
|---------|-------|----------|
| `googleDocSyncStatus: 'not_supported'` | Service not configured | Check `.env` has all credentials |
| `TEMPLATE_NOT_FOUND` error | Wrong template ID | Verify `GOOGLE_DRIVE_TEMPLATE_FULL_PAPER_ID` |
| `DESTINATION_FOLDER_NOT_CONFIGURED` | Missing folder ID | Check `GOOGLE_DRIVE_TEMPLATE_FOLDER_ID` |
| `PERMISSION_DENIED` 403 | Service account lacks editor access | Grant editor role to service account on template |
| Slow uploads / timeouts | Google Drive quota limit | Service retries with backoff; check quota in Cloud Console |
| Audit logs show failures | Check metadata.error field | See error code and message in metadata |

## Production Checklist

- [ ] All environment variables are set correctly
- [ ] Service account has proper IAM roles
- [ ] Template document is locked (prevent accidental editing)
- [ ] Monitoring dashboard includes Google Docs metrics
- [ ] Backup procedure includes Google Drive audit logs
- [ ] Runbook includes Google Docs troubleshooting steps
- [ ] Team knows how to disable feature if needed (remove env var)
- [ ] Rate limiting alerts configured (if quota > 80%)
- [ ] Disaster recovery plan includes Google Drive

## Success Criteria

✅ All tests pass
✅ Student can upload document
✅ Google Doc is automatically created and cloned from template
✅ Student receives shareable edit link
✅ Adviser can view and comment on Google Doc
✅ Audit trail logs all operations
✅ Integration gracefully degrades if service unavailable
✅ No performance impact on S3 upload path

---

**Questions?** See `docs/GOOGLE_DOCS_INTEGRATION.md` for full documentation.
