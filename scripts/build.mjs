#!/usr/bin/env node
// scripts/build.mjs - Build GitHub Pages artifact into dist/
// Uses only Node 20 stdlib: node:fs, node:zlib, node:path, node:url

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, resolve, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const DIST = join(ROOT, 'dist');

function minifyHtml(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .trim();
}

function minifyJson(json) {
  try {
    const parsed = JSON.parse(json);
    return JSON.stringify(parsed);
  } catch {
    return json;
  }
}

function processFile(src, dest) {
  const ext = extname(src).toLowerCase();
  const content = readFileSync(src, 'utf8');
  let output = content;

  switch (ext) {
    case '.html':
      output = minifyHtml(content);
      break;
    case '.css':
      output = minifyCss(content);
      break;
    case '.json':
      output = minifyJson(content);
      break;
    case '.js':
    case '.svg':
    default:
      output = content;
      break;
  }

  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, output, 'utf8');
}

function walkDir(dir, callback) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full, callback);
    } else {
      callback(full);
    }
  }
}

// Build list of files to copy/process
const filesToProcess = [
  'index.html',
  'compare.html',
  'trends.html',
  'sources.html',
  '404.html',
  'robots.txt',
  'sitemap.xml',
  'favicon.svg',
];

// Ensure dist exists
mkdirSync(DIST, { recursive: true });

// Process root-level files
for (const file of filesToProcess) {
  const src = join(ROOT, file);
  const dest = join(DIST, file);
  if (statSync(src).isFile()) {
    processFile(src, dest);
  }
}

// Process assets directory
const assetsSrc = join(ROOT, 'assets');
const assetsDest = join(DIST, 'assets');
if (statSync(assetsSrc).isDirectory()) {
  walkDir(assetsSrc, (full) => {
    const rel = full.slice(assetsSrc.length + 1);
    const dest = join(assetsDest, rel);
    processFile(full, dest);
  });
}

// Process data directory
const dataSrc = join(ROOT, 'data');
const dataDest = join(DIST, 'data');
if (statSync(dataSrc).isDirectory()) {
  walkDir(dataSrc, (full) => {
    const rel = full.slice(dataSrc.length + 1);
    const dest = join(dataDest, rel);
    processFile(full, dest);
  });
}

// Calculate sizes
let totalUncompressed = 0;
let totalGzipped = 0;

function calculateSizes(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      calculateSizes(full);
    } else if (entry.isFile()) {
      const content = readFileSync(full);
      totalUncompressed += content.length;
      totalGzipped += gzipSync(content).length;
    }
  }
}

calculateSizes(DIST);

const uncompressedKB = (totalUncompressed / 1024).toFixed(1);
const gzippedKB = (totalGzipped / 1024).toFixed(1);

console.log(`dist: ${uncompressedKB} KB (uncompressed), ${gzippedKB} KB (gzip)`);

// Enforce budget
if (totalUncompressed > 50 * 1024) {
  console.error(`ERROR: Uncompressed size ${uncompressedKB} KB exceeds 50 KB budget`);
  process.exit(1);
}
if (totalGzipped > 15 * 1024) {
  console.error(`ERROR: Gzipped size ${gzippedKB} KB exceeds 15 KB budget`);
  process.exit(1);
}
