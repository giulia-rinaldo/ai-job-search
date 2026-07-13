import { BASE_URL, fetchWithUA, writeError } from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

function decodeEntities(t: string): string {
  return t
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c, 10)))
}

/** Accept a bare numeric id or a full jobbank.dk/job/<id>/... URL. */
function resolveUrl(input: string): { id: string; url: string } | null {
  if (/^\d+$/.test(input)) return { id: input, url: `${BASE_URL}/job/${input}/` }
  if (/^https?:\/\//i.test(input)) {
    const m = input.match(/\/job\/(\d+)\//)
    return { id: m ? m[1] : input, url: input }
  }
  const m = input.match(/(\d{4,})/)
  if (m) return { id: m[1], url: `${BASE_URL}/job/${m[1]}/` }
  return null
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const resolved = resolveUrl(opts.id)
  if (!resolved) {
    writeError(`Could not parse a Jobbank job id/url from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    const res = await fetchWithUA(resolved.url)
    if (res.status === 404) {
      writeError("Job not found", "NOT_FOUND")
      return 1
    }
    const html = await res.text()

    const title =
      html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1] ??
      html.match(/<title>([^<]*)<\/title>/i)?.[1] ??
      null

    let description: string | null = null
    const body =
      html.match(/<div[^>]+class="[^"]*job-ad-text[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i)?.[1] ??
      html.match(/<div[^>]+class="[^"]*job-description[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i)?.[1] ??
      null
    if (body) {
      const withBreaks = body.replace(/<\s*br\s*\/?>/gi, "\n").replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
      description =
        decodeEntities(withBreaks.replace(/<[^>]+>/g, " "))
          .replace(/[ \t]+/g, " ")
          .replace(/\n{3,}/g, "\n\n")
          .trim() || null
    }
    if (!description) {
      description =
        html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1] ??
        html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1] ??
        null
      if (description) description = decodeEntities(description)
    }

    const job = {
      id: resolved.id,
      title: title ? decodeEntities(title).replace(/\s*[-|]\s*Jobbank.*/i, "").trim() : null,
      url: resolved.url,
      description,
    }

    if (opts.format === "plain") {
      process.stdout.write(
        [job.title || "(untitled)", "", job.description || "(no description)", "", `URL: ${job.url}`]
          .filter((l) => l !== "")
          .join("\n") + "\n",
      )
    } else {
      process.stdout.write(JSON.stringify(job, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
