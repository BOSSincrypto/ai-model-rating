#!/usr/bin/env node
// scripts/check-links.mjs
// Validates that all internal hrefs in key HTML pages resolve to existing local files.
import { readFileSync, accessSync, existsSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { parse } from 'node:url';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const pages = [
  'index.html',
  'compare.html',
  'trends.html',
  'sources.html',
  '404.html',
].filter((page) => existsSync(resolve(ROOT, page)));

const allowedExternalPrefixes = [
  'https://',
  'http://',
  '//',
  'mailto:',
  'tel:',
  '#',
];

function isLocal(href) {
  if (!href) return false;
  if (allowedExternalPrefixes.some((prefix) => href.startsWith(prefix))) {
    return false;
  }
  if (href.startsWith('?')) return true;
  if (href.startsWith('/')) return true;
  return true;
}

function resolvePath(href, file) {
  const base = resolve(ROOT, file);
  if (href.startsWith('/')) {
    href = href.slice(1);
  }
  return resolve(base, '..', href);
}

let failures = 0;
const seen = new Set();

for (const page of pages) {
  const html = readFileSync(resolve(ROOT, page), 'utf8');
  const matches = [...html.matchAll(/href=["']([^"']+)["']/g)];
  for (const [, href] of matches) {
    if (!isLocal(href)) continue;
    const target = resolvePath(href, page);
    try {
      accessSync(target);
    } catch (error) {
      if (href.startsWith('?')) {
        if (!seen.has(`query:${page}${href}`)) {
          seen.add(`query:${page}${href}`);
          console.error(`Missing query-style target? ${page} -> ${href}`);
          failures++;
        }
        continue;
      }
      const rel = projectPath(target);
      if (!seen.has(rel)) {
        seen.add(rel);
        console.error(`Missing local file: ${page} -> ${href} (${rel})`);
        failures++;
      }
    }
  }
}

if (failures) {
  console.error(`check-links failed: ${failures} missing target(s)`);
  process.exit(1);
}

console.log('check-links passed: all checked internal links resolve');

function projectPath(fullPath) {
  return relative(ROOT, fullPath).split(sep).join('/');
}
