#!/bin/bash

# Script to fetch a specific Shelby documentation page
# Usage: ./scripts/fetch-shelby-page.sh <page-path> [output-file]
# Example: ./scripts/fetch-shelby-page.sh sdks/typescript docs/typescript-sdk.md

if [ -z "$1" ]; then
    echo "Usage: $0 <page-path> [output-file]"
    echo "Example: $0 sdks/typescript docs/typescript-sdk.md"
    echo "Example: $0 protocol/quickstart"
    exit 1
fi

PAGE_PATH="$1"
OUTPUT_FILE="${2:-docs/$(basename "$PAGE_PATH").md}"

# Remove leading slash if present
PAGE_PATH="${PAGE_PATH#/}"

# Create docs directory if it doesn't exist
mkdir -p "$(dirname "$OUTPUT_FILE")"

# Try .mdx first, then .md
SHELBY_DOCS_URL_MDX="https://docs.shelby.xyz/${PAGE_PATH}.mdx"
SHELBY_DOCS_URL_MD="https://docs.shelby.xyz/${PAGE_PATH}.md"

echo "Fetching Shelby documentation page: $PAGE_PATH"
echo "Output: $OUTPUT_FILE"

# Try fetching with .mdx extension first
curl -s -f "$SHELBY_DOCS_URL_MDX" -o "$OUTPUT_FILE"

if [ $? -ne 0 ]; then
    # If .mdx fails, try .md
    echo "Trying .md extension..."
    curl -s -f "$SHELBY_DOCS_URL_MD" -o "$OUTPUT_FILE"
fi

if [ $? -eq 0 ]; then
    echo "✅ Successfully fetched page"
    echo "📄 File saved to: $OUTPUT_FILE"
    echo "📊 File size: $(wc -c < "$OUTPUT_FILE" | xargs) bytes"
else
    echo "❌ Failed to fetch page. Trying with Accept header..."
    
    # Try with Accept header method
    curl -s -H "Accept: text/markdown" "https://docs.shelby.xyz/${PAGE_PATH}" -o "$OUTPUT_FILE"
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully fetched page using Accept header"
        echo "📄 File saved to: $OUTPUT_FILE"
        echo "📊 File size: $(wc -c < "$OUTPUT_FILE" | xargs) bytes"
    else
        echo "❌ Failed to fetch page. Please check the page path."
        exit 1
    fi
fi
