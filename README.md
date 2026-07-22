# ai-model-rating

[![Deploy to GitHub Pages](https://img.shields.io/github/actions/workflow/status/BOSSincrypto/ai-model-rating/deploy.yml?branch=main&style=flat-square&label=deploy)](https://github.com/BOSSincrypto/ai-model-rating/actions/workflows/deploy.yml)
[![Release](https://img.shields.io/github/v/release/BOSSincrypto/ai-model-rating?style=flat-square)](https://github.com/BOSSincrypto/ai-model-rating/releases)
[![License: MIT](https://img.shields.io/github/license/BOSSincrypto/ai-model-rating?style=flat-square)](LICENSE)
[![Repo Size](https://img.shields.io/github/repo-size/BOSSincrypto/ai-model-rating?style=flat-square)](https://github.com/BOSSincrypto/ai-model-rating)
[![Data as of](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fai-model-rating.bossincrypto.dev%2Fdata%2Fmodels.json&query=%24.snapshot_date&style=flat-square&label=data%20as%20of)](https://ai-model-rating.bossincrypto.dev/sources.html)

A single page that pulls LLM rankings from 5 public leaderboards and shows them in one place. No logins, no accounts, no JavaScript required.

**[Live Demo](https://ai-model-rating.bossincrypto.dev/)**

## What it does

- Aggregates rankings from LMArena, Artificial Analysis, Open LLM Leaderboard v2, LLM Stats, and BenchLM into a single sortable table.
- Lets you filter by provider, model type (open/closed), license, context window, and price.
- Compares any two models side-by-side with per-metric diffs.
- Shows 6-week trend lines as inline SVG sparklines.
- Links back to every source so you can verify the original data.

All of this works with JavaScript disabled. The JS layer adds sorting, filtering, and sparkline rendering but the content is visible without it.

## Quick start

```bash
git clone https://github.com/BOSSincrypto/ai-model-rating.git
cd ai-model-rating
python -m http.server 4100 --directory .
# open http://localhost:4100
```

No `npm install` required. The site is plain HTML, CSS, and vanilla JavaScript with zero runtime dependencies.

## Data sources

| Source | What it measures | Type | Last updated |
|--------|-----------------|------|-------------|
| [LMArena](https://lmarena.ai/) | Elo rating from human preference votes | Human eval | 2026-07-20 |
| [Artificial Analysis](https://artificialanalysis.ai/) | Composite intelligence index | Composite | 2026-07-20 |
| [Open LLM Leaderboard v2](https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard) | Avg of IFEval, BBH, MATH, GPQA, MUSR, MMLU-PRO | Open-source | 2026-07-20 |
| [LLM Stats](https://llm-stats.com/) | Composite score across multiple benchmarks | Composite | 2026-07-20 |
| [BenchLM](https://benchlm.ai/) | Overall benchmark roll-up from 321 benchmarks | Composite | 2026-07-20 |

Data refreshes weekly via GitHub Actions. The snapshot date is shown on the badge above.

## Architecture

A static site that deploys to [GitHub Pages](https://ai-model-rating.bossincrypto.dev/). Data lives as JSON in the repository and is fetched by a weekly cron workflow.

```
index.html          Table with filters, sorting, search
compare.html        Side-by-side model comparison
trends.html         6-week sparkline trends for top models
sources.html        Source metadata and methodology
data/models.json    Current model snapshot (updated weekly)
data/history/       Weekly snapshots for trend data
scripts/            Build, validation, and data-fetch scripts
```

For full architectural details, see [architecture.md](https://github.com/BOSSincrypto/ai-model-rating/blob/main/architecture.md).

## Updating data manually

```bash
node scripts/fetch-sources.mjs
node scripts/validate-data.mjs   # confirm schema validity
git add data/ && git commit -m "data: refresh rankings"
```

## Contributing

Bug reports and pull requests are welcome. See [CONTRIBUTING.md](https://github.com/BOSSincrypto/ai-model-rating/blob/main/CONTRIBUTING.md) if it exists.

## License

[MIT](LICENSE)
