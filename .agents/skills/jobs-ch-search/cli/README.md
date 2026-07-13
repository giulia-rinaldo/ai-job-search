# jobs-ch-cli

Zero-dependency CLI that searches job listings on [jobs.ch](https://www.jobs.ch),
Switzerland's largest job board. Runs on `bun`, no install beyond dev types.

```bash
cd .agents/skills/jobs-ch-search/cli
bun install          # dev types only (typescript, @types/bun); zero runtime deps
bun run typecheck    # tsc --noEmit
bun test             # flag validation + live smoke tests
```

## Usage

```bash
bun run src/cli.ts search -q "data analyst" -l "Zurich" --jobage 7 --format table
bun run src/cli.ts detail 4dd76eb4-17d2-461a-ae8e-bdc64b5dadd2 --format plain
```

See `../SKILL.md` for the full command reference and `../url-reference.md` for the
endpoint/parsing anchors (what to update if jobs.ch changes its markup).

## Design

- **No runtime dependencies** — plain `bun` + `fetch` + regex parsing.
- Reads only robots-**allowed** pages: the SSR listing (`/en/vacancies/`) and the
  single-UUID detail page (`/en/vacancies/detail/<uuid>/`). It never touches the
  robots-disallowed `/api/` endpoints.
- Detail parsing uses the page's schema.org `JobPosting` `ld+json` — robust to CSS churn.
- **Personal use only** — keep volume low (jobs.ch terms). See `../SKILL.md`.
