# Google Docs Integration: Full Implementation Guide

## Overview

The CMS now supports full Google Docs integration with template cloning and edit permissions. Students can submit documents that are automatically:

1. **Cloned from a master template** → Creates Google Docs in Google Drive
2. **Given edit permissions** → Students receive shareable links they can edit in real-time
3. **Tracked in audit logs** → All Google Docs operations are logged for security compliance

## Architecture

### Three-Layer Integration

```
┌─────────────────────────────────────────────────────────────┐
│ Submission Service (submission.service.js)                  │
│ - Orchestrates upload workflow                              │
│ - Calls Google Drive sync for each submission               │
│ - Logs to audit trail on success/failure                    │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────▼──────────────────────────────────────────┐
        │ Google Drive Review Service                        │
        │ (google-drive-review.service.js)                   │
        │                                                     │
        │ 1. createFromTemplate()                            │
        │    - Clones master template doc                    │
        │    - Returns cloned doc ID                         │
        │    - Implements exponential backoff + jitter       │
        │                                                     │
        │ 2. setAnyoneCanEditPermission()                    │
        │    - Sets "Anyone Can Edit" on cloned doc          │
        │    - Returns shareable edit URL                    │
        │    - Validates document exists before setting      │
        └────────┬───────────────────────────────────────────┘
                 │
        ┌────────▼──────────────────────────────────────────┐
        │ Google Drive API (googleapis npm package)          │
        │ - files.copy() for template cloning                │
        │ - permissions.create() for edit access            │
        │ - Rate limiter: exponential backoff + jitter      │
        └──────────────────────────────────────────────────┘
```

### Submission Fields

The Submission model stores Google Docs metadata in these fields:

```javascript
{
  // Cloned Google Doc information
  syncedGoogleDocId: String,        // ID of cloned doc
  syncedGoogleDocUrl: String,       // Edit link (https://docs.google.com/document/d/{id}/edit)
  
  // Sync status
  googleDocSyncStatus: String,      // 'synced' | 'not_requested' | 'not_supported' | 'failed'
  googleDocSyncErrorCode: String,   // Machine-readable error (e.g., 'TEMPLATE_NOT_FOUND')
  googleDocSyncErrorMessage: String, // Human-readable error message
  googleDocSyncedAt: Date,          // When sync completed
}
```

## Setup Instructions

### Step 1: Create Master Template in Google Drive

