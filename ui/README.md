# 🔍 AI Job Search

A personal, shareable job-search web app. One file — [docs/index.html](../docs/index.html) — runs two ways.

## Use it

- **Free hosted** (GitHub Pages): searches **Greenhouse, Lever, Ashby, Remotive, Arbeitnow** live in your browser. Nothing to install.
- **Local** (`bun run ui/server.ts`): adds **LinkedIn + Swiss/Danish boards**, saves uploaded docs, and appends shortlisted jobs to a CSV.

## What it does

- **Profile** — skills up top; onboarding + an in-depth interview; import/export/share.
- **🧪 Analyze CV** — paste your CV → ATS score, keyword gaps by role & country, salary vs Italy + live World Bank cost-of-living, compatible roles, and a roast. Auto-runs once your CV is saved, and can fill your skills.
- **🔎 Search** — tick target cities (or 🌍 Worldwide), pick keywords, pick sources. Every result shows **alignment %, skills you lack, and an estimated salary**.
- **Per job** → **🎯 Adapt CV, cover letter & interview prep** aligned to that posting.

## ✨ AI (optional)

Turn on real AI roasts, cover letters and interview answers:

- **In-app:** ⚙️ menu → **✨ AI settings** → paste your [Anthropic API key](https://console.anthropic.com/settings/keys). Stored only in your browser, sent only to Anthropic.
- **Most secure (local):** `ANTHROPIC_API_KEY=sk-ant-… bun run ui/server.ts` (optional `AIJS_MODEL`). The key never leaves the server.

Without a key everything still works with strong deterministic drafts.

## Host it free

Push to GitHub → **Settings → Pages → deploy from `main` / `/docs`**. Your profile stays in your browser; nothing personal is committed.
