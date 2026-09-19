import { describe, expect, it } from "vitest";
import { applyJobFilters } from "./job-filters";

describe("applyJobFilters", () => {
  it("sends empty countries so all-countries is not omitted", () => {
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

  it("sends selected ISO codes", () => {
    const params = new URLSearchParams();
    applyJobFilters(params, { countries: ["BE", "FR"] });
    expect(params.get("countries")).toBe("BE,FR");
  });

  it("omits keys entirely when filters are undefined (inherit profile)", () => {
    const params = new URLSearchParams();
    applyJobFilters(params, undefined);
    expect(params.has("countries")).toBe(false);
  });
});
