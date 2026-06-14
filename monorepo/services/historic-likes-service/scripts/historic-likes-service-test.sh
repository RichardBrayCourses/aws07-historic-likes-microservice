#!/usr/bin/env bash

set -euo pipefail

# Note on MSYS_NO_PATHCONV=1
# In Git Bash on Windows, this disables automatic path conversion so CLI
# arguments such as SSM parameter paths are passed through unchanged.

HISTORIC_LIKES_SERVICE_BASE_URL_PARAMETER="/services/historic-likes-service/base-url"

echo ""
echo "Reading historic likes service URL from SSM Parameter Store..."
echo ""

HISTORIC_LIKES_SERVICE_BASE_URL=$(MSYS_NO_PATHCONV=1 aws ssm get-parameter \
  --name "$HISTORIC_LIKES_SERVICE_BASE_URL_PARAMETER" \
  --query "Parameter.Value" \
  --output text)

HISTORIC_LIKES_SERVICE_BASE_URL="${HISTORIC_LIKES_SERVICE_BASE_URL%/}"

check() {
  local name="$1"
  local path="$2"
  local expected="$3"
  local body_file

  body_file=$(mktemp)

  curl -fsS "$HISTORIC_LIKES_SERVICE_BASE_URL$path" -o "$body_file"

  if grep -q "$expected" "$body_file"; then
    echo "PASS $name"
    echo ""
    echo "GET $path"
    print_json "$body_file"
    echo ""
  else
    echo "FAIL $name"
    echo "Response body:"
    cat "$body_file"
    rm "$body_file"
    exit 1
  fi

  rm "$body_file"
}

get_response() {
  local path="$1"
  local body_file="$2"

  curl -fsS "$HISTORIC_LIKES_SERVICE_BASE_URL$path" -o "$body_file"
}

print_json() {
  local file="$1"

  if command -v jq >/dev/null 2>&1; then
    jq . "$file"
  else
    cat "$file"
    echo ""
  fi
}

print_user_report() {
  local authors_file="$1"
  local photos_file="$2"
  echo "User report"

  if ! command -v jq >/dev/null 2>&1; then
    echo "  Install jq to print a friendly summary of the historic likes data."
    echo ""
    return
  fi

  echo "  Activity for the last 20 buckets, newest first."
  echo ""

  local report_file
  report_file=$(mktemp)

  jq -s '
    {
      buckets: [
        range(0; .[0].buckets | length) as $index
        | {
            label: .[0].buckets[$index].label,
            authors: (.[0].buckets[$index].authors // []),
            photos: (.[1].buckets[$index].photos // [])
          }
      ]
    }
  ' "$authors_file" "$photos_file" > "$report_file"

  jq -r '
    .buckets
    | reverse
    | .[]
    | . as $bucket
    | $bucket.label,
      (
        if (($bucket.authors | length) == 0 and ($bucket.photos | length) == 0)
        then "  No like activity."
        else empty
        end
      ),
      (
        $bucket.authors[]
        | "  Author " + .id + ": " + (.likes | tostring) + " like(s)"
      ),
      (
        $bucket.photos[]
        | "  Photo " + .id + ": " + (.likes | tostring) + " like(s)"
      ),
      ""
  ' "$report_file"

  rm "$report_file"
}

echo "Running historic likes service checks at $HISTORIC_LIKES_SERVICE_BASE_URL"
echo ""

check "health allows anonymous access" "/public/health" '"ok":true'
check "photo likes chart allows anonymous access" "/public/photo-likes?imageId=1" '"buckets"'
check "author likes chart allows anonymous access" "/public/author-likes?userId=author-01" '"buckets"'

authors_file=$(mktemp)
photos_file=$(mktemp)

get_response "/public/author-likes" "$authors_file"
get_response "/public/photo-likes" "$photos_file"

echo "GET /public/author-likes"
print_json "$authors_file"
echo ""
echo "GET /public/photo-likes"
print_json "$photos_file"
echo ""
print_user_report "$authors_file" "$photos_file"

rm "$authors_file" "$photos_file"

echo ""
echo "All historic likes service checks passed."
echo ""
