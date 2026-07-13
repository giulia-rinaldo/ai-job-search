# /analyze - CV Analysis & ATS Report

You are running a rigorous CV analysis for the candidate. Produce an honest, specific report — not a keyword count. Use your own judgment plus **live web search** to ground claims in how real postings and ATS systems for this role actually behave.

## Input

`$ARGUMENTS` may contain a target role and/or country (e.g. `Product Designer, Germany`). If absent, infer the target role from the profile (`CLAUDE.md` / `.claude/skills/job-application-assistant/01-candidate-profile.md`) and state your assumption.

## Steps

1. **Load the CV & profile.** Read the CV in `documents/cv/` with the Read tool (it renders PDFs). Also read `01-candidate-profile.md`. If there is no CV file, ask the user to drop one in `documents/cv/` or paste the text.
2. **Fix the target.** State the target role, seniority, and country you're analyzing against.
3. **Ground in reality.** WebSearch 2–3 *current* real postings for this role + country. Extract the skills, tools, and phrasing they actually require — this is your keyword baseline, not guesswork.
4. **Score /100.** Assess and show a band (71–90 great · 51–70 good · 21–50 fair) across:
   - **Keyword/skill coverage** vs the real postings above.
   - **Impact & quantification** — numbers, scale, outcomes.
   - **Structure & ATS-parseability** — single column, standard headings, no text trapped in images, contact as real text.
   - **Language/eligibility signal** — e.g. English C1 stated for international roles; work authorization clear.
5. **ATS keyword gaps.** Two lists: ✅ present vs ➕ missing (from step 3). Flag synonym-only matches to tighten to the posting's exact term where truthfully applicable.
6. **Roast — Before → Better.** Quote 3–5 of the candidate's **actual weak bullets verbatim**, then rewrite each with scale, stack and a measurable result. Never invent numbers — use `[X users]` / `[Y%]` placeholders the candidate must fill.
7. **Compatible roles.** Rank 3–5 role titles the CV genuinely supports, each with a rough match %, the skills they *have*, and what to *add*.
8. **Priorities.** A short numbered fix-list, highest-impact first.

## Output

A clean markdown report with the sections above. End with:
> Want me to tailor this CV to a specific posting and write the cover letter? Run **/apply <url>**. Want pay & cost-of-living for a city? Run **/salary <role> in <city>**.

## Rules

- Never fabricate experience, skills, employers, dates, or numbers.
- Ground every ATS/keyword claim in postings you actually web-searched — cite them.
- Be direct and specific. This is a roast, not flattery.
