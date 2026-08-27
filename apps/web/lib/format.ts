export function formatDuration(minMinutes: number | null, maxMinutes: number | null): string {
  if (minMinutes == null && maxMinutes == null) return 'Time varies';
  const fmt = (m: number) => (m >= 60 ? `${(m / 60).toFixed(m % 60 === 0 ? 0 : 1)}h` : `${m}m`);
  if (minMinutes != null && maxMinutes != null && minMinutes !== maxMinutes) {
    return `${fmt(minMinutes)}–${fmt(maxMinutes)}`;
  }
  return fmt(minMinutes ?? maxMinutes ?? 0);
}

export function formatCost(minCents: number | null, maxCents: number | null): string {
  if (minCents == null && maxCents == null) return 'Cost varies';
  if (minCents === 0 && (maxCents === 0 || maxCents == null)) return 'Free';
  const fmt = (c: number) => `$${(c / 100).toFixed(0)}`;
  if (minCents != null && maxCents != null && minCents !== maxCents) {
    return `${fmt(minCents)}–${fmt(maxCents)}`;
  }
  return fmt(minCents ?? maxCents ?? 0);
}

export function formatDistance(meters: number | null): string | null {
  if (meters == null) return null;
  if (meters < 1000) return `${Math.round(meters)} m away`;
  return `${(meters / 1609.34).toFixed(1)} mi away`;
}

const TRUST_BADGE_LABEL: Record<string, string> = {
  ai_suggested: 'AI Suggested',
  community_created: 'Community Created',
  community_verified: 'Community Verified',
  creator_verified: 'Creator Verified',
  business_verified: 'Business Verified',
  quest_board_curated: 'Quest Board Curated',
  recently_confirmed: 'Recently Confirmed',
  conditions_uncertain: 'Conditions Uncertain',
};

export function formatTrustBadge(badge: string): string {
  return TRUST_BADGE_LABEL[badge.toLowerCase().replace(/\s+/g, '_')] ?? badge;
}

export const CONFIDENCE_LABEL: Record<string, string> = {
  high: 'High confidence',
  medium: 'Medium confidence — some details unverified',
  low: 'Low confidence — scout quest',
  critical_unknown: 'Confidence unknown',
};
