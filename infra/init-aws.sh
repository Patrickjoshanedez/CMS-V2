#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  LocalStack S3 Initialization — CMS V2
#  Auto-executed when LocalStack is ready via:
#    /etc/localstack/init/ready.d/init-aws.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

BUCKET="cms-buksu-uploads"
REGION="us-east-1"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║    LocalStack S3 Initialization — CMS V2        ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── 1. Create the bucket ──────────────────────────────────────────────────────
echo "[init-aws] Creating bucket: s3://${BUCKET} in ${REGION}"
awslocal s3 mb "s3://${BUCKET}" --region "${REGION}" 2>/dev/null \
  && echo "[init-aws] ✅ Bucket created." \
  || echo "[init-aws] ℹ️  Bucket already exists — skipping creation."

# ── 2. Apply CORS so the frontend can upload directly ─────────────────────────
echo "[init-aws] Applying CORS policy..."
awslocal s3api put-bucket-cors \
  --bucket "${BUCKET}" \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag", "Content-Length"]
    }]
  }'
echo "[init-aws] ✅ CORS applied."

# ── 3. Verify ─────────────────────────────────────────────────────────────────
echo "[init-aws] Bucket list:"
awslocal s3 ls

echo ""
echo "[init-aws] 🎉 S3 ready — endpoint: http://localstack:4566 — bucket: ${BUCKET}"
echo ""
