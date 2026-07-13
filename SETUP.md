# How to use this tool

Everything runs inside **Claude Code**, by typing 5 commands. No web app, nothing to configure.

## One-time setup

```bash
# install the job-search CLIs (one line)
for d in .agents/skills/*/cli; do (cd "$d" && bun install); done

# open Claude Code in this folder
claude
```

Then, inside Claude Code:

```
/setup
```

It reads your CV / LinkedIn from the `documents/` folder (or interviews you) and builds your profile once. Re-run it anytime you add documents.

## The 5 commands

| Type this | What you get |
|---|---|
| **/setup** | Build/refresh your profile from your documents |
| **/scrape** | Find new matching jobs across every site for your cities — **you don't type a role, it uses your profile** |
| **/analyze** | Score your CV: ATS keywords, a roast (before → better), and roles you fit — based on real postings |
| **/salary** `Zurich` | Real pay + cost of living for a city (vs Milan), with sources |
| **/apply** `<job link>` | Tailors your CV + writes the cover letter for that exact job |

## Typical flow

```
/scrape                 → see fresh matching jobs
/analyze                → check your CV is strong
/salary Amsterdam       → is it worth it?
/apply <link>           → get a tailored CV + cover letter
```

That's it. Just talk to Claude between commands — ask follow-ups, request changes, anything.

<sub>Advanced (optional): `/add-portal` add a new job site · `/expand` enrich your profile · `/upskill` learning plan · `/add-template` use your own CV template · `/reset` start over.</sub>
