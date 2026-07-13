#!/usr/bin/env bun
// Local backend for the AI Job Search web app (docs/index.html).
//
//   bun run ui/server.ts     →     open the printed http://localhost:PORT
//
// The SAME app also runs for free as a static site on GitHub Pages (docs/), where it
// searches big-tech (Greenhouse) directly in the browser. Running it locally like this
// adds a backend so it can also search LinkedIn and the local boards, save uploaded
// documents into documents/, and append shortlisted jobs to job_search_tracker.csv.
//
// Zero runtime dependencies: Bun's built-in server + Bun.spawn.

import { resolve, join, basename } from "path"
import { existsSync, mkdirSync } from "node:fs"

const ROOT = resolve(import.meta.dir, "..")
const SKILLS = join(ROOT, ".agents", "skills")
const APP = join(ROOT, "docs", "index.html")
const DOCS = join(ROOT, "documents", "uploads")
const TRACKER = join(ROOT, "job_search_tracker.csv")
const PORT = Number(process.env.PORT) || 3000

interface Source { label: string; cli: string; global?: boolean }
const ALL_SOURCES: Record<string, Source> = {
  linkedin: { label: "LinkedIn", cli: "linkedin-search", global: true },
  greenhouse: { label: "Big Tech (Greenhouse)", cli: "greenhouse-careers", global: true },
  jobsch: { label: "jobs.ch", cli: "jobs-ch-search" },
  jobup: { label: "jobup.ch", cli: "jobup-ch-search" },
  jobindex: { label: "Jobindex (DK)", cli: "jobindex-search" },
  jobbank: { label: "Jobbank (DK)", cli: "jobbank-search" },
}
const SOURCES: Record<string, Source> = Object.fromEntries(
  Object.entries(ALL_SOURCES).filter(([, s]) => existsSync(join(SKILLS, s.cli, "cli", "src", "cli.ts"))),
)
const GLOBAL = Object.keys(SOURCES).filter((k) => SOURCES[k].global)

type CityConf = Partial<Record<string, string>>
const CITIES: Record<string, CityConf> = {
  Helsinki: { linkedin: "Helsinki, Finland", greenhouse: "Helsinki" },
  Copenhagen: { linkedin: "Copenhagen, Denmark", jobindex: "København", jobbank: "København", greenhouse: "Copenhagen" },
  Amsterdam: { linkedin: "Amsterdam, Netherlands", greenhouse: "Amsterdam" },
  Zurich: { linkedin: "Zurich, Switzerland", jobsch: "Zurich", greenhouse: "Zurich" },
  Geneva: { linkedin: "Geneva, Switzerland", jobup: "Genève", greenhouse: "Geneva" },
  Basel: { linkedin: "Basel, Switzerland", jobsch: "Basel", greenhouse: "Basel" },
  Bern: { linkedin: "Bern, Switzerland", jobsch: "Bern", greenhouse: "Bern" },
  Paris: { linkedin: "Paris, France", greenhouse: "Paris" },
  Brussels: { linkedin: "Brussels, Belgium", greenhouse: "Brussels" },
  London: { linkedin: "London, United Kingdom", greenhouse: "London" },
  Berlin: { linkedin: "Berlin, Germany", greenhouse: "Berlin" },
  Seoul: { linkedin: "Seoul, South Korea", greenhouse: "Seoul" },
  Singapore: { linkedin: "Singapore", greenhouse: "Singapore" },
  "Hong Kong": { linkedin: "Hong Kong SAR", greenhouse: "Hong Kong" },
  Shanghai: { linkedin: "Shanghai, China", greenhouse: "Shanghai" },
  "New York": { linkedin: "New York, United States", greenhouse: "New York" },
  "San Francisco": { linkedin: "San Francisco, California, United States", greenhouse: "San Francisco" },
  Remote: { linkedin: "Remote", greenhouse: "Remote" },
}

interface Job { id: string; title: string; company: string | null; location: string | null; date: string | null; url: string; source: string; city: string; content?: string }

function applicableSources(entry: string): string[] {
  if (entry === "__WORLD__") return GLOBAL
  if (CITIES[entry]) return Object.keys(CITIES[entry]).filter((k) => k in SOURCES)
  return GLOBAL
}
function locFor(entry: string, source: string): string | null {
  if (entry === "__WORLD__") return source === "greenhouse" ? "" : source === "linkedin" ? "Worldwide" : null
  if (CITIES[entry]) return CITIES[entry][source] ?? null
  return entry
}
const displayCity = (e: string) => (e === "__WORLD__" ? "Worldwide" : e)

async function runSource(key: string, location: string, city: string, role: string, jobage: number) {
  const src = SOURCES[key]
  const cliPath = join(SKILLS, src.cli, "cli", "src", "cli.ts")
  const args = ["run", cliPath, "search", "-q", role, "-l", location, "--jobage", String(jobage), "--limit", "25", "--format", "json"]
  try {
    const proc = Bun.spawn(["bun", ...args], { cwd: ROOT, stdout: "pipe", stderr: "pipe" })
    const timeout = new Promise<null>((r) => setTimeout(() => r(null), 35000))
    const done = (async () => ({ out: await new Response(proc.stdout).text(), code: await proc.exited }))()
    const res = await Promise.race([done, timeout])
    if (res === null) { proc.kill(); return { key, jobs: [] as Job[], error: "timed out" } }
    if (res.code !== 0) {
      const err = await new Response(proc.stderr).text()
      return { key, jobs: [] as Job[], error: err.trim().slice(0, 150) || `exit ${res.code}` }
    }
    const data = JSON.parse(res.out)
    const jobs: Job[] = (data.results || []).map((r: any) => ({
      id: String(r.id ?? ""), title: r.title ?? "", company: r.company ?? null, location: r.location ?? null,
      date: r.date ?? null, url: r.url ?? "", source: src.label, city,
    }))
    return { key, jobs }
  } catch (e) {
    return { key, jobs: [] as Job[], error: e instanceof Error ? e.message : String(e) }
  }
}

