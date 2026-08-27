/**
 * Deployment platforms don't all inject cross-service URLs the same way —
 * some environment variable sources hand you a full URL, others a bare
 * hostname (Render's blueprint `fromService`/`property: host`, for one,
 * is intentionally unconfirmed either way in docs/render.yaml at deploy
 * time — see that file's header comment). Normalizing at the point of use
 * means a bare hostname and a full URL both work, instead of a same-turn
 * guess about which shape a given platform provides turning into a CORS
 * or fetch failure discovered only after a real deploy.
 */
export function ensureUrlScheme(value: string, defaultScheme: 'http' | 'https' = 'https'): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${defaultScheme}://${trimmed}`;
}
