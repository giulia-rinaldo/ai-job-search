// Data source: jobup.ch public pages (operated by JobCloud AG — the same platform
// as jobs.ch, focused on French-speaking Switzerland / Romandie).
//
// jobup.ch robots.txt DISALLOWS /api/ and /api_proxy/, so this CLI deliberately
// does NOT touch the JSON API. Instead it reads two robots-allowed, server-rendered
// pages:
//   - the listing page  /fr/emplois/?term=...          (job cards, parsed from HTML)
//   - the detail page   /fr/emplois/detail/<uuid>/      (schema.org JobPosting ld+json)
// Both are plain SSR HTML, so a browser User-Agent + regex parsing is enough — no
// runtime dependencies. Personal use only (see SKILL.md).

export const BASE = "https://www.jobup.ch"
export const LISTING_PATH = "/fr/emplois/"
export const DETAIL_PATH = "/fr/emplois/detail/"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

/** Fetch a page with exponential backoff on 429/5xx. Returns "" on a 404. */
export async function htmlFetch(url: string): Promise<string> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
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
    if (response.status === 404) return ""
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return response.text()
  }
  throw new Error("Request failed after max retries")
}

export interface JobCard {
  id: string
  title: string
  company: string | null
  location: string | null
  workload: string | null
  contractType: string | null
  date: string | null
  url: string
}

export interface JobDetail extends JobCard {
  description: string | null
  employmentType: string | null
  category: string | null
  companyUrl: string | null
  applyUrl: string | null
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function clean(html: string): string {
  return decodeHtmlEntities(stripTags(html))
}

/** Pull the job UUID out of a detail URL, a listing href, or a bare id. */
export function idFromInput(input: string): string | null {
  const m = input.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
  return m ? m[1].toLowerCase() : null
}

/**
 * Parse the SSR listing page. The site splits cleanly on the per-card anchor
 * `data-cy="job-link"`, so each chunk is one card and we take the first match
 * of each field — one malformed card cannot break the rest.
 *
 * Field anchors (utility-class based, so language-independent across jobs.ch/jobup.ch):
 *   - date     : <p> whose class carries `max-w_[min-content]`  (e.g. "3 days ago")
 *   - company  : <p> whose class carries `fw_bold`
 *   - location : the first plain caption <p> (Place of work), before workload/contract
 */
export function parseJobCards(html: string): JobCard[] {
  const results: JobCard[] = []
  const chunks = html.split(/data-cy="job-link"/).slice(1)

  for (const chunk of chunks) {
    const id =
      chunk.match(/id="vacancy-link-([0-9a-f-]{20,})"/i)?.[1] ??
      chunk.match(/\/detail\/([0-9a-f-]{20,})\/?/i)?.[1]
    if (!id) continue

    const title = chunk.match(/\btitle="([^"]*)"/)?.[1]
    if (!title) continue

    const hrefM = chunk.match(/href="(\/[a-z]{2}\/[^"]*\/detail\/[^"]+)"/i)
    const url = hrefM ? BASE + decodeHtmlEntities(hrefM[1]) : `${BASE}${DETAIL_PATH}${id}/`

    // Collect every caption <p> in card order, then classify by its class signature.
    const caps: { cls: string; text: string }[] = []
    const capRe = /<p class="([^"]*textStyle_caption1[^"]*)">([^<]+)<\/p>/g
    let m: RegExpExecArray | null
    while ((m = capRe.exec(chunk)) !== null) {
      caps.push({ cls: m[1], text: clean(m[2]) })
    }

    const date = caps.find((c) => c.cls.includes("max-w_[min-content]"))?.text ?? null
    const company = caps.find((c) => c.cls.includes("fw_bold"))?.text ?? null
    // Plain caption rows, in order: [location, workload, contractType].
    const plain = caps.filter(
      (c) =>
        !c.cls.includes("max-w_[min-content]") &&
        !c.cls.includes("fw_bold") &&
        !c.cls.includes("c_black"),
    )
    const location = plain[0]?.text ?? null
    const workload = plain[1]?.text ?? null
    const contractType = plain[2]?.text ?? null

    results.push({
      id: id.toLowerCase(),
      title: decodeHtmlEntities(title),
      company,
      location,
      workload,
      contractType,
      date,
      url,
    })
  }

  return results
}

/** Extract the schema.org JobPosting object embedded in a detail page. */
function extractJobPosting(html: string): Record<string, unknown> | null {
  const blocks = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi,
  )
  if (!blocks) return null
  for (const block of blocks) {
    const json = block.replace(/^[\s\S]*?>/, "").replace(/<\/script>$/i, "")
    let parsed: unknown
    try {
      parsed = JSON.parse(json)
    } catch {
      continue
    }
    const items = Array.isArray(parsed) ? parsed : [parsed]
    for (const it of items) {
      if (it && typeof it === "object" && (it as any)["@type"] === "JobPosting") {
        return it as Record<string, unknown>
      }
    }
  }
  return null
}

function joinLocation(jobLocation: unknown): string | null {
  const places = Array.isArray(jobLocation) ? jobLocation : [jobLocation]
  const parts: string[] = []
  for (const p of places) {
    const addr = (p as any)?.address
    if (!addr) continue
    const locality = addr.addressLocality || addr.addressRegion
    const country = addr.addressCountry?.name || addr.addressCountry
    const label = [addr.postalCode, locality].filter(Boolean).join(" ")
    const full = [label || locality, typeof country === "string" ? country : null]
      .filter(Boolean)
      .join(", ")
    if (full) parts.push(full)
  }
  return parts.length ? [...new Set(parts)].join(" / ") : null
}

/** Parse a single job's detail page into a JobDetail via its JobPosting ld+json. */
export function parseJobDetail(html: string, id: string): JobDetail | null {
  const jp = extractJobPosting(html)
  if (!jp) return null

  const org = jp.hiringOrganization as any
  const company = org?.name ? decodeHtmlEntities(String(org.name)) : null
  const companyUrl = org?.sameAs ? String(org.sameAs) : null

  const rawDesc = typeof jp.description === "string" ? jp.description : null
  const description = rawDesc
    ? decodeHtmlEntities(
        stripTags(
          rawDesc
            .replace(/<\s*br\s*\/?>/gi, "\n")
            .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n"),
        ).replace(/\n{3,}/g, "\n\n"),
      ).trim() || null
    : null

  const employmentType = Array.isArray(jp.employmentType)
    ? jp.employmentType.join(", ")
    : (jp.employmentType as string) ?? null

  const url = typeof jp.url === "string" ? jp.url : `${BASE}${DETAIL_PATH}${id}/`

  // occupationalCategory is usually a CategoryCode object ({ name, codeValue }).
  const cat = jp.occupationalCategory as any
  const category =
    typeof cat === "string"
      ? cat
      : cat?.name
        ? String(cat.name)
        : null

  return {
    id,
    title: jp.title ? decodeHtmlEntities(String(jp.title)) : "(untitled)",
    company,
    location: joinLocation(jp.jobLocation),
    workload: (jp.workHours as string) ?? null,
    contractType: employmentType,
    date: typeof jp.datePosted === "string" ? jp.datePosted : null,
    url,
    description,
    employmentType,
    category,
    companyUrl,
    applyUrl: url,
  }
}
