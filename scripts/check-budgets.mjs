#!/usr/bin/env node
// scripts/check-budgets.mjs
// Enforces the size budget: dist/ first-page < 50 KB uncompressed, < 15 KB gzipped.
import { readFileSync, readdirSync, statSync } from 'node:fs';
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

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile()) {
      const content = readFileSync(full);
      totalUncompressed += content.length;
      totalGzipped += gzipSync(content).length;
    }
  }
}

walk(DIST);

const uncompressedKB = (totalUncompressed / 1024).toFixed(1);
const gzippedKB = (totalGzipped / 1024).toFixed(1);

console.log(`dist: ${uncompressedKB} KB (uncompressed), ${gzippedKB} KB (gzip)`);

if (totalUncompressed > 50 * 1024) {
  console.error(`ERROR: Uncompressed size ${uncompressedKB} KB exceeds 50 KB budget`);
  process.exit(1);
}

if (totalGzipped > 15 * 1024) {
  console.error(`ERROR: Gzipped size ${gzippedKB} KB exceeds 15 KB budget`);
  process.exit(1);
}

console.log('check-budgets passed: within size budget');
