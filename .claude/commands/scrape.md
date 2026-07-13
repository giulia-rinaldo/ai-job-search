# /scrape - Find matching jobs (from your profile — nothing to type)

Run the job search using **only the candidate's own data**. Do **not** ask the user for a role, title, or keywords — derive everything from their profile. The whole point is that the tool already knows what they want.

## Input

`$ARGUMENTS` is optional: a focus area (e.g. `service design`) narrows the search, or `broad` runs all categories. With no arguments, search the profile's full target set.

## Steps

1. **Load the profile — this is what to search for.** Read:
   - `.claude/skills/job-scraper/search-queries.md` — target role titles, key skills, cities/countries, portals (built from the profile).
   - `.claude/skills/job-application-assistant/01-candidate-profile.md` and `CLAUDE.md` — target roles, sectors, locations, deal-breakers, work authorization.
   The user types no role; you infer the roles, keywords, and cities from these files.
2. **Load state.** Read `job_scraper/seen_jobs.json` (create `{"seen":{}}` if missing) and `job_search_tracker.csv` — for dedupe.
3. **Search across sources** (follow `.claude/skills/job-scraper/SKILL.md`):
   - `WebSearch` the profile's queries (site-scoped where useful).
   - Use the portal CLIs for structured results, feeding them the **derived** role + city:
     `bun run .agents/skills/<portal>-search/cli/src/cli.ts search -q "<derived role>" -l "<target city>" --jobage 14 --format json`
     Portals: `jobs-ch-search`, `jobup-ch-search`, `jobindex-search`, `jobbank-search`, `linkedin-search`, `greenhouse-careers`. Run only those relevant to the profile's target cities.
4. **Filter & rate fit.** Keep postings matching the profile's target titles/sectors; drop expired or clearly out-of-scope. Quick fit rating (high / medium / low). Respect location + work-authorization constraints — flag roles that need visa sponsorship outside the EU.
5. **Dedupe & present.** Skip anything already in `seen_jobs.json` or the tracker. Present new matches in a table sorted by fit (high first), with 2–3 bullets for each high-fit match. Then ask: *"Want me to evaluate any of these in detail? Give me the number(s)"* → hand off to `/apply`.
6. **Store.** Add every fetched posting to `seen_jobs.json`.

## Rules

- **Never ask the user for a role or keyword** — derive them from the profile every time.
- Only present real jobs found via actual search / CLI results. Never fabricate postings.
- If the profile files are empty or still placeholders, stop and tell the user to run `/setup` first.
