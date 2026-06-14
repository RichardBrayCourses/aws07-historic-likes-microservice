#!/bin/bash

set -euo pipefail



echo "🔍 Looking for CDKToolkit-related S3 buckets..."

buckets=$(aws s3api list-buckets  --query "Buckets[].Name" --output text)
cdk_buckets=()
for bucket in $buckets; do
  if [[ "$bucket" == cdk-* ]]; then
    cdk_buckets+=("$bucket")
  fi
done

if [ ${#cdk_buckets[@]} -eq 0 ]; then
  echo "✅ No CDKToolkit S3 buckets found."
  exit 0
fi

echo "🪣 Found ${#cdk_buckets[@]} CDKToolkit buckets:"
printf '%s\n' "${cdk_buckets[@]}"

for bucket in "${cdk_buckets[@]}"; do
  echo "⚙️ Processing bucket: $bucket"

  versioning_status=$(aws s3api get-bucket-versioning \
    --bucket "$bucket" \
    --query 'Status' --output text 2>/dev/null || echo "None")

  if [[ "$versioning_status" == "Enabled" || "$versioning_status" == "Suspended" ]]; then
    echo "📦 Bucket is versioned: $versioning_status"

    while true; do
      versions_output=$(aws s3api list-object-versions \
        --bucket "$bucket" \
        --output json)

      version_count=$(echo "$versions_output" | jq '[.Versions[]?, .DeleteMarkers[]?] | length')
      [[ "$version_count" -eq 0 ]] && break

      echo "$versions_output" | jq -c '[.Versions[]?, .DeleteMarkers[]?] | .[] | {Key, VersionId}' |
      while read -r obj; do
        key=$(echo "$obj" | jq -r .Key)
        vid=$(echo "$obj" | jq -r .VersionId)
        echo "🗑️ Deleting: $key (versionId: $vid)"
        aws s3api delete-object \
          --bucket "$bucket" \
          --key "$key" \
          --version-id "$vid" \
          >/dev/null || echo "⚠️ Failed to delete $key:$vid"
      done
    done

  else
    echo "🧹 Bucket is not versioned, deleting contents..."
    aws s3 rm "s3://$bucket" --recursive 
  fi

  echo "🗑️ Deleting bucket: $bucket"
  aws s3api delete-bucket --bucket "$bucket" 
done

echo "✅ All CDKToolkit buckets deleted successfully."