async function search(cities: string[], role: string, sources: string[], jobage: number) {
  const tasks: Promise<{ key: string; jobs: Job[]; error?: string }>[] = []
  for (const entry of cities.length ? cities : ["__WORLD__"]) {
    const applicable = applicableSources(entry)
    for (const s of sources) {
      if (!(s in SOURCES) || !applicable.includes(s)) continue
      const loc = locFor(entry, s)
      if (loc === null) continue
      tasks.push(runSource(s, loc, displayCity(entry), role, jobage))
    }
  }
  const settled = await Promise.all(tasks)
  const seen = new Set<string>()
  const results: Job[] = []
  const status: Record<string, number | string> = {}
  for (const r of settled) {
    const label = SOURCES[r.key].label
    if (r.error) status[label] = `⚠ ${r.error}`
    else status[label] = (typeof status[label] === "number" ? (status[label] as number) : 0) + r.jobs.length
    for (const j of r.jobs) {
      const k = (j.url || `${j.title}|${j.company}`).toLowerCase()
      if (seen.has(k)) continue
      seen.add(k); results.push(j)
    }
  }
  return { results, status }
}

// --- Tracker CSV ---------------------------------------------------------------
const CSV_HEADER = "date,company,sector,role,role_type,channel,status,contact_person,fit_rating,notes,cv_file,cover_letter_file,source"
const csvEsc = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
async function appendTracker(jobs: any[]) {
  let text = ""
  try { text = await Bun.file(TRACKER).text() } catch {}
  if (!text.trim()) text = CSV_HEADER + "\n"
  const lower = text.toLowerCase()
  const today = new Date().toISOString().slice(0, 10)
  const rows: string[] = []
  let added = 0
  for (const j of jobs) {
    const url = (j.url || "").toLowerCase()
    if (url && lower.includes(url)) continue
    rows.push([today, j.company, "", j.title, "", j.source, "shortlisted", "", (j.align && j.align.pct ? j.align.pct + "%" : ""),
      `${j.city || ""}${j.location ? " · " + j.location : ""}`, "", "", j.url].map(csvEsc).join(","))
    added++
  }
  if (added) await Bun.write(TRACKER, (text.endsWith("\n") ? text : text + "\n") + rows.join("\n") + "\n")
  return { added, total: jobs.length }
}

// --- Server --------------------------------------------------------------------
const handlers = {
  idleTimeout: 120 as const,
  async fetch(req: Request) {
    const url = new URL(req.url)
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(Bun.file(APP), { headers: { "Content-Type": "text/html; charset=utf-8" } })
    }
    if (url.pathname === "/api/capabilities") {
      return Response.json({
        local: true,
        sources: Object.fromEntries(Object.entries(SOURCES).map(([k, v]) => [k, v.label])),
        cities: Object.fromEntries(Object.entries(CITIES).map(([c, v]) => [c, Object.keys(v).filter((k) => k in SOURCES)])),
        global: GLOBAL,
      })
    }
    if (url.pathname === "/api/search") {
      const p = url.searchParams
      let cities: string[] = []
      try { cities = JSON.parse(p.get("cities") || "[]") } catch {}
      return Response.json(await search(cities, p.get("role") || "", (p.get("sources") || "").split(",").filter(Boolean), Number(p.get("age")) || 14))
    }
    if (url.pathname === "/api/tracker" && req.method === "POST") {
      try { const b = (await req.json()) as { jobs: any[] }; return Response.json(await appendTracker(b.jobs || [])) }
      catch (e) { return Response.json({ error: String(e) }, { status: 400 }) }
    }
    if (url.pathname === "/api/save-doc" && req.method === "POST") {
      try {
        const form = await req.formData()
        const file = form.get("file")
        if (file && typeof file !== "string") {
          mkdirSync(DOCS, { recursive: true })
          const name = basename((file as File).name).replace(/[^\w.\- ]/g, "_")
          await Bun.write(join(DOCS, name), file as File)
          return Response.json({ saved: name })
        }
        return Response.json({ error: "no file" }, { status: 400 })
      } catch (e) { return Response.json({ error: String(e) }, { status: 400 }) }
    }
    return new Response("Not found", { status: 404 })
  },
}

let server
for (let port = PORT; port < PORT + 20; port++) {
  try { server = Bun.serve({ port, ...handlers }); break }
  catch (e: any) { if (e?.code === "EADDRINUSE") { console.log(`  port ${port} in use, trying ${port + 1}…`); continue } throw e }
}
if (!server) { console.error(`\n  No free port in ${PORT}–${PORT + 19}. Set PORT=<n>.\n`); process.exit(1) }

console.log(`\n  🔎 AI Job Search running →  http://localhost:${server.port}`)
console.log(`  Mode: local · sources: ${Object.values(SOURCES).map((s) => s.label).join(", ") || "none"}\n`)
