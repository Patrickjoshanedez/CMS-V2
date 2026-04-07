#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  LocalStack S3 Initialization — CMS V2
#  Auto-executed when LocalStack is ready via:
#    /etc/localstack/init/ready.d/init-aws.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

REGION="us-east-1"

# All buckets to create
BUCKETS=(
  "cms-buksu-uploads"
  "avatars"
  "submissions"
  "archived-documents"
)

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║    LocalStack S3 Initialization — CMS V2        ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── 1. Create all buckets ─────────────────────────────────────────────────────
for BUCKET in "${BUCKETS[@]}"; do
  echo "[init-aws] Creating bucket: s3://${BUCKET} in ${REGION}"
  awslocal s3 mb "s3://${BUCKET}" --region "${REGION}" 2>/dev/null \
    && echo "[init-aws] ✅ Bucket '${BUCKET}' created." \
    || echo "[init-aws] ℹ️  Bucket '${BUCKET}' already exists — skipping creation."
done

# ── 2. Apply CORS to all buckets ──────────────────────────────────────────────
echo ""
echo "[init-aws] Applying CORS policy to all buckets..."
CORS_CONFIG='{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "x-amz-meta-*"]
  }]
}'

for BUCKET in "${BUCKETS[@]}"; do
  awslocal s3api put-bucket-cors \
    --bucket "${BUCKET}" \
    --cors-configuration "${CORS_CONFIG}"
  echo "[init-aws] ✅ CORS applied to '${BUCKET}'"
done

# ── 3. Verify ─────────────────────────────────────────────────────────────────
echo ""
echo "[init-aws] Bucket list:"
awslocal s3 ls

echo ""
echo "[init-aws] 🎉 S3 ready — endpoint: http://localstack:4566"
echo "[init-aws]    Buckets created: ${BUCKETS[*]}"
echo ""