1. Go to [Google Drive](https://drive.google.com)
2. Create a new Google Doc with:
   - Professional formatting (fonts, margins, styles)
   - Placeholder text like "**Title:** [Student Name]", "**Chapter:** [Chapter Number]"
   - Any required sections (Headers, TOC template, Signature blocks)
3. Copy the document ID from the URL:
   ```
   https://docs.google.com/document/d/{DOCUMENT_ID}/edit
   ```

### Step 2: Create Template Storage Folder

1. Create a folder in Google Drive (e.g., "CMS - Document Templates")
2. Move your template doc into this folder
3. Copy the folder ID from the URL:
   ```
   https://drive.google.com/drive/folders/{FOLDER_ID}
   ```

### Step 3: Set Up Service Account

If you haven't already, set up Google Service Account authentication:

```bash
# 1. Go to Google Cloud Console
# 2. Create a Service Account
# 3. Download the JSON key file
# 4. Extract these values:
cat /path/to/service-account-key.json | jq '.private_key'
cat /path/to/service-account-key.json | jq '.client_email'
```

### Step 4: Configure Environment Variables

Add these to your `.env` file:

```env
# Google Drive Service Account (existing)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Google Drive folder configuration (existing)
GOOGLE_DRIVE_FOLDER_ID=root-folder-id-here
GOOGLE_DRIVE_CAPSTONE_DOCS_FOLDER_ID=capstone-docs-folder-id
GOOGLE_DRIVE_TEMPLATE_FOLDER_ID=template-storage-folder-id

# NEW: Master template document ID
GOOGLE_DRIVE_TEMPLATE_FULL_PAPER_ID=your-master-template-doc-id-here
```

### Step 5: Grant Service Account Access

1. Open your master template in Google Drive
2. Click "Share"
3. Add the service account email with **Editor** role
4. Do the same for the template folder

## How It Works

### Upload Flow

```
Student uploads file
        │
        ├─► S3 storage (file backup)
        │
        └─► Google Drive Sync:
            ├─► Check Google Drive is configured
            ├─► Check template is configured
            ├─► Clone master template
            │   └─► Call createFromTemplate()
            │        └─► API: files.copy()
            │            └─► Handle rate limits with backoff + jitter
            ├─► Set edit permissions
            │   └─► Call setAnyoneCanEditPermission()
            │        └─► API: permissions.create(type='anyone', role='writer')
            ├─► Log success to audit trail
            └─► Store sync metadata in submission record
```

### Error Handling

If Google Docs sync fails:

1. **Audit logs the failure** with error code and message
2. **Upload continues** anyway (graceful degradation)
3. **Sync fields show failure status**:
   ```javascript
   {
     syncedGoogleDocId: null,
     googleDocSyncStatus: 'failed',
     googleDocSyncErrorCode: 'TEMPLATE_NOT_FOUND',
     googleDocSyncErrorMessage: 'Template document not found (ID: ...)'
   }
   ```
4. Student can still download file from S3, and adviser can retry sync manually

### Rate Limiting

The service implements **exponential backoff with jitter** per Google API best practices:

```javascript
// Backoff sequence: 1s, 2s, 4s, 8s, 16s (capped at 30s)
// Jitter: ±25% to prevent "thundering herd"
baseBackoff = Math.min(1000 * 2^(attempt-1), 30000)
actualBackoff = baseBackoff + (baseBackoff * 0.25 * random())
```

This handles:
- **429 (Quota Exceeded)**: Google Drive daily quota limits
- **500 (Internal Error)**: Google API transient failures
- **502/503/504 (Gateway/Service Unavailable)**: Network issues

With a max of 5 attempts, the service won't retry forever.

## API Methods

### createFromTemplate(templateDocId, newFileName, destinationFolderId)

Clone a Google Doc template.

**Parameters:**
- `templateDocId` (string, required) - ID of master template doc
- `newFileName` (string, required) - Name for cloned document
- `destinationFolderId` (string, optional) - Where to store cloned doc

**Returns:**
```javascript
{
  clonedDocId: "1a2b3c...",
  name: "My Chapter - v1",
  editUrl: "https://docs.google.com/document/d/1a2b3c.../edit",
  previewUrl: "https://docs.google.com/document/d/1a2b3c.../preview"
}
```

**Errors:**
- `TEMPLATE_NOT_FOUND` (404) - Template doc doesn't exist
- `DESTINATION_FOLDER_NOT_CONFIGURED` (503) - No destination folder set
- `GOOGLE_REVIEW_NOT_CONFIGURED` (503) - Service account not configured
- `QUOTA_EXCEEDED` (429) - Google Drive quota limit hit (auto-retries)

### setAnyoneCanEditPermission(fileId)

Set "Anyone Can Edit" permission on a Google Doc.

**Parameters:**
- `fileId` (string, required) - ID of document to share

**Returns:**
```javascript
{
  fileId: "1a2b3c...",
  permissionId: "12345abc...",
  editUrl: "https://docs.google.com/document/d/1a2b3c.../edit",
  shareableLink: "https://docs.google.com/document/d/1a2b3c.../edit",
  permissionSet: true
}
```

**Errors:**
- `FILE_ID_MISSING` (400) - No file ID provided
- `DOCUMENT_NOT_FOUND` (404) - Document doesn't exist in Drive
- `PERMISSION_DENIED` (403) - Service account lacks editor access
- `QUOTA_EXCEEDED` (429) - Google Drive quota limit hit (auto-retries)

## Testing

### Manual Test: Verify Configuration

```bash
# Check environment variables are set
echo $GOOGLE_DRIVE_TEMPLATE_FULL_PAPER_ID
echo $GOOGLE_DRIVE_TEMPLATE_FOLDER_ID

# Verify service account has access
# Try uploading a test document via the CMS UI
```

### Automated Test: Create from Template

Create a test file at `server/modules/submissions/__tests__/google-docs.integration.test.js`:

```javascript
import googleDriveReviewService from '../../../services/google-drive-review.service.js';
import env from '../../../config/env.js';

describe('Google Docs Integration', () => {
  it('should clone a template document', async () => {
    const result = await googleDriveReviewService.createFromTemplate(
      env.GOOGLE_DRIVE_TEMPLATE_FULL_PAPER_ID,
      'Test Clone - Chapter 1',
      env.GOOGLE_DRIVE_TEMPLATE_FOLDER_ID
    );

    expect(result).toHaveProperty('clonedDocId');
    expect(result).toHaveProperty('editUrl');
    expect(result.editUrl).toContain('docs.google.com');
  });

  it('should set anyone can edit permission', async () => {
    // First create a test doc
    const cloned = await googleDriveReviewService.createFromTemplate(
      env.GOOGLE_DRIVE_TEMPLATE_FULL_PAPER_ID,
      'Test Permission - Chapter 2',
      env.GOOGLE_DRIVE_TEMPLATE_FOLDER_ID
    );

    // Set permission
    const result = await googleDriveReviewService.setAnyoneCanEditPermission(
      cloned.clonedDocId
    );

    expect(result).toHaveProperty('permissionId');
    expect(result.permissionSet).toBe(true);
  });
});
```

Run with:
```bash
npm run test -- google-docs.integration.test.js
```

## Audit Trail

All Google Docs operations are logged to the audit trail with action codes:

### Success Logs

```javascript
{
  action: 'submission.google_docs_created',
  targetType: 'Submission',
  description: 'Created Google Doc for chapter submission (v1): 1a2b3c...',
  metadata: {
    googleDocId: '1a2b3c...',
    projectId: '...',
    version: 1,
    type: 'chapter',
    fileName: 'Chapter 1 - v1'
  }
}
```

### Failure Logs

```javascript
{
  action: 'submission.google_docs_creation_failed',
  targetType: 'Submission',
  description: 'Failed to create Google Doc for chapter submission (v1): TEMPLATE_NOT_FOUND',
  metadata: {
    projectId: '...',
    version: 1,
    type: 'chapter',
    error: 'TEMPLATE_NOT_FOUND',
    errorMessage: 'Template document not found (ID: wrong-id)'
  }
}
```

Query audit logs:
```bash
# In code:
const logs = await auditService.queryLogs({
  action: 'submission.google_docs',
  targetType: 'Submission',
  limit: 100
});
```

## Troubleshooting

### Error: "Template document not found"

**Cause:** Template ID is incorrect or template was deleted

**Solution:**
1. Verify `GOOGLE_DRIVE_TEMPLATE_FULL_PAPER_ID` is correct
2. Open template in Google Drive and copy ID from URL
3. Verify service account has access (Share → Add service account email)

### Error: "Destination folder not configured"

**Cause:** `GOOGLE_DRIVE_TEMPLATE_FOLDER_ID` is missing or empty

**Solution:**
1. Create a folder in Google Drive for storing cloned templates
2. Copy folder ID from URL
3. Add to `.env` and restart server

### Error: "Permission denied"

**Cause:** Service account is not an editor on the template or folder

**Solution:**
1. Open template → Share
2. Add service account email: `xxxx@iam.gserviceaccount.com`
3. Grant **Editor** role
4. Repeat for template folder

### Error: "QUOTA_EXCEEDED" (429)

**Cause:** Google Drive API quota limit hit (typically 1M quota units/day)

**Solution:**
1. Service automatically retries with backoff
2. Check Google Cloud Console for quota usage
3. Request quota increase if needed
4. Monitor peak upload times

### Sync status shows "not_supported"

**Cause:** Google Drive not configured or document type not syncable

**Solution:**
- Check Google integration is enabled
- Verify template ID is set
- Only syncs: chapter, proposal, final_academic, final_journal

## Security Considerations

### RBAC & Access Control

The Google Docs integration respects role-based access:

- **Students**: Can view/edit their own Google Docs
- **Advisers**: Can view/comment on student Google Docs
- **Instructors**: Have full access to all Google Docs

The `setAnyoneCanEditPermission()` method creates a **public edit link** but only for documents created in the CMS. Students receive this link in their submission notification.

### Data Privacy

- Template folder IDs and master template IDs stored in env (not in code/Git)
- Audit logs track WHO created each Google Doc and WHEN
- Google Docs are stored in institutional Google Drive account
- Students can't delete or move Google Docs once created

### OAuth Lifecycle

Service account credentials:
- No user login required (service account JWT)
- Credentials refresh automatically
- No user consent flow
- Scoped to `https://www.googleapis.com/auth/drive` only

## Monitoring & Metrics

Track these metrics in your monitoring dashboard:

```javascript
// Per day:
- Google Docs created successfully
- Google Docs creation failures (by error type)
- Permission setting operations
- Average API response time
- Quota usage (API units)
- Retry counts and backoff waits
```

Example Prometheus metrics:
```
cms_google_docs_created_total{status="success"} 42
cms_google_docs_created_total{status="failed"} 3
cms_google_docs_permission_set_total 45
cms_google_drive_api_duration_seconds{method="files.copy"} 0.234
cms_google_drive_quota_units_used_total 12345
```

## Rollback

To disable Google Docs temporarily:

1. Remove or comment out `GOOGLE_DRIVE_TEMPLATE_FULL_PAPER_ID` in `.env`
2. Restart server
3. New submissions will have `googleDocSyncStatus: 'not_supported'`
4. Existing submissions unaffected

To completely remove:

1. Remove imports of `googleDriveReviewService` from submission.service.js
2. Set `_syncSubmissionToUserDriveAndGoogleDoc` to return all nulls
3. Remove methods from google-drive-review.service.js
4. Remove env vars from `.env` and config

## References

- [Google Drive API - Copy Files](https://developers.google.com/drive/api/guides/manage-uploads)
- [Google Drive API - Permissions](https://developers.google.com/drive/api/guides/manage-sharing)
- [Google API Rate Limiting](https://developers.google.com/drive/api/guides/handle-errors#exponential-backoff)
- [googleapis npm package](https://github.com/googleapis/google-api-nodejs-client)
