# Greenhouse Job Board API — reference

Data source for the `greenhouse-careers` CLI. Greenhouse is an ATS whose **public** Job
Board API powers many companies' careers pages. No authentication, no API key.

## Base

```
https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs
```

`board_token` is the company slug (e.g. `figma`, `airbnb`, `stripe`). It's the same token
that appears in `boards.greenhouse.io/<token>` or `job-boards.greenhouse.io/<token>`.

## Endpoints used

| Purpose | Request | Notes |
|---------|---------|-------|
| List all jobs for a board | `GET /v1/boards/{token}/jobs?content=true` | `content=true` includes the full HTML description inline. Returns `{ "jobs": [ … ] }`. |
| Single job detail | `GET /v1/boards/{token}/jobs/{id}` | Returns one job object incl. `content`. |

There is **no server-side search / filter** on this API — you fetch the whole board and
filter client-side. That's why the CLI does keyword/location/age filtering in-process.

Unknown board token → HTTP `404` (the CLI treats a board fetch failure as empty, so one bad
token doesn't sink a multi-company search).

## Job object fields used

| Field | Maps to | Notes |
|-------|---------|-------|
| `id` | `id` | numeric, **unique per board** (pair with company for `detail`) |
| `title` | `title` | |
| `company_name` | `company` | falls back to the board token |
| `location.name` | `location` | free-text, e.g. `"San Francisco, CA"`, `"London, England"`, `"Remote - USA"` |
| `offices[].name` | (location fallback / match) | e.g. `["US"]` |
| `departments[].name` | `department` | e.g. `"Design"`, `"Marketing"` |
| `first_published` | `date` | ISO 8601 w/ offset → truncated to `YYYY-MM-DD` |
| `updated_at` | (date fallback) | |
| `content` | `description` (detail) | **HTML-entity-encoded** — decode before stripping tags |
| `absolute_url` | `url` | the public posting URL (query string stripped) |

## Filtering (client-side, in the CLI)

- **query** → case-insensitive: whole-string substring of the title, OR every token present in the title.
- **location** → case-insensitive substring of `location.name` or any `offices[].name`.
- **jobage** → `first_published` within N days of now (missing dates are kept).

## Quirks

- `content` is entity-encoded HTML (`&lt;p&gt;…`): the CLI decodes entities **first**, then strips tags, then decodes again.
- Boards are US/global-heavy: great coverage for New York, San Francisco, London, and remote; sparser for smaller European cities (use LinkedIn / country boards there).
- Board tokens that returned **0 jobs / 404** during setup (so not in the default set): `notion`, `doordash`, `plaid`, `ramp`, `miro`, `mollie`, `wetransfer`, `wise` — these use a different ATS or a non-obvious token.
- Verified default tokens (Jul 2026): figma, webflow, airbnb, pinterest, stripe, anthropic, reddit, discord, monzo, dropbox, coinbase, robinhood, lyft, gitlab, asana, brex.
