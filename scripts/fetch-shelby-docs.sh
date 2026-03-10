#!/bin/bash

# Script to fetch Shelby documentation for AI/LLM integration
# Usage: ./scripts/fetch-shelby-docs.sh [output-file]

SHELBY_DOCS_URL="https://docs.shelby.xyz/llms-full.txt"
OUTPUT_FILE="${1:-docs/shelby-full-docs.txt}"

# Create docs directory if it doesn't exist
mkdir -p "$(dirname "$OUTPUT_FILE")"

echo "Fetching Shelby documentation from $SHELBY_DOCS_URL..."
echo "Output: $OUTPUT_FILE"

# Fetch the documentation
curl -s "$SHELBY_DOCS_URL" -o "$OUTPUT_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Successfully fetched Shelby documentation"
    echo "📄 File saved to: $OUTPUT_FILE"
    echo "📊 File size: $(wc -c < "$OUTPUT_FILE" | xargs) bytes"
else
    echo "❌ Failed to fetch documentation"
    exit 1
fi
