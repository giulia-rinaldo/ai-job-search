# jobs.ch — endpoint & parsing reference

Data source for the `jobs-ch-search` CLI. jobs.ch is operated by **JobCloud AG** and
runs a React app served with server-side rendering (SSR). We parse the SSR HTML, not
the client JSON API.

## robots.txt (checked 2026-07)

`https://www.jobs.ch/robots.txt` (`User-agent: *`) disallows, among others:

- `Disallow: /api/`
- `Disallow: /api_proxy/`
- `Disallow: /de/stellenangebote/detail/*/*/*` (and `/en/vacancies/detail/*/*/*`, `/fr/offres-emplois/detail/*/*/*`)

**Implications:**
- The JSON API (`/api/`, `/api_proxy/`) is **off-limits** — this CLI does not use it.
- The disallowed `detail/*/*/*` pattern is the legacy **3-segment SEO URL** (`detail/<company>/<title>/<id>`). The modern single-UUID detail URL `/en/vacancies/detail/<uuid>/` does **not** match that pattern, so it is allowed. This CLI uses only the single-UUID form.
- The listing page `/en/vacancies/` is not disallowed.

Automated access may still be limited by jobs.ch's Terms of Service → the skill ships a
personal-use-only warning.

## Search (listing) page

```
GET https://www.jobs.ch/en/vacancies/?term=<keywords>&location=<place>&publication-date=<days>&page=<n>
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
| `url`       | the job-link `href` (relative → prefix `https://www.jobs.ch`) |
| `date`      | the `<p>` whose class contains `max-w_[min-content]` — a **relative** label ("3 days ago") |
| `company`   | the `<p>` whose class contains `fw_bold` |
| `location`  | the first plain `textStyle_caption1` `<p>` (order in card is: location, workload, contractType) |
| `workload`  | the second plain caption `<p>` (e.g. "80 – 100%") |
| `contractType` | the third plain caption `<p>` (e.g. "Permanent position", "Temporary") |

The class-based anchors (`max-w_[min-content]`, `fw_bold`, `textStyle_caption1`) are
utility classes shared with jobup.ch, so the parser is **language-independent** — it does
not depend on the label words ("Place of work" vs "Lieu de travail").

## Detail page

```
GET https://www.jobs.ch/en/vacancies/detail/<uuid>/
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
| `occupationalCategory`            | `category` |
| `description` (HTML)              | `description` (tags stripped, breaks preserved) |
| `url`                             | `url` / `applyUrl` |

## Notes / quirks

- Search `date` is relative text; `detail` `datePosted` is an exact ISO timestamp.
- A card may have no company logo `<picture>`, but the `fw_bold` company `<p>` is still present — hence the class anchor rather than a logo-relative one.
- `location` filter matches by region: `location=Zurich` returns jobs across Kanton Zürich.
- jobup.ch (Romandie) is the same platform with paths `/fr/emplois/` and `/fr/emplois/detail/<uuid>/`.
