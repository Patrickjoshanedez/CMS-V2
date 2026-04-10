# Lesson: Document Editor Tests Must Keep Params and Hook Payloads Aligned

Date: 2026-04-09

- When testing DocumentEditorPage, mock both `useParams()` and `useManuscriptOpenLink()` with matching `documentType`/`docId` data.
- If a test changes the route branch from chapter to proposal, update the mocked manuscript payload in the same test or the page will render stale labels.
- Lightweight page tests can use `createRoot` plus mocked child components; this is enough to verify loading, error, and role-based view mode behavior.