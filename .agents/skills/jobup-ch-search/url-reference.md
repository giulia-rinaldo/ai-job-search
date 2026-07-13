# jobup.ch — endpoint & parsing reference

Data source for the `jobup-ch-search` CLI. jobup.ch is operated by **JobCloud AG** and
runs the **same React SSR platform as jobs.ch**, focused on French-speaking Switzerland
(Romandie). We parse the SSR HTML, not the client JSON API.

## robots.txt (checked 2026-07)

`https://www.jobup.ch/robots.txt` (`User-agent: *`) disallows, among others:

- `Disallow: /api/`
- `Disallow: /api_proxy/`

**Implications:**
- The JSON API (`/api/`, `/api_proxy/`) is **off-limits** — this CLI does not use it.
- The listing page `/fr/emplois/` and the single-UUID detail page `/fr/emplois/detail/<uuid>/` are not disallowed, so this CLI uses only those.

Automated access may still be limited by jobup.ch's Terms of Service → the skill ships a
personal-use-only warning.

## Search (listing) page

```
GET https://www.jobup.ch/fr/emplois/?term=<keywords>&location=<place>&publication-date=<days>&page=<n>
```

| Parameter          | Meaning                              | CLI flag      |
|--------------------|--------------------------------------|---------------|
| `term`             | keyword query                        | `--query/-q`  |
| `location`         | Swiss city or canton                 | `--location/-l` |
| `publication-date` | posted within N days                 | `--jobage`    |
| `page`             | 1-indexed page (~20 results/page)    | `--page`      |

The response is SSR HTML. There is **no** per-job `ld+json` on the listing page (only a
`BreadcrumbList`), so job cards are parsed from markup.

### Per-card anchors

Cards split cleanly on the substring `data-cy="job-link"` (one chunk per card). Within a card:

| Field       | Anchor |
|-------------|--------|
| `id` (UUID) | `id="vacancy-link-<uuid>"`, or the `<uuid>` in the `.../detail/<uuid>/` href |
| `title`     | the `title="..."` attribute on the job-link `<a>` |
| `url`       | the job-link `href` (relative → prefix `https://www.jobup.ch`) |
| `date`      | the `<p>` whose class contains `max-w_[min-content]` — a **relative** label ("il y a 3 jours") |
| `company`   | the `<p>` whose class contains `fw_bold` |
| `location`  | the first plain `textStyle_caption1` `<p>` (order in card is: location, workload, contractType) |
| `workload`  | the second plain caption `<p>` (e.g. "80 – 100%") |
| `contractType` | the third plain caption `<p>` (e.g. "Poste fixe", "Temporaire") |

The class-based anchors (`max-w_[min-content]`, `fw_bold`, `textStyle_caption1`) are the
same utility classes as on jobs.ch, so the parser is **language-independent** — it does
not depend on the French label words ("Lieu de travail" etc.).

## Detail page

```
GET https://www.jobup.ch/fr/emplois/detail/<uuid>/
```

SSR HTML containing **two** `<script type="application/ld+json">` blocks:
1. `BreadcrumbList`
2. `JobPosting` ← the one we parse

### JobPosting fields used

| JSON path                         | Maps to |
|-----------------------------------|---------|
| `title`                           | `title` |
| `hiringOrganization.name`         | `company` |
| `hiringOrganization.sameAs`       | `companyUrl` |
| `jobLocation[].address` (`postalCode`, `addressLocality`/`addressRegion`, `addressCountry.name`) | `location` |
| `datePosted` (ISO 8601)           | `date` |
| `employmentType`                  | `contractType` / `employmentType` |
| `workHours`                       | `workload` |
| `occupationalCategory` (`CategoryCode.name`) | `category` |
| `description` (HTML)              | `description` (tags stripped, breaks preserved) |
| `url`                             | `url` / `applyUrl` |

## Notes / quirks

- jobup.ch shares its job database with jobs.ch (same JobCloud platform); a given UUID resolves on both sites. jobup.ch is filtered toward Romandie postings.
- Search `date` is relative text; `detail` `datePosted` is an exact ISO timestamp.
- A card may have no company logo `<picture>`, but the `fw_bold` company `<p>` is still present — hence the class anchor rather than a logo-relative one.
- The markup is identical to jobs.ch — if jobs.ch changes, jobup.ch changes with it. Keep both `url-reference.md` files in sync.
