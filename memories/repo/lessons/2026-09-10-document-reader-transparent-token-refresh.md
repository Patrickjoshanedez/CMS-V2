# Lesson: In-App Document Reader Authentication & Transparent Token Refresh (2026-09-10)

## Problem Summary
When reviewing manuscripts in `SophisticatedDocumentViewer`, users encountered a sudden render error:
`Document Render Failed: Server returned 401: Unauthorized` with `[Retry]` and `[Download Instead]` options. Clicking `[Retry]` or `[Download Instead]` failed repeatedly with the same 401 error.

## Root Cause Analysis
1. **Unauthenticated Raw Fetch**: `DocxPreviewRenderer` in `SophisticatedDocumentViewer.jsx` called native `window.fetch(streamFileUrl, { credentials: 'include' })`.
2. **Missing Interceptor Handshake**: CMS-V2 JWT access tokens in the `accessToken` cookie expire after 15 minutes. The centralized Axios API client (`services/api.js`) contains an automatic 401 response interceptor that transparently calls `/auth/refresh` and replays pending requests. Native `window.fetch` completely bypassed this interceptor, immediately throwing an unrecoverable 401 on token expiry.
3. **Unused File Prop**: `streamFileUrl` hardcoded `/api/submissions/${submission._id}/file` without checking `fallbackFileUrl` (`fileUrl` prop passed from callers).
4. **Raw Link Downloads**: `handleDownload` created an `<a href="${streamFileUrl}?download=true">` element instead of using `submissionService.downloadFile(submissionId, fileName)`, which utilizes Axios with automatic token refresh and blob object URL generation.

## Resolution & Implementation
1. **Authenticated API Binary Streaming**: Replaced raw `fetch` in `DocxPreviewRenderer` with `api.get('/submissions/' + submissionId + '/file', { responseType: 'arraybuffer', signal })`. When external pre-signed URLs are provided (`http://` or `https://`), it attempts direct retrieval and gracefully falls back to the authenticated API endpoint if storage signatures expire or encounter CORS errors.
2. **Fallback Prop Prioritization**: Configured `streamFileUrl = fallbackFileUrl || (submission?._id ? '/api/submissions/' + submission._id + '/file' : null)`.
3. **Secure PDF Streaming**: In `SophisticatedDocumentViewer`, integrated authenticated blob retrieval via `api.get` with `URL.createObjectURL` and automatic unmount cleanup (`URL.revokeObjectURL`), eliminating iframe cookie desynchronization.
4. **Authenticated Download Execution**: Updated `handleDownload` to call `submissionService.downloadFile(submission._id, fileName)`.

## Prevention Rules & Checklist
1. **Prevention rule**: NEVER use raw `window.fetch` for authenticated CMS-V2 backend endpoints. Always use the canonical `api` Axios client from `@/services/api` or dedicated service modules (`submissionService`) to preserve automatic 401 refresh token interceptors.
2. **Prevention rule**: If external pre-signed URLs are supported, always implement an automatic fallback to the internal authenticated proxy endpoint (`/api/submissions/:id/file`) in case of container DNS, CORS, or signature expiration issues.
3. **Runbook**: In document renderers, fetch binary data via `api.get(endpoint, { responseType: 'arraybuffer' })` for DOCX OOXML structures, and `api.get(endpoint, { responseType: 'blob' })` with `URL.createObjectURL` for PDF iframe streaming. Clean up object URLs on component unmount.
4. **Evidence & Verification passed**:
   - 8/8 unit tests passed in `client/src/components/documents/SophisticatedDocumentViewer.test.jsx`.
   - 12/12 unit tests passed in `client/src/pages/submissions/`.
   - API route parity verified: 201 Server / 179 Client (`UNMATCHED_COUNT = 0`).
   - Agentic system governance verified: 60/60 checks passed.
   - Governance pipeline verified: 0 errors, 0 warnings.
   - Playwright visual audit passed in `scratch/document_reader_visual_audit.mjs` verifying embedded reader, fullscreen reader, and mobile viewports across light and dark modes with zero render errors.
