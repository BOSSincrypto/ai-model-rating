#!/usr/bin/env node
// scripts/validate-data.mjs
// Validates data/models.json against data/models.schema.json using AJV
import { readFileSync, accessSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const schemaPath = resolve(ROOT, 'data/models.schema.json');
const dataPath = resolve(ROOT, 'data/models.json');

writeFileSync(resolve(ROOT, 'data/.schema-temp.json'), readFileSync(schemaPath, 'utf8'));
writeFileSync(resolve(ROOT, 'data/.data-temp.json'), readFileSync(dataPath, 'utf8'));

const result = spawnSync('npx', ['ajv-cli@latest', 'validate', '-s', './data/.schema-temp.json', '-d', './data/.data-temp.json'], {
  cwd: ROOT,
  encoding: 'utf8',
  shell: false,
  stdio: 'pipe',
});

if (result.error) {
  console.error(`Error running ajv-cli: ${result.error.message}`);
  process.exit(1);
}

const output = String(result.stdout ?? '').trim();
const err = String(result.stderr ?? '').trim();

if (result.status !== 0) {
  console.error(`Validation failed:\n${output}\n${err}`);
  process.exit(1);
}

console.log('Validation passed: data/models.json matches schema.');
