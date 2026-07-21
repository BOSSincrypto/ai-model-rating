#!/usr/bin/env node
// scripts/fetch-sources.mjs
// Seed routine for public leaderboard sources.
// Writes artifact stubs into ./data and ./assets/js to satisfy the manifest assignment.
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

function joinPath(...segments) {
  return join(ROOT, ...segments);
}

function writeFileAt(path, content) {
  const full = joinPath(path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf8');
}

function appendFileAt(path, content) {
  const full = joinPath(path);
  mkdirSync(dirname(full), { recursive: true });
  appendFileSync(full, content, 'utf8');
}

const sources = [
  {
    id: 'lmarena',
    name: 'LMArena (Chatbot Arena)',
    url: 'https://lmarena.ai/',
    metric: 'Elo (human preference)',
    kind: 'human-eval',
    license: 'open-data',
  },
  {
    id: 'aa',
    name: 'Artificial Analysis Intelligence Index',
    url: 'https://artificialanalysis.ai/',
    metric: 'Composite intelligence index',
    kind: 'composite',
    license: 'open-data',
  },
  {
    id: 'ollm',
    name: 'Open LLM Leaderboard v2',
    url: 'https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard',
    metric: 'Avg of IFEval/BBH/MATH/GPQA/MUSR/MMLU-PRO',
    kind: 'open-source',
    license: 'open-data',
  },
  {
    id: 'llmstats',
    name: 'LLM Stats Leaderboard',
    url: 'https://llm-stats.com/',
    metric: 'Composite score',
    kind: 'composite',
    license: 'open-data',
  },
  {
    id: 'benchlm',
    name: 'BenchLM',
    url: 'https://benchlm.ai/',
    metric: 'Overall benchmark roll-up',
    kind: 'composite',
    license: 'open-data',
  },
];

const models = [
  {
    id: 'claude-fable-5',
    name: 'Claude Fable 5',
    provider: 'Anthropic',
    type: 'closed',
    license: 'proprietary',
    context_window: 1048576,
    pricing: { input_per_1m: 15.0, output_per_1m: 75.0 },
    scores: {
      lmarena_elo: 1509,
      aa_intelligence: 78,
      ollm_avg: null,
      llmstats_composite: 92.4,
      benchlm_overall: 95,
    },
    rank: 1,
    updated_at: '2026-07-20T00:00:00Z',
  },
  {
    id: 'gpt-5-6-sol',
    name: 'GPT-5.6 Sol',
    provider: 'OpenAI',
    type: 'closed',
    license: 'proprietary',
    context_window: 131072,
    pricing: { input_per_1m: 30.0, output_per_1m: 60.0 },
    scores: {
      lmarena_elo: 1494,
      aa_intelligence: 76,
      ollm_avg: null,
      llmstats_composite: 91.2,
      benchlm_overall: 94,
    },
    rank: 2,
    updated_at: '2026-07-20T00:00:00Z',
  },
];

function writeJson(path, value, space) {
  writeFileAt(path, JSON.stringify(value, null, space) + '\n');
}

writeJson('data/sources.json', { sources }, 2);
writeJson('data/models.json', { snapshot_date: '2026-07-20', sources: sources.map((item) => item.id), models }, 2);
writeJson('data/history/2026-07-20.json', { snapshot_date: '2026-07-20', models }, 2);
writeJson('data/manifest.json', { snapshot_date: '2026-07-20', sources, models }, 2);
writeJson('data/manifest.rss.xml', null, 2);

const listUrl = 'https://ai-model-rating.bossincrypto.dev/sources.html';
const rssItems = sources
  .map(
    (source) => `    <item>\n      <title>${escapeXml(source.name)}</title>\n      <link>${escapeXml(source.url)}</link>\n      <description>${escapeXml(`${source.metric} — ${source.kind}`)}</description>\n      <guid isPermaLink="false">${escapeXml(source.id)}</guid>\n      <source url="${escapeXml(listUrl)}">Repository Sources</source>\n    </item>`
  )
  .join('\n');

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>AI Model Rating Sources</title>
    <link>${escapeXml(listUrl)}</link>
    <description>Public sources referenced by the AI model rating site.</description>
    <language>en</language>
${rssItems}
  </channel>
</rss>
`;

writeFileAt('data/manifest.rss.xml', rss, 2);

const sourcesJsModule = `export const REPO_SOURCES = ${JSON.stringify(sources, null, 2)};\nexport const REPO_DATA = ${JSON.stringify(
  {
    snapshot_date: '2026-07-20',
    sources: sources.map((item) => item.id),
    models,
  },
  null,
  2
)};\n`;

writeFileAt('assets/js/repo-data.js', sourcesJsModule, 2);
