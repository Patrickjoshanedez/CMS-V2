# Filesystem Storage Setup for Laptop Deployment

You can now use your laptop's disk for all file uploads instead of S3! This is perfect for your capstone project.

## Quick Start

### 1. Enable Filesystem Storage

Edit `.env.prod` and set:

```env
STORAGE_MODE=filesystem
```

Optional: Customize upload directory (defaults to `./uploads` in repo root):
```env
STORAGE_LOCAL_PATH=/path/to/custom/uploads
```

### 2. Start the Server

```bash
npm start
```

Files will automatically be uploaded to `./uploads` on your laptop.

## How It Works

When you upload a file (PDF, image, etc.):

1. **Upload path** → File saved to `./uploads/archives/projects/...`
2. **Download URL** → API returns `/storage/archives/projects/...`
3. **File serving** → Express serves the file directly from disk via `/storage` route

### Example File Locations

After uploading a chapter PDF for project `123`:

```
uploads/
├── archives/
│   └── projects/
│       └── 123/
│           └── chapters/
│               └── 1/
│                   └── v1/
│                       └── chapter.pdf
```

Access it via: `http://localhost:43210/storage/archives/projects/123/chapters/1/v1/chapter.pdf`

## Metadata

Each uploaded file gets metadata stored alongside it:

```
chapter.pdf                    ← Actual file
chapter.pdf.meta.json         ← Metadata (size, contentType, timestamp)
```

## Troubleshooting

### File uploads slow / disk getting full?

Check storage usage:
```powershell
# PowerShell
Get-ChildItem -Path ./uploads -Recurse | Measure-Object -Property Length -Sum
```

### Files not appearing?

1. Check logs for `[FilesystemStorageService]` messages
2. Verify `STORAGE_LOCAL_PATH` directory exists and is writable
3. Ensure `STORAGE_MODE=filesystem` in `.env.prod`

### Want to switch back to S3?

Just change `.env.prod`:
```env
STORAGE_MODE=s3
```

And restart. No code changes needed!

## Switching Between Storage Modes

Your code fully supports both modes. Switch anytime by changing `STORAGE_MODE`:

```env
# Development laptop setup
STORAGE_MODE=filesystem

# Production AWS
STORAGE_MODE=s3
S3_BUCKET=my-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-key
S3_SECRET_ACCESS_KEY=your-secret
```

## Technical Details

- **Import path**: Modules now import from `services/storage.index.js`
- **Adapter**: `services/filesystem-storage.service.js` implements the same interface as `storage.service.js`
- **Static serving**: `middleware/storage-file-server.middleware.js` handles `/storage/*` requests
- **No external dependencies**: Uses only Node.js `fs` module

Everything is drop-in compatible — no other code changes needed!
