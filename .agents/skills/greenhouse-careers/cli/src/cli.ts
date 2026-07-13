#!/usr/bin/env bun
// Self-contained CLI for searching jobs across companies that host their careers
// page on Greenhouse (boards-api.greenhouse.io) — Figma, Airbnb, Stripe, Anthropic,
// Reddit, Pinterest, Webflow, and hundreds more. Public API, no auth, zero runtime
// dependencies. One board = one company; --company fans out across many at once.

import { runSearch, type SearchOpts } from "./commands/search.js"
import { runDetail, type DetailOpts } from "./commands/detail.js"
import { DEFAULT_COMPANIES } from "./helpers.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  const alias: Record<string, string> = { q: "query", l: "location", n: "limit", c: "company" }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith("--") || a.startsWith("-")) {
      const key = alias[a.replace(/^-+/, "")] ?? a.replace(/^-+/, "")
      const next = argv[i + 1]
      if (next === undefined || next.startsWith("-")) flags[key] = true
      else { flags[key] = next; i++ }
    } else {
      ;(flags._ as string[]).push(a)
    }
  }
  return flags
}

const HELP = `greenhouse-careers — search jobs across Greenhouse-hosted company career sites

USAGE
  bun run src/cli.ts search [--query "<text>"] [--location "<city>"] [--company a,b,c] [flags]
  bun run src/cli.ts detail <url | company:id | id --company <c>> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>      Role keywords (matched against job title). e.g. "product designer".
  --location, -l <text>   City/country substring, e.g. "Amsterdam", "London", "New York", "Remote".
  --company, -c <list>    Comma-separated Greenhouse board tokens. Default: a curated
                          design-forward / big-tech set (${DEFAULT_COMPANIES.length} companies).
  --jobage <days>         Posted within N days (uses first_published). Default: all.
  --limit, -n <n>         Cap results emitted (client-side).
  --format <fmt>          json (default) | table | plain.

DEFAULT COMPANIES
  ${DEFAULT_COMPANIES.join(", ")}

EXAMPLES
  bun run src/cli.ts search -q "product designer" -l "London" --jobage 30 --format table
  bun run src/cli.ts search -q "designer" -l "New York" -c figma,airbnb,stripe --format table
  bun run src/cli.ts search -q "UX" -l "Amsterdam" --format json
  bun run src/cli.ts detail figma:6014530004 --format plain

Add any company by passing its Greenhouse board token to --company (the slug in
boards.greenhouse.io/<token>). Data: public Greenhouse Job Board API, no auth.
`

async function main(): Promise<number> {
  const argv = process.argv.slice(2)
  const flags = parseFlags(argv)
  const cmd = (flags._ as string[])[0]

  if (!cmd || flags.help || flags.h) {
    process.stdout.write(HELP)
    return cmd ? 0 : 1
  }

  if (cmd === "search") {
    const fmt = (flags.format as string) || "json"
    const parseIntFlag = (name: string, raw: string | boolean | string[]): number | null => {
      const val = parseInt(raw as string, 10)
      if (isNaN(val)) {
        process.stderr.write(JSON.stringify({ error: `--${name} must be a number, got "${raw}"`, code: "BAD_ARG" }) + "\n")
        return null
      }
      return val
    }
    for (const key of ["jobage", "limit"]) {
      if (flags[key] !== undefined) {
        const v = parseIntFlag(key, flags[key])
        if (v === null) return 1
        flags[key] = String(v)
      }
    }
    const companies =
      typeof flags.company === "string"
        ? flags.company.split(",").map((c) => c.trim()).filter(Boolean)
        : DEFAULT_COMPANIES

    const opts: SearchOpts = {
      query: typeof flags.query === "string" ? flags.query : undefined,
      location: typeof flags.location === "string" ? flags.location : undefined,
      companies,
      jobage: flags.jobage ? parseInt(flags.jobage as string, 10) : 9999,
      limit: flags.limit ? parseInt(flags.limit as string, 10) : undefined,
      format: (["json", "table", "plain"].includes(fmt) ? fmt : "json") as SearchOpts["format"],
    }
    return runSearch(opts)
  }

  if (cmd === "detail") {
    const input = (flags._ as string[])[1]
    if (!input) {
      process.stderr.write(JSON.stringify({ error: "detail requires a <url | company:id | id>", code: "NO_ID" }) + "\n")
      return 1
    }
    const fmt = (flags.format as string) || "json"
    const opts: DetailOpts = {
      input,
      company: typeof flags.company === "string" ? flags.company : undefined,
      format: (fmt === "plain" ? "plain" : "json") as DetailOpts["format"],
    }
    return runDetail(opts)
  }

  process.stderr.write(JSON.stringify({ error: `Unknown command "${cmd}"`, code: "BAD_CMD" }) + "\n")
  return 1
}

main().then((code) => process.exit(code))
