# Production Verification for Filesystem Storage

Complete end-to-end checklist before deploying your CMS with filesystem storage.

## Pre-Deployment Tests

### 1. Run Automated Verification

```bash
node verify-filesystem-storage.js
```

All 10 tests should PASS:
```
✓ Base directory creation
✓ Nested directory creation (chapter path)
✓ Write file to disk
✓ Write metadata JSON
✓ Read file from disk
✓ Verify file size
✓ Avatar upload path creation
✓ Write avatar file
✓ Delete file from disk
✓ Path traversal protection

✓ All tests passed! Filesystem storage is ready.
```

If any fail, check permissions and disk space before continuing.

### 2. Start Server

```bash
npm start
```

Look for this startup message:
```
[Storage] Filesystem mode enabled. Files will be stored in: C:\path\to\uploads
```

If you see an error, verify:
- `STORAGE_MODE=filesystem` in `.env.prod`
- Directory is writable: `icacls ./uploads` (Windows) or `ls -la ./` (Mac/Linux)

### 3. Test Student Upload

1. Open web app: `http://localhost:5173`
2. Log in as **student**
3. Go to your project → Upload Chapter 1
4. Select a PDF file → Click Upload

**Expected behavior:**
- Upload completes successfully
- You see a file link in the UI
- No errors in server console

### 4. Verify File on Disk

```powershell
# Check if file exists
Get-ChildItem -Recurse ./uploads -Filter "*.pdf" | Select-Object FullName, Length

# Should show something like:
# c:\demo\cms\uploads\archives\projects\123abc\chapters\1\v1\chapter.pdf (245678 bytes)
```

### 5. Test Download

Click the file link in the UI. Your browser should:
- Display the PDF
- OR prompt to download

Check server logs for:
```
[StorageFileServer] GET /storage/archives/...
```

### 6. Avatar Upload Test

1. Log in as any user
2. Click profile → Upload avatar
3. Select an image file
4. Submit

Verify on disk:
```powershell
Get-ChildItem -Recurse ./uploads -Filter "profile" | Select-Object FullName, Length
```

Should show avatar files in `avatars/<userid>/profile` directory.

### 7. Verify Metadata

```powershell
# Check metadata files were created
Get-ChildItem -Recurse ./uploads -Filter "*.meta.json"

# View metadata content
Get-Content ./uploads/archives/projects/123abc/chapters/1/v1/chapter.pdf.meta.json
```

Should contain:
```json
{
  "contentType": "application/pdf",
  "uploadedAt": "2026-04-08T12:30:45.123Z",
  "size": 245678
}
```

### 8. Check Server Logs

Verify no errors related to storage:
```
[FilesystemStorageService] Upload successful
[StorageFileServer] File served successfully
```

If you see errors like `EACCES` or `ENOENT`, fix permissions or paths.

## Performance & Capacity

### Disk Space Check

Before production:
```powershell
Get-Volume | Select-Object DriveLetter, SizeRemaining, Size | Format-Table

# If low on space, either:
# 1. Clean old uploads
# 2. Use external drive with symlink
# 3. Increase disk space
```

**Recommended minimum:** 10 GB free

### File Size Limits

Current settings in `.env`:
```env
MAX_UPLOAD_SIZE_MB=25        # Per chapter PDF
MAX_PROTOTYPE_SIZE_MB=50     # Per prototype image/video
```

Files larger than these will be rejected before upload.

### Throughput Test

Upload a 10 MB file and measure speed:
```powershell
$start = Get-Date
# Upload file through UI
$end = Get-Date
$elapsed = ($end - $start).TotalSeconds
Write-Host "Upload time: $elapsed seconds"
Write-Host "Speed: $([math]::Round(10 / $elapsed, 2)) MB/s"
```

Expected: 5-50 MB/s depending on disk type (SSD much faster than HDD).

## Configuration Validation

### Verify Environment

```powershell
# Check that STORAGE_MODE is set
$env:STORAGE_MODE          # Should print 'filesystem'

# Check custom path (if set)
$env:STORAGE_LOCAL_PATH    # Should show path or be empty (defaults to ./uploads)
```

### Check Middleware Mounted

The `/storage` route must be accessible:
```bash
curl http://localhost:5000/storage/
```

Should return 400 (bad path) not 404 (route not found). If 404, the middleware didn't mount.

## Backup & Recovery

### Before Demo Day

**Backup uploads:**
```powershell
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item -Path ./uploads `
          -Destination "./uploads-backup-$timestamp" `
          -Recurse
Write-Host "Backup created: uploads-backup-$timestamp"
```

**Restore (if needed):**
```powershell
Remove-Item -Path ./uploads -Recurse -Force
Copy-Item -Path "./uploads-backup-20260408-143000" `
          -Destination "./uploads" `
          -Recurse
```

## Production Deployment Checklist

- [ ] All 10 verification tests pass
- [ ] Server starts with `[Storage] Filesystem mode enabled` message
- [ ] Student can upload chapter PDF
- [ ] File appears in `./uploads/` on disk
- [ ] File can be downloaded from web UI
- [ ] Avatar uploads work
- [ ] Metadata JSON files created alongside uploads
- [ ] Enough free disk space (minimum 10 GB)
- [ ] Backups created
- [ ] No permission errors in logs
- [ ] `/storage/*` routes working (no 404s)

## Troubleshooting

### Storage initialization fails

```
[FilesystemStorageService] Failed to create base directory
```

**Fix:**
```powershell
# Check permissions
icacls ./uploads

# Or use custom path with known good permissions
# In .env.prod:
STORAGE_LOCAL_PATH=C:\Temp\cms-uploads
```

### Upload returns "Storage directory creation failed"

**Cause:** No write permissions on `./uploads`

**Fix (Windows):**
```powershell
# Check who owns the directory
Get-Acl ./uploads | Select-Object Owner

# Grant full permissions
icacls ./uploads /grant:r "$env:USERNAME`:F" /t /c
```

### File download returns 404

**Check path separator is correct:**
```powershell
# Should use forward slashes in URLs
curl http://localhost:5000/storage/archives/projects/123/chapters/1/v1/file.pdf
```

### Disk fills up quickly

```powershell
# Check largest files
Get-ChildItem -Recurse ./uploads | Sort-Object Length -Descending | Select-Object -First 20 FullName, Length

# Clean test uploads
Remove-Item -Path "./uploads/archives" -Recurse -Force
```

## Switching Back to S3

If you need S3 in the future:

**Edit `.env.prod`:**
```env
STORAGE_MODE=s3
S3_BUCKET=my-production-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
S3_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7...
```

**Restart server.** No code changes needed!

## Success Criteria

✅ All uploads persist to disk  
✅ All downloads work via `/storage/*` routes  
✅ Metadata stored with each file  
✅ No permission errors  
✅ No 404s on file downloads  
✅ Sufficient disk space  
✅ Backups verified  

You're ready for production! 🚀
