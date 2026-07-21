#!/usr/bin/env node
// scripts/bump-version.mjs - Semantic version bump + tag + GitHub Release
// Uses only Node 20 stdlib + gh CLI

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const ROOT = resolve(__dirname, '..');
const PKG_PATH = join(ROOT, 'package.json');
const VERSION_JSON_PATH = join(ROOT, 'version.json');

function run(cmd, opts = {}) {
  const result = spawnSync(cmd, { shell: true, encoding: 'utf8', cwd: ROOT, ...opts });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const err = new Error(`Command failed: ${cmd}\n${result.stderr}`);
    err.code = result.status;
    throw err;
  }
  return result.stdout.trim();
}

function getLatestTag() {
  try {
    return run('git describe --tags --abbrev=0');
  } catch {
    return 'v0.0.0';
  }
}

function parseVersion(tag) {
  const m = tag.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return { major: 0, minor: 0, patch: 0 };
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

function formatVersion(v) {
  return `v${v.major}.${v.minor}.${v.patch}`;
}

function bumpVersion(current, bumpType = 'patch') {
  const v = { ...current };
  if (bumpType === 'major') {
    v.major++; v.minor = 0; v.patch = 0;
  } else if (bumpType === 'minor') {
    v.minor++; v.patch = 0;
  } else {
    v.patch++;
  }
  return v;
}

function getBumpType() {
  try {
    if (existsSync(PKG_PATH)) {
      const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf8'));
      if (pkg.version?.bump) return pkg.version.bump;
    }
    if (existsSync(VERSION_JSON_PATH)) {
      const v = JSON.parse(readFileSync(VERSION_JSON_PATH, 'utf8'));
      if (v.bump) return v.bump;
    }
  } catch {}
  return 'patch';
}

function generateNotes(prevTag, newTag) {
  try {
    return run(`git log ${prevTag}..HEAD --oneline --no-merges`);
  } catch {
    return '(no prior tag)';
  }
}

function main() {
  const prevTag = getLatestTag();
  const current = parseVersion(prevTag);
  const bumpType = getBumpType();
  const next = bumpVersion(current, bumpType);
  const nextTag = formatVersion(next);

  console.log(`Previous tag: ${prevTag}`);
  console.log(`Bump type: ${bumpType}`);
  console.log(`Next tag: ${nextTag}`);

  // Create annotated tag
  run(`git tag -a ${nextTag} -m "Release ${nextTag}"`);
  run(`git push origin ${nextTag}`);

  // Generate release notes
  const notes = generateNotes(prevTag, nextTag);
  const notesFile = join(ROOT, 'RELEASE_NOTES.md');
  writeFileSync(notesFile, notes, 'utf8');

  // Create GitHub Release
  run(`gh release create ${nextTag} --title "${nextTag}" --notes-file ${notesFile}`);

  console.log(`Release ${nextTag} created.`);
}

main();
