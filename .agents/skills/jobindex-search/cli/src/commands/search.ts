import {
  BASE_URL,
  htmlFetch,
  extractEmbeddedCardHtml,
  parseJobCards,
  writeError,
  type JobCard,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  location?: string
  jobage: number
  page: number
  limit?: number
  format: "json" | "table" | "plain"
}

// Map common Danish city/region names to Jobindex area slugs (see url-reference.md).
const AREA_SLUGS: Record<string, string> = {
  "københavn": "storkoebenhavn",
  "copenhagen": "storkoebenhavn",
  "storkøbenhavn": "storkoebenhavn",
  "storkobenhavn": "storkoebenhavn",
  "københavnsområdet": "storkoebenhavn",
  "nordsjælland": "nordsjaelland",
  "sjælland": "sjaelland",
  "zealand": "sjaelland",
  "fyn": "fyn",
  "funen": "fyn",
  "odense": "fyn",
  "nordjylland": "nordjylland",
  "aalborg": "nordjylland",
  "midtjylland": "midtjylland",
  "aarhus": "midtjylland",
  "århus": "midtjylland",
  "sydjylland": "sydjylland",
  "esbjerg": "sydjylland",
  "bornholm": "bornholm",
}

function areaSlug(location?: string): string | null {
  if (!location) return null
  const key = location.trim().toLowerCase()
  return AREA_SLUGS[key] ?? null
}

function buildUrl(opts: SearchOpts): string {
  const slug = areaSlug(opts.location)
  const path = slug ? `/jobsoegning/${slug}` : "/jobsoegning"
  const params = new URLSearchParams()
  if (opts.query) params.set("q", opts.query)
  if (opts.jobage && opts.jobage > 0 && opts.jobage < 9999) params.set("jobage", String(opts.jobage))
  if (opts.page > 1) params.set("page", String(opts.page))
  const qs = params.toString()
  return `${BASE_URL}${path}${qs ? `?${qs}` : ""}`
}

function renderTable(cards: JobCard[]): string {
  if (cards.length === 0) return "No results."
  const rows = cards.map((c) => {
    const title = (c.title || "").slice(0, 42).padEnd(42)
    const company = (c.company || "—").slice(0, 26).padEnd(26)
    const loc = (c.location || "—").slice(0, 20).padEnd(20)
    return `${c.id.padEnd(10)} ${title} ${company} ${loc} ${c.date || "—"}`
  })
  const header =
    "ID".padEnd(10) + " " + "TITLE".padEnd(42) + " " + "COMPANY".padEnd(26) + " " + "LOCATION".padEnd(20) + " DATE"
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    // Jobindex ignores an unknown area slug politely, but if a location was given and we
    // could not map it, note it so the caller knows filtering was keyword-only.
    const unmappedLocation = opts.location && !areaSlug(opts.location) ? opts.location : null

    const page = await htmlFetch(buildUrl(opts))
    let cards = parseJobCards(extractEmbeddedCardHtml(page))
    if (opts.limit && opts.limit > 0) cards = cards.slice(0, opts.limit)

    if (opts.format === "table") {
      process.stdout.write(renderTable(cards) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(
        cards
          .map(
            (c) =>
              `${c.title}\n  ${c.company || "—"} · ${c.location || "—"} · ${c.date || "—"}\n  id: ${c.id}\n  ${c.url}`,
          )
          .join("\n\n") + "\n",
      )
    } else {
      process.stdout.write(
        JSON.stringify(
          {
            meta: { count: cards.length, page: opts.page, ...(unmappedLocation ? { unmappedLocation } : {}) },
            results: cards,
          },
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
