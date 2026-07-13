import { describe, test, expect } from "bun:test";
import { runCLI, parseJSON } from "./helpers";

interface SearchResult {
  meta: { count: number; page: number };
  results: Array<{ id: string; title: string; url: string; company: string | null; location: string | null }>;
}

function parsedStderr(stderr: string): { error?: string; code?: string } {
  try {
    return JSON.parse(stderr);
  } catch {
    return {};
  }
}

describe("jobs-ch-search CLI", () => {
  describe("flag validation", () => {
    test("bogus --jobage exits 1 with a JSON error on stderr", async () => {
      const result = await runCLI(["search", "-q", "test", "--jobage", "foo"]);
      expect(result.exitCode).toBe(1);
      expect(parsedStderr(result.stderr).code).toBe("BAD_ARG");
    });

    test("detail with no id exits 1 with NO_ID", async () => {
      const result = await runCLI(["detail"]);
      expect(result.exitCode).toBe(1);
      expect(parsedStderr(result.stderr).code).toBe("NO_ID");
    });

    test("unknown command exits 1 with BAD_CMD", async () => {
      const result = await runCLI(["frobnicate"]);
      expect(result.exitCode).toBe(1);
      expect(parsedStderr(result.stderr).code).toBe("BAD_CMD");
    });
  });

  describe("live search", () => {
    test("returns >=1 result with non-null id/title/url", async () => {
      const result = await runCLI(["search", "-q", "data analyst", "--limit", "5"]);
      expect(result.exitCode).toBe(0);
      const data = parseJSON<SearchResult>(result);
      expect(data.results.length).toBeGreaterThan(0);
      const first = data.results[0];
      expect(first.id).toBeTruthy();
      expect(first.title).toBeTruthy();
      expect(first.url).toContain("jobs.ch");
    }, 30000);
  });

  describe("live detail", () => {
    test("first search result resolves to a readable detail", async () => {
      const search = await runCLI(["search", "-q", "data analyst", "--limit", "3"]);
      const data = parseJSON<SearchResult>(search);
      const id = data.results[0].id;
      const detail = await runCLI(["detail", id, "--format", "plain"]);
      expect(detail.exitCode).toBe(0);
      expect(detail.stdout.length).toBeGreaterThan(50);
    }, 30000);
  });
});
