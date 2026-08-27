/**
 * Duplicated from apps/api/src/config/normalizeUrl.ts rather than shared
 * via an internal package — these are two independently deployable apps
 * and this function is a few lines. See the API copy's comment for why it
 * exists: not every deployment platform hands cross-service env vars to
 * you with a scheme already attached.
 */
export function ensureUrlScheme(value: string, defaultScheme: 'http' | 'https' = 'https'): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${defaultScheme}://${trimmed}`;
}
