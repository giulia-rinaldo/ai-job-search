---
name: jobs-ch-search
version: 1.0.0
description: >
  Search live job listings on jobs.ch — Switzerland's largest job board (operated
  by JobCloud AG), covering all Swiss cantons and languages (German, French,
  Italian, English). Use whenever the user wants to find jobs, vacancies, or open
  positions in Switzerland (Zurich, Bern, Geneva, Basel, Lausanne, Ticino, etc.),
  or to look up a specific jobs.ch posting. Trigger phrases: jobs in Switzerland,
  Swiss jobs, jobs.ch, Stellenangebote, offene Stellen, Jobsuche, Stellensuche,
  offres d'emploi, recherche d'emploi, "are there any X jobs in <Swiss city>".
context: fork
allowed-tools: Bash(bun run skills/jobs-ch-search/cli/src/cli.ts *)
---

# jobs.ch Search Skill

Search live job listings from **jobs.ch**, the largest job board in Switzerland
(operated by JobCloud AG). Covers all cantons and the country's language regions.
No authentication, no API key, and **zero runtime dependencies** — it runs with just `bun`.

For French-speaking Switzerland (Romandie), the sister board **jobup.ch** shares the
same platform — see the `jobup-ch-search` skill.

## ⚠️ Personal use only

jobs.ch's `robots.txt` disallows its `/api/` and `/api_proxy/` endpoints, so this skill
deliberately does **not** use the JSON API. It reads only the robots-allowed,
server-rendered listing (`/en/vacancies/`) and detail (`/en/vacancies/detail/<uuid>/`)
pages. Even so, automated access may be restricted by jobs.ch's terms of service, so
**keep volume low and don't use it commercially or for bulk data collection.** Run it on
your own responsibility.

## When to use this skill

- Search for job openings anywhere in Switzerland (any canton, any language region)
- Filter by keyword, location, and recency (posted within N days)
- Get the full description of a specific jobs.ch posting

## Commands

### Search job listings

```bash
bun run skills/jobs-ch-search/cli/src/cli.ts search [--query "<text>"] [--location "<place>"] [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — keyword search (title, skill, role). Recommended. German, French, Italian, or English terms all work.
- `--location <text>` / `-l <text>` — a Swiss place or canton, e.g. `"Zurich"`, `"Genève"`, `"Lausanne"`, `"Ticino"`, `"Bern"`.
- `--jobage <days>` — posted within N days (maps to jobs.ch's `publication-date`). Omit for all postings.
- `--page <n>` — page number (1-indexed, ~20 results per page).
- `--limit <n>` / `-n <n>` — cap total results emitted (client-side).
- `--format json|table|plain` — default `json`.

### Fetch full job detail

```bash
bun run skills/jobs-ch-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

`id` is the job UUID from `search` results (e.g. `4dd76eb4-17d2-461a-ae8e-bdc64b5dadd2`).
You may also pass a full `jobs.ch/.../detail/...` URL. Returns the title, company,
location, contract type, workload, category, and full description (parsed from the
posting's schema.org `JobPosting` data).

## Usage examples

```bash
# Data analyst roles in Zurich, posted in the last 7 days
bun run skills/jobs-ch-search/cli/src/cli.ts search -q "data analyst" -l "Zurich" --jobage 7 --format table

# Nursing roles in Bern (German keyword)
bun run skills/jobs-ch-search/cli/src/cli.ts search -q "Pflegefachfrau" -l "Bern" --format table

# Software engineering roles in Geneva
bun run skills/jobs-ch-search/cli/src/cli.ts search -q "software engineer" -l "Genève" --format json

# Full details for a specific job
bun run skills/jobs-ch-search/cli/src/cli.ts detail 4dd76eb4-17d2-461a-ae8e-bdc64b5dadd2 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing IDs to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

JSON search output is `{ "meta": { "count", "page" }, "results": [...] }` where each
result carries `id`, `title`, `company`, `location`, `workload`, `contractType`, `date`, `url`
(missing values are `null`). All errors are written to **stderr** as
`{ "error": "...", "code": "..." }` and the process exits with code `1`.

## Notes

- Data is parsed from jobs.ch's public server-rendered pages — no credentials required.
- `date` on search results is jobs.ch's **relative** label (e.g. "3 days ago", "14 hours ago"). `detail` returns the exact `datePosted` ISO timestamp.
- Job IDs are **UUIDs** (e.g. `4dd76eb4-17d2-461a-ae8e-bdc64b5dadd2`) — pass them as-is to `detail`.
- Page size is fixed by jobs.ch at ~20 results per page.
- jobs.ch may rate-limit; the CLI retries 429/5xx with exponential backoff. Keep volume low (see ToS note above).
- Location can be a city or a canton; jobs.ch matches on region, so `"Zurich"` also returns jobs across Kanton Zürich.
- If jobs.ch changes its page markup, `url-reference.md` records the parsing anchors to update.
