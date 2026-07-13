---
name: jobup-ch-search
version: 1.0.0
description: >
  Search live job listings on jobup.ch — the leading job board for French-speaking
  Switzerland / Romandie (operated by JobCloud AG), covering Geneva, Vaud, Valais,
  Fribourg, Neuchâtel and Jura. Use whenever the user wants to find jobs, vacancies,
  or open positions in Romandie / western Switzerland (Genève, Lausanne, Fribourg,
  Sion, Neuchâtel, etc.), or to look up a specific jobup.ch posting. Trigger phrases:
  jobs in Geneva, jobs in Lausanne, jobs in Romandie, jobup.ch, offres d'emploi,
  recherche d'emploi, emploi Suisse romande, "are there any X jobs in <Romandie city>".
context: fork
allowed-tools: Bash(bun run skills/jobup-ch-search/cli/src/cli.ts *)
---

# jobup.ch Search Skill

Search live job listings from **jobup.ch**, the leading job board for **French-speaking
Switzerland (Romandie)** — Geneva, Vaud, Valais, Fribourg, Neuchâtel and Jura. jobup.ch is
operated by JobCloud AG and runs the **same platform** as jobs.ch. No authentication, no
API key, and **zero runtime dependencies** — it runs with just `bun`.

For all of Switzerland (including the German- and Italian-speaking regions), use the
sister skill **jobs-ch-search**.

## ⚠️ Personal use only

jobup.ch's `robots.txt` disallows its `/api/` and `/api_proxy/` endpoints, so this skill
deliberately does **not** use the JSON API. It reads only the robots-allowed,
server-rendered listing (`/fr/emplois/`) and detail (`/fr/emplois/detail/<uuid>/`) pages.
Even so, automated access may be restricted by jobup.ch's terms of service, so **keep
volume low and don't use it commercially or for bulk data collection.** Run it on your own
responsibility.

## When to use this skill

- Search for job openings in French-speaking Switzerland (Romandie / western cantons)
- Filter by keyword, location, and recency (posted within N days)
- Get the full description of a specific jobup.ch posting

## Commands

### Search job listings

```bash
bun run skills/jobup-ch-search/cli/src/cli.ts search [--query "<text>"] [--location "<place>"] [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — keyword search (title, skill, role). Recommended. French terms work well (`infirmière`, `ingénieur`, `comptable`).
- `--location <text>` / `-l <text>` — a Swiss place or canton, e.g. `"Genève"`, `"Lausanne"`, `"Fribourg"`, `"Valais"`, `"Neuchâtel"`.
- `--jobage <days>` — posted within N days (maps to jobup.ch's `publication-date`). Omit for all postings.
- `--page <n>` — page number (1-indexed, ~20 results per page).
- `--limit <n>` / `-n <n>` — cap total results emitted (client-side).
- `--format json|table|plain` — default `json`.

### Fetch full job detail

```bash
bun run skills/jobup-ch-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

`id` is the job UUID from `search` results (e.g. `4dd76eb4-17d2-461a-ae8e-bdc64b5dadd2`).
You may also pass a full `jobup.ch/.../detail/...` URL. Returns the title, company,
location, contract type, workload, category, and full description (parsed from the
posting's schema.org `JobPosting` data).

## Usage examples

```bash
# Data analyst roles in Geneva, posted in the last 7 days
bun run skills/jobup-ch-search/cli/src/cli.ts search -q "data analyst" -l "Genève" --jobage 7 --format table

# Nursing roles in Lausanne (French keyword)
bun run skills/jobup-ch-search/cli/src/cli.ts search -q "infirmière" -l "Lausanne" --format table

# Software engineering roles in Fribourg
bun run skills/jobup-ch-search/cli/src/cli.ts search -q "ingénieur logiciel" -l "Fribourg" --format json

# Full details for a specific job
bun run skills/jobup-ch-search/cli/src/cli.ts detail 4dd76eb4-17d2-461a-ae8e-bdc64b5dadd2 --format plain
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

- Data is parsed from jobup.ch's public server-rendered pages — no credentials required.
- `date` on search results is jobup.ch's **relative** label (e.g. "il y a 3 jours"). `detail` returns the exact `datePosted` ISO timestamp.
- Job IDs are **UUIDs** (e.g. `4dd76eb4-17d2-461a-ae8e-bdc64b5dadd2`) — pass them as-is to `detail`.
- jobup.ch shares its job database with jobs.ch (same JobCloud platform), so a given UUID resolves on both sites; jobup.ch is filtered toward Romandie postings.
- Page size is fixed by jobup.ch at ~20 results per page.
- jobup.ch may rate-limit; the CLI retries 429/5xx with exponential backoff. Keep volume low (see ToS note above).
- If jobup.ch changes its page markup, `url-reference.md` records the parsing anchors to update.
