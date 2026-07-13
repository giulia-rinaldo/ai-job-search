// Data source: Greenhouse Job Board API (boards-api.greenhouse.io) — the public,
// no-auth JSON API that hundreds of design-forward tech companies use for their
// careers pages (Figma, Airbnb, Stripe, Anthropic, Reddit, Pinterest, Webflow, …).
//
// One board = one company. The API returns ALL of a board's jobs in a single call,
// so there is no server-side search: we fetch each board and filter client-side by
// query, location, and posting age. Zero runtime dependencies.

export const BASE = "https://boards-api.greenhouse.io/v1/boards"

// Curated design-forward / big-tech boards (all verified to return jobs). The user
// can override with --company; these are the default fan-out.
export const DEFAULT_COMPANIES = [
  "figma",
  "webflow",
  "airbnb",
  "pinterest",
  "stripe",
  "anthropic",
  "reddit",
  "discord",
  "monzo",
  "dropbox",
  "coinbase",
  "robinhood",
  "lyft",
  "gitlab",
  "asana",
  "brex",
]

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

/** GET JSON with exponential backoff on 429/5xx. Returns null on 404 (unknown board). */
export async function jsonFetch<T>(url: string): Promise<T | null> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    return (await response.json()) as T
  }
  throw new Error("Request failed after max retries")
}

export interface GreenhouseJob {
  id: number
  title: string
  absolute_url: string
  location?: { name?: string }
  offices?: { name?: string }[]
  departments?: { name?: string }[]
  first_published?: string
  updated_at?: string
  content?: string
  company_name?: string
}

export interface JobResult {
  id: string
  title: string
  company: string
  location: string | null
  department: string | null
  date: string | null
  url: string
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c, 10)))
}

export function stripHtml(html: string): string {
  // Greenhouse `content` is HTML-entity-encoded (e.g. "&lt;p&gt;…"), so decode
  // first, then convert block/line breaks to newlines and strip the real tags.
  const decoded = decodeHtmlEntities(html)
  const withBreaks = decoded
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
  return decodeHtmlEntities(withBreaks.replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function isoDate(s?: string): string | null {
  if (!s) return null
  const t = Date.parse(s)
  return isNaN(t) ? s : new Date(t).toISOString().slice(0, 10)
}

export function normalize(job: GreenhouseJob, company: string): JobResult {
  const offices = (job.offices || []).map((o) => o.name).filter(Boolean).join(" • ")
  const location = job.location?.name || offices || null
  const department = (job.departments || []).map((d) => d.name).filter(Boolean).join(", ") || null
  return {
    id: String(job.id),
    title: decodeHtmlEntities(job.title || "").trim(),
    company: job.company_name || company,
    location,
    department,
    date: isoDate(job.first_published || job.updated_at),
    url: (job.absolute_url || "").split("?")[0],
  }
}

/** Title matches if the whole query is a substring OR every query token appears. */
export function matchesQuery(title: string, query?: string): boolean {
  if (!query) return true
  const hay = title.toLowerCase()
  const q = query.toLowerCase().trim()
  if (hay.includes(q)) return true
  return q.split(/\s+/).every((tok) => hay.includes(tok))
}

/** Location matches if the filter is a substring of the job location or any office. */
export function matchesLocation(job: GreenhouseJob, location?: string): boolean {
  if (!location) return true
  const needle = location.toLowerCase().trim()
  const hay = [job.location?.name, ...(job.offices || []).map((o) => o.name)]
    .filter(Boolean)
    .join(" | ")
    .toLowerCase()
  return hay.includes(needle)
}

/** Posted (first_published) within `days`. Missing dates are kept (not filtered out). */
export function withinJobAge(job: GreenhouseJob, days: number): boolean {
  if (!days || days <= 0 || days >= 9999) return true
  const s = job.first_published || job.updated_at
  if (!s) return true
  const t = Date.parse(s)
  if (isNaN(t)) return true
  return t >= Date.now() - days * 86400_000
}
