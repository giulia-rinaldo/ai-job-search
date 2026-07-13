# 🔎 AI Job Search — web app

A friendly, shareable job-search app. It runs **two ways from one codebase** ([docs/index.html](../docs/index.html)):

- **Free hosted site (GitHub Pages)** — searches **five live job sources directly in the
  browser** via their CORS-open APIs: **Greenhouse** (Figma, Airbnb, Stripe, Anthropic…),
  **Lever** (Spotify, Palantir…), **Ashby** (OpenAI, Notion, Ramp, Perplexity, Cohere…),
  **Remotive** (remote jobs) and **Arbeitnow** (EU jobs) — dozens of companies, no backend,
  no cost. Anyone can use it.
- **Local mode (this server)** — `bun run ui/server.ts` runs the same five browser sources
  **and** adds a backend that searches **LinkedIn and the Swiss/Danish boards** (jobs.ch,
  jobup.ch, Jobindex, Jobbank), saves uploaded documents into `documents/`, and appends
  shortlisted jobs to `job_search_tracker.csv`.

The app auto-detects which mode it's in and adjusts the available sources.

## Run locally (full power)

```bash
bun run ui/server.ts
```

Open the printed URL (auto-picks a free port; `PORT=4000 …` to force one).

## Host it free on GitHub Pages

The whole app is the single self-contained file `docs/index.html`. To publish:

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch =
   `main`, folder = **`/docs`**. Save.
3. Your site goes live at `https://<user>.github.io/<repo>/` — share that link with anyone.

(The hosted site searches Greenhouse, Lever, Ashby, Remotive & Arbeitnow live; for LinkedIn +
Swiss/Danish boards, people run it locally.)

## What it does

- **Onboarding wizard** — name, level, **document upload**, roles, **skills**, cities, notes.
  Locally, uploaded files are also saved into `documents/uploads/` so Claude Code's `/setup`
  can read them. Everything is stored in the browser (nothing is uploaded by the app itself).
- **Search anywhere** — pick/type any city, "All my cities", or "🌍 Worldwide". Only sources
  that cover the chosen place are shown.
- **Alignment %** — every result gets a match score against your profile (role, skills, level,
  location), sorted best-first.
- **⭐ Shortlist** — star jobs; **Download CSV** or (local) **Add to tracker CSV**.
- **⚖ Compare** — side-by-side alignment breakdown of shortlisted jobs (role/skills/level, matched vs missing skills).
- **📤 Share** — a link/QR that loads your profile into anyone's copy; plus Export/Import JSON.
- **🌐 More job sites** — one-click links to public-sector portals (USAJOBS, EU/EPSO, UK Civil
  Service, Careers@Gov, UN…) and local boards (Seoul: Wanted/JobKorea/Saramin, etc.) that block
  scraping and must be opened directly.

## AI mode (optional — genuinely generative)

By default the Career tools (CV roast, cover letter, interview prep) are strong
**deterministic** drafts and the app stays free/static. To unlock the ✨ **AI** buttons —
a real line-by-line CV roast, an AI-written cover letter, and tailored STAR interview
answers — run locally with an Anthropic API key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...        # your key — stays on your machine
export AIJS_MODEL=claude-sonnet-5          # optional; default is claude-sonnet-5
bun run ui/server.ts
```

- The key is a **server-side env var** — it is never sent to the browser, written to
  disk, or committed. The frontend only calls the local `/api/ai` endpoint.
- Without a key, `/api/capabilities` reports `ai:false` and the app silently falls back
  to the deterministic drafts. The hosted GitHub Pages site is always deterministic
  (no server, no key).
- Cost is a few cents per generation. If the default model id ever errors, set
  `AIJS_MODEL` to a current model.

## Cost of living

The CV report shows a live **World Bank price level** (PPP factor ÷ market exchange
rate, US≈1.00) fetched directly in the browser from the CORS-open World Bank API, with a
built-in index as fallback, plus a deep-dive link to **Numbeo**. No API key needed.

## Notes

- Zero runtime dependencies — Bun's built-in server + `Bun.spawn`; the hosted app is pure
  static HTML/JS.
- AI-powered CV parsing, tailoring, and cover letters live in the Claude Code `/setup` +
  `/apply` workflow — this app is the profile + search + shortlist front end.
- City→source mapping lives at the top of both `docs/index.html` (baked `CFG`) and `server.ts`
  (`CITIES`/`SOURCES`) — keep them in sync when adding a city.
