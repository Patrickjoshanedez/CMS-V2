# PDF Metadata Accuracy Runbook

This runbook validates PDF metadata extraction with `glm-ocr` in Docker and enforces manual review for uncertain fields.

## 1) Start Docker stack

```bash
docker compose --env-file .env.deploy -f docker-compose.deploy.yml up -d --build
```

## 2) Run metadata regression inside server container

```bash
docker compose --env-file .env.deploy -f docker-compose.deploy.yml exec server node server/test_metadata.js
```

## 3) Review artifacts

- `server/parsed-test-results-glm.txt`: human-readable report
- `server/metadata-regression-report.json`: field-by-field machine-readable report
- `server/metadata-review-queue.json`: manual review queue for unresolved/low-confidence fields

## 4) Acceptance checklist

- `metadata-regression-report.json` exists and includes all in-scope PDFs.
- Field-level accuracy is reported.
- `metadata-review-queue.json` is empty **or** every queue item is manually approved before release.
- `PDF_METADATA_GLM_MODEL` is pinned to `glm-ocr:latest` in runtime config.
- `PDF_METADATA_REVIEW_GATE_ENABLED=true` in production-like runs.
