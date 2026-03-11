# Initialize LocalStack S3 bucket for CMS V2
# Run this after LocalStack is started

Write-Host "Waiting for LocalStack to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "Creating S3 bucket: cms-buksu-uploads" -ForegroundColor Cyan
aws --endpoint-url=http://localhost:4566 s3 mb s3://cms-buksu-uploads --region us-east-1

Write-Host "Setting bucket CORS configuration..." -ForegroundColor Cyan
$corsConfig = @'
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}
'@

aws --endpoint-url=http://localhost:4566 s3api put-bucket-cors --bucket cms-buksu-uploads --cors-configuration $corsConfig

Write-Host "Listing S3 buckets..." -ForegroundColor Cyan
aws --endpoint-url=http://localhost:4566 s3 ls

Write-Host "LocalStack S3 initialization complete!" -ForegroundColor Green
