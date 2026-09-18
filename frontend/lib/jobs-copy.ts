/** Jobs feed copy selectors — exact Cut 0/1 + Cut 3 strings live in messages/Jobs.*. */

export type JobsEmptyKind = "filters" | "geo_role" | "geo" | "role" | "warming";

export type JobsChipKind = "for" | "title_only" | "location_only" | "remote";

export type JobsCopyContext = {
  title?: string | null;
  location?: string | null;
  remote?: boolean | null;
  structuredFilters?: boolean | null;
};

function nonEmpty(value: string | null | undefined): string {
  return (value || "").trim();
}

/** Most specific empty: filters > geo+role > geo | role > warming. Ready users only. */
export function selectJobsEmptyKind(ctx: JobsCopyContext): JobsEmptyKind {
  if (ctx.structuredFilters) return "filters";
  const title = Boolean(nonEmpty(ctx.title));
  const location = Boolean(nonEmpty(ctx.location));
  if (title && location) return "geo_role";
  if (location) return "geo";
  if (title) return "role";
  return "warming";
}

/**
 * Context chip only when title or location/remote is set.
 * Prefer title+location over remote; never invent filler labels.
 */
export function selectJobsChipKind(ctx: JobsCopyContext): JobsChipKind | null {
  const title = nonEmpty(ctx.title);
  const location = nonEmpty(ctx.location);
  const remote = ctx.remote === true;
  if (!title && !location && !remote) return null;
  if (title && location) return "for";
  if (title && remote) return "remote";
  if (title) return "title_only";
  if (location) return "location_only";
  return null;
}

export function jobsEmptyMessageKeys(kind: JobsEmptyKind): {
  title:
    | "empty_filters"
    | "empty_geo_role"
    | "empty_geo"
    | "empty_role"
    | "empty_warming";
  hint:
    | "empty_filters_hint"
    | "empty_geo_role_hint"
    | "empty_geo_hint"
    | "empty_role_hint"
    | "empty_warming_hint";
} {
  switch (kind) {
    case "filters":
      return { title: "empty_filters", hint: "empty_filters_hint" };
    case "geo_role":
      return { title: "empty_geo_role", hint: "empty_geo_role_hint" };
    case "geo":
      return { title: "empty_geo", hint: "empty_geo_hint" };
    case "role":
      return { title: "empty_role", hint: "empty_role_hint" };
    default:
      return { title: "empty_warming", hint: "empty_warming_hint" };
  }
}

export function jobsChipMessageKey(
  kind: JobsChipKind
):
  | "matches_for"
  | "matches_for_title_only"
  | "matches_for_location_only"
  | "matches_for_remote" {
  switch (kind) {
    case "for":
      return "matches_for";
    case "title_only":
      return "matches_for_title_only";
    case "location_only":
      return "matches_for_location_only";
    case "remote":
      return "matches_for_remote";
  }
}
