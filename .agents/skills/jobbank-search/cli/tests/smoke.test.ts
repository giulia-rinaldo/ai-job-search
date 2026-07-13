import { describe, test, expect } from "bun:test";
import { runCLI, parseJSON } from "./helpers";

interface SearchResult {
  meta: { count: number; page: number };
  results: Array<{ id: string; title: string; url: string; company: string | null; location: string | null }>;
}

function parsedStderr(stderr: string): { error?: string; code?: string } {
  try { return JSON.parse(stderr); } catch { return {}; }
}

describe("jobbank-search CLI", () => {
  test("bogus --jobage exits 1 with BAD_ARG on stderr", async () => {
    const r = await runCLI(["search", "-q", "test", "--jobage", "foo"]);
    expect(r.exitCode).toBe(1);
    expect(parsedStderr(r.stderr).code).toBe("BAD_ARG");
  });

  test("detail with no id exits 1 with NO_ID", async () => {
    const r = await runCLI(["detail"]);
    expect(r.exitCode).toBe(1);
    expect(parsedStderr(r.stderr).code).toBe("NO_ID");
  });

  test("live search returns >=1 result with non-null id/title/url", async () => {
    const r = await runCLI(["search", "-q", "designer", "-l", "København", "--limit", "5"]);
    expect(r.exitCode).toBe(0);
    const data = parseJSON<SearchResult>(r);
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.results[0].id).toBeTruthy();
    expect(data.results[0].title).toBeTruthy();
    expect(data.results[0].url).toContain("jobbank.dk");
  }, 30000);
});
