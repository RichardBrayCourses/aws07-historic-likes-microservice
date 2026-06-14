#!/usr/bin/env bash

set -euo pipefail

# Note on MSYS_NO_PATHCONV=1
# In Git Bash on Windows, this disables automatic path conversion so CLI
# arguments such as SSM parameter paths and CloudFront paths are passed through unchanged.

WEBSITE_BUCKET_NAME_PARAMETER="/website/bucket-name"

UI_DIST_DIR="dist"

echo ""
echo "Reading website bucket name from SSM Parameter Store..."
echo ""

WEBSITE_BUCKET_NAME=$(MSYS_NO_PATHCONV=1 aws ssm get-parameter \
  --name "$WEBSITE_BUCKET_NAME_PARAMETER" \
  --query "Parameter.Value" \
  --output text)

echo "Uploading $UI_DIST_DIR to s3://$WEBSITE_BUCKET_NAME"
echo ""

aws s3 sync "$UI_DIST_DIR" "s3://$WEBSITE_BUCKET_NAME" --delete

echo ""
echo "Upload complete."
echo ""
