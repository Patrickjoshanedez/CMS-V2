# Lesson: Submission Uploads Unreadable in Manual Dev Testing

Date: 2026-04-09

- Symptom: Submission uploads succeeded, but files were unreadable during manual dev testing.
- Effective prevention: Ensure Vite dev proxy forwards /storage to backend when filesystem storage emits /storage URLs.
- Effective prevention: Keep filesystem adapter key resolution supporting absolute paths, relative paths, and /storage-prefixed keys; enforce traversal guard.
- Verification: Run unit filesystem key-resolution tests.
- Verification: Run verify-filesystem-storage.js.
- Verification: Run targeted submissions integration tests including the view endpoint filter.
