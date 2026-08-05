export interface ProjectSummary {
  id: string;
  name: string;
  keyPrefix: string;
  avatarUrl: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Every Tasks page shares this default-selection rule: honor `?project=` if
// it's one of the caller's visible projects, otherwise fall back to the
// first one (or undefined if there are none at all). Rejecting non-UUID
// values up front (e.g. a stray "?project=undefined" from a stale link)
// means a malformed id can never reach a query as a raw uuid-column filter,
// where Postgres would reject it with a 22P02 error instead of us just
// falling back gracefully.
export function resolveProjectId(projects: ProjectSummary[], requested?: string): string | undefined {
  if (requested && UUID_RE.test(requested) && projects.some((p) => p.id === requested)) {
    return requested;
  }
  return projects[0]?.id;
}
