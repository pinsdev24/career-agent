import { describe, expect, it } from "vitest";
import { applyJobFilters } from "./job-engine";

describe("applyJobFilters", () => {
  it("omits query keys when the caller did not pass a bar payload", () => {
    const params = new URLSearchParams();
    applyJobFilters(params);
    expect(params.has("countries")).toBe(false);
  });

  it("sends empty countries so recommend cannot fall back to profile gates", () => {
    const params = new URLSearchParams();
    applyJobFilters(params, {
      countries: [],
      workModes: [],
      contractTypes: [],
      roles: [],
    });
    expect(params.get("countries")).toBe("");
    expect(params.get("work_modes")).toBe("");
    expect(params.get("contract_types")).toBe("");
    expect(params.get("roles")).toBe("");
  });
});
