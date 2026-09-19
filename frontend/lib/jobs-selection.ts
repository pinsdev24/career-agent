/** Home → Jobs deep-link: `?job=<postingId>` uses the same id as list selection. */

export const JOBS_PATH = "/jobs";
export const JOB_QUERY_PARAM = "job";

export function readJobQueryId(
  value: string | null | undefined
): string | null {
  const id = (value ?? "").trim();
  return id.length > 0 ? id : null;
}

export function jobsHref(jobId?: string | null): string {
  const id = readJobQueryId(jobId ?? null);
  if (!id) return JOBS_PATH;
  return `${JOBS_PATH}?${JOB_QUERY_PARAM}=${encodeURIComponent(id)}`;
}

export function mergeJobQuery(
  currentSearch: string | URLSearchParams,
  jobId: string | null | undefined
): string {
  const params = new URLSearchParams(
    typeof currentSearch === "string" ? currentSearch : currentSearch.toString()
  );
  const id = readJobQueryId(jobId ?? null);
  if (id) params.set(JOB_QUERY_PARAM, id);
  else params.delete(JOB_QUERY_PARAM);
  const qs = params.toString();
  return qs ? `${JOBS_PATH}?${qs}` : JOBS_PATH;
}

export type JobSelectionResult<T extends { id: string }> =
  | { status: "default"; selected: T | null }
  | { status: "matched"; selected: T }
  | { status: "needs_fetch"; id: string; fallback: T | null };

export function resolveJobSelection<T extends { id: string }>(
  items: readonly T[],
  requestedId: string | null | undefined,
  currentSelectedId?: string | null
): JobSelectionResult<T> {
  const id = readJobQueryId(requestedId ?? null);
  const current =
    currentSelectedId != null
      ? items.find((item) => item.id === currentSelectedId) ?? null
      : null;

  if (!id) {
    return { status: "default", selected: current ?? items[0] ?? null };
  }

  const match = items.find((item) => item.id === id) ?? null;
  if (match) {
    return { status: "matched", selected: match };
  }

  return { status: "needs_fetch", id, fallback: current ?? items[0] ?? null };
}

export function includeFetchedJob<T extends { id: string }>(
  items: readonly T[],
  fetched: T
): T[] {
  if (items.some((item) => item.id === fetched.id)) {
    return items as T[];
  }
  return [fetched, ...items];
}
