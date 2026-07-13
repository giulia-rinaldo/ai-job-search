import { BASE, jsonFetch, normalize, stripHtml, writeError, type GreenhouseJob } from "../helpers.js"

export interface DetailOpts {
  input: string
  company?: string
  format: "json" | "plain"
}

/** Resolve company + job id from a Greenhouse URL, a "company:id" pair, or a bare id + --company. */
function resolve(input: string, company?: string): { company: string; id: string } | null {
  // https://boards.greenhouse.io/<company>/jobs/<id>  or  ...?gh_jid=<id>
  const urlM = input.match(/greenhouse\.io\/(?:embed\/job_app\?for=)?([a-z0-9_-]+)\/jobs\/(\d+)/i)
  if (urlM) return { company: urlM[1], id: urlM[2] }
  const ghJid = input.match(/[?&]gh_jid=(\d+)/)
  const forM = input.match(/[?&]for=([a-z0-9_-]+)/i)
  if (ghJid && forM) return { company: forM[1], id: ghJid[1] }
  // company:id
  const pair = input.match(/^([a-z0-9_-]+):(\d+)$/i)
  if (pair) return { company: pair[1], id: pair[2] }
  // bare id + --company
  if (/^\d+$/.test(input) && company) return { company, id: input }
  return null
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const resolved = resolve(opts.input, opts.company)
  if (!resolved) {
    writeError(
      `Provide a Greenhouse job URL, "<company>:<id>", or an <id> with --company. Got "${opts.input}"`,
      "BAD_ID",
    )
    return 1
  }
  try {
    const job = await jsonFetch<GreenhouseJob>(
      `${BASE}/${encodeURIComponent(resolved.company)}/jobs/${resolved.id}`,
    )
    if (!job) {
      writeError("Job not found", "NOT_FOUND")
      return 1
    }
    const base = normalize(job, resolved.company)
    const description = job.content ? stripHtml(job.content) : null

    if (opts.format === "plain") {
      process.stdout.write(
        [
          base.title,
          `${base.company} · ${base.location || "—"}`,
          base.department ? `Team: ${base.department}` : "",
          base.date ? `Posted: ${base.date}` : "",
          "",
          description || "(no description)",
          "",
          `URL: ${base.url}`,
        ]
          .filter((l) => l !== "")
          .join("\n") + "\n",
      )
    } else {
      process.stdout.write(JSON.stringify({ ...base, description }, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
