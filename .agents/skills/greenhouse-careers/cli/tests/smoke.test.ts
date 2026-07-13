import { describe, test, expect } from "bun:test";
import { runCLI, parseJSON } from "./helpers";

interface SearchResult {
  meta: { count: number; companies: string[] };
  results: Array<{ id: string; title: string; url: string; company: string; location: string | null }>;
}

function parsedStderr(stderr: string): { error?: string; code?: string } {
  try { return JSON.parse(stderr); } catch { return {}; }
}

describe("greenhouse-careers CLI", () => {
  test("bogus --jobage exits 1 with BAD_ARG on stderr", async () => {
    const r = await runCLI(["search", "-q", "designer", "--jobage", "foo"]);
    expect(r.exitCode).toBe(1);
    expect(parsedStderr(r.stderr).code).toBe("BAD_ARG");
  });

  test("detail with no id exits 1 with NO_ID", async () => {
    const r = await runCLI(["detail"]);
    expect(r.exitCode).toBe(1);
    expect(parsedStderr(r.stderr).code).toBe("NO_ID");
  });

  test("live search on one board returns design results with non-null id/title/url", async () => {
    const r = await runCLI(["search", "-q", "design", "-c", "figma", "--limit", "5"]);
    expect(r.exitCode).toBe(0);
    const data = parseJSON<SearchResult>(r);
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.results[0].id).toBeTruthy();
    expect(data.results[0].title.toLowerCase()).toContain("design");
    expect(data.results[0].url).toContain("greenhouse.io");
  }, 30000);

  test("live detail resolves via company:id", async () => {
    const s = await runCLI(["search", "-q", "design", "-c", "figma", "--limit", "1"]);
    const data = parseJSON<SearchResult>(s);
    const id = data.results[0].id;
    const d = await runCLI(["detail", `figma:${id}`, "--format", "plain"]);
    expect(d.exitCode).toBe(0);
    expect(d.stdout.length).toBeGreaterThan(40);
  }, 30000);
});
