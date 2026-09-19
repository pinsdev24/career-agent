/** Jobs recommend/search query-string filters. */

export type JobSearchFilters = {
  countries?: string[];
  workModes?: string[];
  contractTypes?: string[];
  roles?: string[];
};

export function applyJobFilters(params: URLSearchParams, filters?: JobSearchFilters) {
  if (!filters) return;
  // Always send keys (including empty) so the engine can tell "all countries"
  // from "omit → inherit profile prefs". An omitted param used to keep the
  // profile hard-filter after the Jobs bar showed Tous les pays.
  params.set("countries", (filters.countries || []).join(","));
  params.set("work_modes", (filters.workModes || []).join(","));
  params.set("contract_types", (filters.contractTypes || []).join(","));
  params.set("roles", (filters.roles || []).join(","));
}
