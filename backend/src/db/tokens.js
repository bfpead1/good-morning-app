/**
 * Merges freshly issued Google tokens into stored ones. Google only returns a refresh
 * token on the first consent (or when re-prompted), so a missing field in `incoming`
 * must never erase the one we already have.
 */
export function mergeTokens(existing = {}, incoming = {}) {
  const defined = Object.fromEntries(
    Object.entries(incoming).filter(([, v]) => v !== undefined && v !== null),
  );
  return { ...existing, ...defined };
}
