#!/usr/bin/env node

/**
 * Node.js script to fetch Shelby documentation for AI/LLM integration
 * Usage: node scripts/fetch-shelby-docs.js [options]
 * 
 * Options:
 *   --full          Fetch full documentation (default)
 *   --page <path>   Fetch specific page (e.g., sdks/typescript)
 *   --output <file> Output file path (default: docs/shelby-full-docs.txt)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SHELBY_DOCS_BASE = 'https://docs.shelby.xyz';

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve(data));
      } else if (res.statusCode === 301 || res.statusCode === 302) {
        // Follow redirects
        fetchUrl(res.headers.location).then(resolve).catch(reject);
      } else {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
      }
    }).on('error', reject);
  });
}

async function fetchFullDocs(outputFile) {
  const url = `${SHELBY_DOCS_BASE}/llms-full.txt`;
  console.log(`Fetching full Shelby documentation from ${url}...`);
  
  try {
    const content = await fetchUrl(url);
    ensureDir(path.dirname(outputFile));
    fs.writeFileSync(outputFile, content, 'utf8');
    
    const stats = fs.statSync(outputFile);
    console.log(`✅ Successfully fetched full documentation`);
    console.log(`📄 File saved to: ${outputFile}`);
    console.log(`📊 File size: ${stats.size} bytes`);
  } catch (error) {
    console.error(`❌ Failed to fetch documentation:`, error.message);
    process.exit(1);
  }
}

async function fetchPage(pagePath, outputFile) {
  console.log(`Fetching Shelby documentation page: ${pagePath}`);
  
  // Try different methods
  const methods = [
    { url: `${SHELBY_DOCS_BASE}/${pagePath}.mdx`, name: '.mdx extension' },
    { url: `${SHELBY_DOCS_BASE}/${pagePath}.md`, name: '.md extension' },
    { 
      url: `${SHELBY_DOCS_BASE}/${pagePath}`, 
      name: 'Accept header',
      headers: { 'Accept': 'text/markdown' }
    }
  ];

  for (const method of methods) {
    try {
      console.log(`Trying ${method.name}...`);
      const content = await fetchUrl(method.url);
      ensureDir(path.dirname(outputFile));
      fs.writeFileSync(outputFile, content, 'utf8');
      
      const stats = fs.statSync(outputFile);
      console.log(`✅ Successfully fetched page using ${method.name}`);
      console.log(`📄 File saved to: ${outputFile}`);
      console.log(`📊 File size: ${stats.size} bytes`);
      return;
    } catch (error) {
      // Continue to next method
    }
  }
  
  console.error(`❌ Failed to fetch page. Please check the page path: ${pagePath}`);
  process.exit(1);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let mode = 'full';
let pagePath = null;
let outputFile = 'docs/shelby-full-docs.txt';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--page' && args[i + 1]) {
    mode = 'page';
    pagePath = args[i + 1];
    i++;
  } else if (args[i] === '--output' && args[i + 1]) {
    outputFile = args[i + 1];
    i++;
  } else if (args[i] === '--full') {
    mode = 'full';
  }
}

// Execute
if (mode === 'full') {
  fetchFullDocs(outputFile);
} else if (mode === 'page') {
  if (!pagePath) {
    console.error('Error: --page requires a page path');
    console.error('Usage: node scripts/fetch-shelby-docs.js --page <path> [--output <file>]');
    process.exit(1);
  }
  fetchPage(pagePath, outputFile);
} else {
  console.error('Usage: node scripts/fetch-shelby-docs.js [--full|--page <path>] [--output <file>]');
  process.exit(1);
}
