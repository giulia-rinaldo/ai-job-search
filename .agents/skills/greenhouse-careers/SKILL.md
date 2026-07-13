---
name: greenhouse-careers
version: 1.0.0
description: >
  Search live job openings directly from company career sites hosted on Greenhouse
  (Figma, Airbnb, Stripe, Anthropic, Reddit, Pinterest, Webflow, and hundreds more) —
  big-tech and design-forward employers, via Greenhouse's public JSON API. Use whenever
  the user wants jobs AT a specific tech/design company or across a set of them, filtered
  by role and city (any location worldwide — New York, San Francisco, London, Amsterdam,
  Singapore, remote, etc.). Trigger phrases: jobs at <company>, careers at <company>,
  big tech design jobs, product designer at a tech company, company career page, Greenhouse
  jobs, jobs at Figma/Airbnb/Stripe, design jobs at startups.
context: fork
allowed-tools: Bash(bun run skills/greenhouse-careers/cli/src/cli.ts *)
---

# Greenhouse Careers Search Skill

Search job openings straight from the source — the career sites of companies that host on
**Greenhouse**. Greenhouse exposes a public, no-auth JSON API (`boards-api.greenhouse.io`),
and hundreds of big-tech and design-forward employers use it: **Figma, Webflow, Airbnb,
Pinterest, Stripe, Anthropic, Reddit, Discord, Monzo, Dropbox, Coinbase, Robinhood, Lyft,
GitLab, Asana, Brex**, and many more. **Zero runtime dependencies** — runs with just `bun`.

One board = one company. The skill fans out across a curated default set (or any companies
you name with `--company`) and filters by role keyword, city, and posting age.

## When to use this skill

- Find design/product roles at specific tech companies (or a whole set at once)
- Target company career pages directly — especially for **New York, San Francisco, London,
  and remote** roles, where these companies concentrate hiring
- Get the full description of a specific posting

> Best for big-tech/startup company hiring (global, US-heavy). For a specific European city's
> broad market, pair with LinkedIn and the country boards (jobs.ch, jobindex.dk, …).

## Commands

### Search across company boards

```bash
bun run skills/greenhouse-careers/cli/src/cli.ts search [--query "<text>"] [--location "<city>"] [--company a,b,c] [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — role keywords, matched against the job title (e.g. `"product designer"`, `"UX"`).
- `--location <text>` / `-l <text>` — city/country/`Remote` substring (e.g. `"New York"`, `"London"`, `"Amsterdam"`, `"Remote"`).
- `--company <list>` / `-c <list>` — comma-separated Greenhouse board tokens. Defaults to a curated design-forward / big-tech set of 16 companies.
- `--jobage <days>` — posted within N days (uses `first_published`). Omit for all.
- `--limit <n>` / `-n <n>` — cap results emitted (client-side).
- `--format json|table|plain` — default `json`.

### Fetch full job detail

```bash
bun run skills/greenhouse-careers/cli/src/cli.ts detail <url | company:id | id --company <c>> [--format json|plain]
```

Accepts a Greenhouse job URL, a `company:id` pair (e.g. `figma:6014530004`), or a bare `id`
with `--company`. Returns the full description (HTML stripped to readable text), team, and posting date.

## Usage examples

```bash
# Product designer roles in New York, last 45 days (default company set)
bun run skills/greenhouse-careers/cli/src/cli.ts search -q "product designer" -l "New York" --jobage 45 --format table

# Design roles across just Figma, Airbnb, Stripe
bun run skills/greenhouse-careers/cli/src/cli.ts search -q "designer" -l "San Francisco" -c figma,airbnb,stripe --format table

# Any remote design role
bun run skills/greenhouse-careers/cli/src/cli.ts search -q "designer" -l "Remote" --format table

# Full detail for one posting
bun run skills/greenhouse-careers/cli/src/cli.ts detail figma:6014530004 --format plain
```

## Adding companies

Pass any company's Greenhouse **board token** (the slug in `boards.greenhouse.io/<token>`) to
`--company`. To find it, open a company's careers page — if the listings live on
`boards.greenhouse.io/<token>` or `job-boards.greenhouse.io/<token>`, that `<token>` works here.

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing IDs to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

JSON search output is `{ "meta": { "count", "companies" }, "results": [...] }` where each
result has `id`, `title`, `company`, `location`, `department`, `date`, `url`. All errors go to
**stderr** as `{ "error": "...", "code": "..." }` with exit code `1`.

## Notes

- Data is the public Greenhouse Job Board API — no auth, no key.
- There is no server-side search: each board returns all its jobs and the CLI filters client-side, so `--query`/`--location` are simple case-insensitive substring matches.
- `date` is the job's `first_published` (falls back to `updated_at`), as an ISO `YYYY-MM-DD`.
- Job ids are numeric and **per company** — always pair an id with its company (`company:id`) for `detail`.
- Not every company uses Greenhouse (some use Lever, Ashby, or in-house — e.g. Google, Apple, Spotify). Those aren't reachable here; use LinkedIn or their own site.
