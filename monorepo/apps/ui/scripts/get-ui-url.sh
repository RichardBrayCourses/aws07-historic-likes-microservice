#!/usr/bin/env bash

set -euo pipefail

# Note on MSYS_NO_PATHCONV=1
# In Git Bash on Windows, this disables automatic path conversion so CLI
# arguments such as SSM parameter paths are passed through unchanged.

WEBSITE_URL_PARAMETER="/website/distribution-url"

echo ""
echo "Reading website URL from SSM Parameter Store..."
echo ""

WEBSITE_URL=$(MSYS_NO_PATHCONV=1 aws ssm get-parameter \
  --name "$WEBSITE_URL_PARAMETER" \
  --query "Parameter.Value" \
  --output text)

echo "$WEBSITE_URL"
echo ""
