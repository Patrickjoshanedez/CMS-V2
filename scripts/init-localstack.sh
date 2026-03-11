#!/bin/bash
# Initialize LocalStack S3 bucket for CMS V2

echo "Waiting for LocalStack to be ready..."
sleep 5

echo "Creating S3 bucket: cms-buksu-uploads"
aws --endpoint-url=http://localhost:4566 s3 mb s3://cms-buksu-uploads --region us-east-1

echo "Setting bucket CORS configuration..."
aws --endpoint-url=http://localhost:4566 s3api put-bucket-cors --bucket cms-buksu-uploads --cors-configuration '{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}'

echo "Listing S3 buckets..."
aws --endpoint-url=http://localhost:4566 s3 ls

echo "✅ LocalStack S3 initialization complete!"
