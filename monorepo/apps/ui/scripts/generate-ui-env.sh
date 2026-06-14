#!/usr/bin/env bash

set -euo pipefail

# Note on MSYS_NO_PATHCONV=1
# In Git Bash on Windows, this disables automatic path conversion so CLI
# arguments such as SSM parameter paths and CloudFront paths are passed through unchanged.

PHOTOS_SERVICE_BASE_URL_PARAMETER="/services/photos-service/base-url"
HISTORIC_LIKES_SERVICE_BASE_URL_PARAMETER="/services/historic-likes-service/base-url"
COGNITO_DOMAIN_PARAMETER="/cognito/domain"
COGNITO_CLIENT_ID_PARAMETER="/cognito/client-id"
COGNITO_USER_POOL_ID_PARAMETER="/cognito/user-pool-id"

OUTPUT_FILE=".env"

echo ""
echo "Reading deployment parameters from SSM Parameter Store..."
echo ""

PHOTOS_SERVICE_BASE_URL=$(MSYS_NO_PATHCONV=1 aws ssm get-parameter \
  --name "$PHOTOS_SERVICE_BASE_URL_PARAMETER" \
  --query "Parameter.Value" \
  --output text)

HISTORIC_LIKES_SERVICE_BASE_URL=$(MSYS_NO_PATHCONV=1 aws ssm get-parameter \
  --name "$HISTORIC_LIKES_SERVICE_BASE_URL_PARAMETER" \
  --query "Parameter.Value" \
  --output text)

COGNITO_DOMAIN=$(MSYS_NO_PATHCONV=1 aws ssm get-parameter \
  --name "$COGNITO_DOMAIN_PARAMETER" \
  --query "Parameter.Value" \
  --output text)

COGNITO_CLIENT_ID=$(MSYS_NO_PATHCONV=1 aws ssm get-parameter \
  --name "$COGNITO_CLIENT_ID_PARAMETER" \
  --query "Parameter.Value" \
  --output text)

COGNITO_USER_POOL_ID=$(MSYS_NO_PATHCONV=1 aws ssm get-parameter \
  --name "$COGNITO_USER_POOL_ID_PARAMETER" \
  --query "Parameter.Value" \
  --output text)

echo "Generating $OUTPUT_FILE"

cat > "$OUTPUT_FILE" <<EOF
VITE_PHOTOS_SERVICE_BASE_URL=$PHOTOS_SERVICE_BASE_URL
VITE_HISTORIC_LIKES_SERVICE_BASE_URL=$HISTORIC_LIKES_SERVICE_BASE_URL
VITE_COGNITO_DOMAIN=$COGNITO_DOMAIN
VITE_COGNITO_CLIENT_ID=$COGNITO_CLIENT_ID
VITE_COGNITO_USER_POOL_ID=$COGNITO_USER_POOL_ID
EOF

echo ""
echo "Generated:"
echo "$OUTPUT_FILE"
echo ""
cat "$OUTPUT_FILE"
echo ""
