#!/bin/bash


ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)

if [[ -z "$ACCOUNT_ID" ]]; then
  echo "❌ Failed to get account ID " >&2
  exit 0
fi

echo "Looking for CDKToolkit-related ECR containers in account $ACCOUNT_ID"

REPOS=$(aws ecr describe-repositories \
  --query "repositories[?starts_with(repositoryName, 'cdk-')].repositoryName" \
  --output text 2>/dev/null)

if [[ $? -ne 0 ]]; then
  echo "❌ Failed to list ECR repositories " >&2
  exit 0
fi

if [[ -z "$REPOS" ]]; then
  echo "✅ No CDK-related ECR repositories found."
  exit 0
fi

for REPO in $REPOS; do
  echo "🔍 Checking repository: $REPO"
  
  IMAGE_TAGS=$(aws ecr list-images \
    --repository-name "$REPO" \
    --query 'imageIds[*]' \
    --output json 2>/dev/null)

  if [[ $? -ne 0 ]]; then
    echo "⚠️  Failed to list images for $REPO"
    continue
  fi

  if [[ "$IMAGE_TAGS" == "[]" ]]; then
    echo "🧼 Repository $REPO is already empty."
    continue
  fi

  aws ecr batch-delete-image \
    --repository-name "$REPO" \
    --image-ids "$IMAGE_TAGS" >/dev/null 2>&1

  if [[ $? -eq 0 ]]; then
    echo "✅ Deleted images in $REPO"
  else
    echo "❌ Failed to delete images in $REPO"
  fi
done

echo "✅ All eligible images deleted."