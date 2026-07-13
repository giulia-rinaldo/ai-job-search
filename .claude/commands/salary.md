# /salary - Live Salary & Cost-of-Living Research

Research **real, current** compensation and cost of living for a role in a place, using live web search. Be honest about ranges, sources, and uncertainty.

## Input

`$ARGUMENTS`: a role and one or more locations (e.g. `Product Designer in Berlin`, `Software Engineer, Zurich, 5 yrs`). If the role is missing, infer the target role from the profile and confirm. If the location is missing, ask for it (or use the candidate's target cities).

## Steps

1. **Parse** role, seniority (years / junior-mid-senior), and the location(s).
2. **Salary — search live.** WebSearch current ranges from credible sources: **levels.fyi** (tech, total comp), **Glassdoor**, **PayScale**, **LinkedIn Salary**, national statistics offices, and role-specific reports. Prefer the last 12–24 months; WebFetch a page when the snippet isn't enough.
   - Report a **gross annual range in local currency**, with a **median**, adjusted for the stated seniority.
   - Split **base vs total comp** where relevant (equity/bonus in big tech).
3. **Compare to home.** Give the equivalent range in the candidate's home market (**Italy**, unless told otherwise) and the **% difference**.
4. **Cost of living.** Search **Numbeo** for the city (rent 1-bed centre & outside, monthly essentials, a cost-of-living index vs the home city). Add the **World Bank price level** or **Eurostat** if useful. If you can find a reliable tax/net-pay calculator for the country, give an approximate **net take-home** and state your assumptions.
5. **Purchasing-power verdict.** Does the salary beat the local norm for this role? Does it stretch far given local costs vs home? One honest paragraph.

## Output

A markdown brief:
- **💰 Salary** — target range + median · home (Italy) range · % difference
- **🏙️ Cost of living** — rent, essentials, index vs home
- **🧮 Net & purchasing power** — approximate take-home + verdict
- **🔗 Sources** — every figure linked to the page you actually searched

## Rules

- Cite every number to a source you searched — **link it**. Say plainly when data is thin, dated, or estimated.
- Prefer honest ranges over false precision. Never invent figures.
