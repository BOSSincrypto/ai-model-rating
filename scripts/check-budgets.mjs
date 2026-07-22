#!/usr/bin/env node
// scripts/check-budgets.mjs
// Enforces the size budget: dist/ first-page < 60 KB uncompressed, < 15 KB gzipped.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DIST = resolve(__dirname, '../dist');

if (!statSync(DIST).isDirectory()) {
  console.error('ERROR: dist/ does not exist. Run build.mjs first.');
  process.exit(1);
}

let totalUncompressed = 0;
let totalGzipped = 0;

const firstPageAssets = [
  'index.html',
  'favicon.svg',
  'assets/css/tokens.css',
  'assets/css/base.css',
  'assets/css/components.css',
  'assets/css/pages.css',
  'assets/js/main.js',
  'assets/js/filters.js',
  'data/models.json',
  'data/sources.json',
];

for (const asset of firstPageAssets) {
  const path = join(DIST, asset);
  if (existsSync(path) && statSync(path).isFile()) {
    const content = readFileSync(path);
    totalUncompressed += content.length;
    totalGzipped += gzipSync(content).length;
  }
}

const uncompressedKB = (totalUncompressed / 1024).toFixed(1);
const gzippedKB = (totalGzipped / 1024).toFixed(1);

console.log(`dist: ${uncompressedKB} KB (uncompressed), ${gzippedKB} KB (gzip)`);

if (totalUncompressed > 60 * 1024) {
  console.error(`ERROR: Uncompressed size ${uncompressedKB} KB exceeds 60 KB budget`);
  process.exit(1);
}

if (totalGzipped > 15 * 1024) {
  console.error(`ERROR: Gzipped size ${gzippedKB} KB exceeds 15 KB budget`);
  process.exit(1);
}

console.log('check-budgets passed: within size budget');
