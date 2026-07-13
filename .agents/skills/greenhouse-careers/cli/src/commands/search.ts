import {
  BASE,
  jsonFetch,
  normalize,
  matchesQuery,
  matchesLocation,
  withinJobAge,
  writeError,
  type GreenhouseJob,
  type JobResult,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  location?: string
  companies: string[]
  jobage: number
  limit?: number
  format: "json" | "table" | "plain"
}

interface BoardResponse {
  jobs: GreenhouseJob[]
}

async function fetchBoard(company: string): Promise<{ company: string; jobs: GreenhouseJob[] }> {
  try {
    const data = await jsonFetch<BoardResponse>(`${BASE}/${encodeURIComponent(company)}/jobs?content=true`)
    return { company, jobs: data?.jobs ?? [] }
  } catch {
    return { company, jobs: [] }
  }
}

function renderTable(jobs: JobResult[]): string {
  if (jobs.length === 0) return "No results."
  const rows = jobs.map((j) => {
    const title = (j.title || "").slice(0, 40).padEnd(40)
    const company = (j.company || "—").slice(0, 14).padEnd(14)
    const loc = (j.location || "—").slice(0, 26).padEnd(26)
    return `${j.id.padEnd(11)} ${title} ${company} ${loc} ${j.date || "—"}`
  })
  const header =
    "ID".padEnd(11) + " " + "TITLE".padEnd(40) + " " + "COMPANY".padEnd(14) + " " + "LOCATION".padEnd(26) + " DATE"
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const boards = await Promise.all(opts.companies.map(fetchBoard))

    let results: JobResult[] = []
    for (const { company, jobs } of boards) {
      for (const job of jobs) {
        if (!matchesQuery(job.title || "", opts.query)) continue
        if (!matchesLocation(job, opts.location)) continue
        if (!withinJobAge(job, opts.jobage)) continue
        results.push(normalize(job, company))
      }
    }

    // Newest first (missing dates last).
    results.sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    if (opts.limit && opts.limit > 0) results = results.slice(0, opts.limit)

    if (opts.format === "table") {
      process.stdout.write(renderTable(results) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(
        results
          .map(
            (j) =>
              `${j.title}\n  ${j.company} · ${j.location || "—"} · ${j.date || "—"}\n  id: ${j.id} (--company ${j.company.toLowerCase()})\n  ${j.url}`,
          )
          .join("\n\n") + "\n",
      )
    } else {
      process.stdout.write(
        JSON.stringify(
          { meta: { count: results.length, companies: opts.companies }, results },
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
