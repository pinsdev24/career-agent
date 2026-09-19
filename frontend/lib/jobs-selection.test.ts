import { describe, expect, it } from "vitest";
import {
  includeFetchedJob,
  jobsHref,
  mergeJobQuery,
  readJobQueryId,
  resolveJobSelection,
} from "./jobs-selection";

describe("readJobQueryId", () => {
  it("treats missing, empty, and whitespace as no selection", () => {
    expect(readJobQueryId(null)).toBeNull();
    expect(readJobQueryId(undefined)).toBeNull();
    expect(readJobQueryId("")).toBeNull();
    expect(readJobQueryId("   ")).toBeNull();
  });

  it("trims a posting id", () => {
    expect(readJobQueryId("  abc-123  ")).toBe("abc-123");
  });
});

describe("jobsHref", () => {
  it("links Home tiles to /jobs when no id is available", () => {
    expect(jobsHref()).toBe("/jobs");
    expect(jobsHref(null)).toBe("/jobs");
    expect(jobsHref("  ")).toBe("/jobs");
  });

  it("uses the same posting id Jobs selection already uses", () => {
    expect(jobsHref("posting-1")).toBe("/jobs?job=posting-1");
  });

  it("encodes ids so the query stays valid", () => {
    expect(jobsHref("a b")).toBe("/jobs?job=a%20b");
  });
});

describe("mergeJobQuery", () => {
  it("sets, replaces, and clears the job param without inventing extra routes", () => {
    expect(mergeJobQuery("", "posting-1")).toBe("/jobs?job=posting-1");
    expect(mergeJobQuery("job=old", "posting-2")).toBe("/jobs?job=posting-2");
    expect(mergeJobQuery("job=posting-1", null)).toBe("/jobs");
  });

  it("preserves unrelated query params", () => {
    expect(mergeJobQuery("foo=1", "posting-1")).toBe("/jobs?foo=1&job=posting-1");
    expect(mergeJobQuery("foo=1&job=x", null)).toBe("/jobs?foo=1");
  });
});

describe("resolveJobSelection", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("defaults to the first row when the query is missing", () => {
    expect(resolveJobSelection(items, null)).toEqual({
      status: "default",
      selected: items[0],
    });
    expect(resolveJobSelection([], "")).toEqual({
      status: "default",
      selected: null,
    });
  });

  it("keeps the current row on a default load if it is still in the feed", () => {
    expect(resolveJobSelection(items, null, "c")).toEqual({
      status: "default",
      selected: items[2],
    });
  });

  it("matches the requested posting id in the current feed", () => {
    expect(resolveJobSelection(items, "b")).toEqual({
      status: "matched",
      selected: items[1],
    });
  });

  it("asks for a fetch when the id is not in the current recommend results", () => {
    expect(resolveJobSelection(items, "missing", "a")).toEqual({
      status: "needs_fetch",
      id: "missing",
      fallback: items[0],
    });
  });
});

describe("includeFetchedJob", () => {
  it("prepends a fetched posting that is not already in the feed", () => {
    const items = [{ id: "a" }];
    const fetched = { id: "z" };
    expect(includeFetchedJob(items, fetched)).toEqual([fetched, ...items]);
  });

  it("does not duplicate a posting that is already listed", () => {
    const items = [{ id: "a" }, { id: "b" }];
    expect(includeFetchedJob(items, items[1]!)).toEqual(items);
  });
});
