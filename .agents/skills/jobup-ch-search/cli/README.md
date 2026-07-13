# jobup-ch-cli

Zero-dependency CLI that searches job listings on [jobup.ch](https://www.jobup.ch),
the leading job board for French-speaking Switzerland (Romandie). Same JobCloud
platform as jobs.ch. Runs on `bun`, no install beyond dev types.

```bash
cd .agents/skills/jobup-ch-search/cli
bun install          # dev types only (typescript, @types/bun); zero runtime deps
bun run typecheck    # tsc --noEmit
bun test             # flag validation + live smoke tests
```

## Usage

```bash
bun run src/cli.ts search -q "data analyst" -l "Genève" --jobage 7 --format table
bun run src/cli.ts detail 4dd76eb4-17d2-461a-ae8e-bdc64b5dadd2 --format plain
```

See `../SKILL.md` for the full command reference and `../url-reference.md` for the
endpoint/parsing anchors (what to update if jobup.ch changes its markup).

## Design

- **No runtime dependencies** — plain `bun` + `fetch` + regex parsing.
- Reads only robots-**allowed** pages: the SSR listing (`/fr/emplois/`) and the
  single-UUID detail page (`/fr/emplois/detail/<uuid>/`). It never touches the
  robots-disallowed `/api/` endpoints.
- Detail parsing uses the page's schema.org `JobPosting` `ld+json` — robust to CSS churn.
- **Personal use only** — keep volume low (jobup.ch terms). See `../SKILL.md`.
