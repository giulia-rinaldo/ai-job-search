import { BASE_URL, htmlFetch, writeError } from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

interface JobDetail {
  id: string
  title: string | null
  company: string | null
  url: string
  description: string | null
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

/** Accept a bare Jobindex id (h123/r123), a /vis-job/<id> URL, or any jobindex job URL. */
function resolveUrl(input: string): { id: string; url: string } | null {
  const bare = input.match(/^([hr]\d{3,})$/)
  if (bare) return { id: bare[1], url: `${BASE_URL}/vis-job/${bare[1]}` }
  if (/^https?:\/\//i.test(input)) {
    const m = input.match(/\/vis-job\/([hr]\d+)/) || input.match(/([hr]\d{5,})/)
    return { id: m ? m[1] : input, url: input }
  }
  const m = input.match(/([hr]\d{3,})/)
  if (m) return { id: m[1], url: `${BASE_URL}/vis-job/${m[1]}` }
  return null
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const resolved = resolveUrl(opts.id)
  if (!resolved) {
    writeError(`Could not parse a Jobindex job id/url from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    const html = await htmlFetch(resolved.url)

    const title =
      html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1] ??
      html.match(/<title>([^<]*)<\/title>/i)?.[1] ??
      null

    const company = html.match(/<meta[^>]+name="author"[^>]+content="([^"]+)"/i)?.[1] ?? null

    // Prefer the main job-body container; fall back to og/meta description.
    let description: string | null = null
    const body =
      html.match(/<div[^>]+class="[^"]*jobtext[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i)?.[1] ??
      html.match(/<section[^>]*class="[^"]*PaidJob[^"]*"[^>]*>([\s\S]*?)<\/section>/i)?.[1] ??
      null
    if (body) {
      const withBreaks = body.replace(/<\s*br\s*\/?>/gi, "\n").replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
      description = decodeEntities(withBreaks.replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim() || null
    }
    if (!description) {
      description =
        html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1] ??
        html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1] ??
        null
      if (description) description = decodeEntities(description)
    }

    const job: JobDetail = {
      id: resolved.id,
      title: title
        ? decodeEntities(title)
            .replace(/\s*\|\s*Jobindex\s*$/i, "")
            .replace(/\s*-\s*\d{5,}\s*$/, "")
            .trim()
        : null,
      company,
      url: resolved.url,
      description,
    }

    if (opts.format === "plain") {
      process.stdout.write(
        [job.title || "(untitled)", job.company ? `Company: ${job.company}` : "", "", job.description || "(no description)", "", `URL: ${job.url}`]
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
