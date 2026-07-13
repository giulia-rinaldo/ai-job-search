import {
  rssFetch,
  parseRssDescription,
  extractJobIdFromUrl,
  writeError,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  location?: string
  jobage: number
  page: number
  limit?: number
  format: "json" | "table" | "plain"
}

export interface JobResult {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  deadline: string | null
}

// Map common Danish place/region names to Jobbank `amt` region IDs (see url-reference.md).
const AMT_IDS: Record<string, string> = {
  "københavn": "2",
  "copenhagen": "2",
  "storkøbenhavn": "2",
  "storkobenhavn": "2",
  "nordsjælland": "3",
  "østsjælland": "14",
  "vestsjælland": "4",
  "fyn": "13",
  "odense": "13",
  "sønderjylland": "12",
  "esbjerg": "11",
  "vestjylland": "9",
  "midtjylland": "7",
  "aarhus": "8",
  "århus": "8",
  "østjylland": "8",
  "nordjylland": "6",
  "aalborg": "6",
  "bornholm": "20",
  "øresund": "21",
}

function amtId(location?: string): string | null {
  if (!location) return null
  return AMT_IDS[location.trim().toLowerCase()] ?? null
}

/** jobage (days) → an `oprettet` YYYY-MM-DD "posted since" date. */
function opprettetSince(jobage: number): string | null {
  if (!jobage || jobage <= 0 || jobage >= 9999) return null
  const since = new Date(Date.now() - jobage * 86400_000)
  return since.toISOString().slice(0, 10)
}

function toIsoDate(pubDate: string): string | null {
  if (!pubDate) return null
  const t = Date.parse(pubDate)
  return isNaN(t) ? pubDate : new Date(t).toISOString().slice(0, 10)
}

function renderTable(jobs: JobResult[]): string {
  if (jobs.length === 0) return "No results."
  const rows = jobs.map((j) => {
    const title = (j.title || "").slice(0, 42).padEnd(42)
    const company = (j.company || "—").slice(0, 24).padEnd(24)
    const loc = (j.location || "—").slice(0, 22).padEnd(22)
    return `${j.id.padEnd(8)} ${title} ${company} ${loc} ${j.date || "—"}`
  })
  const header =
    "ID".padEnd(8) + " " + "TITLE".padEnd(42) + " " + "COMPANY".padEnd(24) + " " + "LOCATION".padEnd(22) + " DATE"
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const params: Record<string, string | string[]> = {}
    if (opts.query) params.key = opts.query
    const amt = amtId(opts.location)
    if (amt) params.amt = amt
    const since = opprettetSince(opts.jobage)
    if (since) params.oprettet = since
    if (opts.page > 1) params.page = String(opts.page)

    const items = await rssFetch(params)
    let jobs: JobResult[] = items.map((it) => {
      const d = parseRssDescription(it.description)
      return {
        id: extractJobIdFromUrl(it.link),
        title: it.title,
        company: d.company || null,
        location: d.location || null,
        date: toIsoDate(it.pubDate),
        url: it.link,
        deadline: d.deadline,
      }
    })
    if (opts.limit && opts.limit > 0) jobs = jobs.slice(0, opts.limit)

    const unmappedLocation = opts.location && !amt ? opts.location : null

    if (opts.format === "table") {
      process.stdout.write(renderTable(jobs) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(
        jobs
          .map(
            (j) =>
              `${j.title}\n  ${j.company || "—"} · ${j.location || "—"} · ${j.date || "—"}${j.deadline ? ` · frist ${j.deadline}` : ""}\n  id: ${j.id}\n  ${j.url}`,
          )
          .join("\n\n") + "\n",
      )
    } else {
      process.stdout.write(
        JSON.stringify(
          { meta: { count: jobs.length, page: opts.page, ...(unmappedLocation ? { unmappedLocation } : {}) }, results: jobs },
          null,
          2,
        ) + "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
