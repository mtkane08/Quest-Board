/**
 * Section 24: "New creators require review for public quests until
 * trusted. Trusted status can be suspended and never exempts content from
 * safety systems." Gate 4 shipped a manually-set `users.creator_trust`
 * boolean as an explicit placeholder for this. This module adds the real
 * mechanism — a reputation ledger — without removing the manual override
 * (an admin can still hand-grant trust; a track record can also earn it).
 * Both paths funnel into one `computeIsTrusted` check.
 */
export type ReputationEventType = 'quest_approved' | 'quest_rejected' | 'report_upheld_against';

export interface ReputationEvent {
  eventType: ReputationEventType;
  points: number;
}

export const REPUTATION_POINTS: Record<ReputationEventType, number> = {
  quest_approved: 1,
  quest_rejected: -1,
  report_upheld_against: -3,
};

export const TRUST_SCORE_THRESHOLD = 3;

export function computeReputationScore(events: ReputationEvent[]): number {
  return events.reduce((sum, e) => sum + e.points, 0);
}

/**
 * "Trusted status can be suspended" — a manual override can revoke trust
 * even if the earned score would otherwise grant it, by setting
 * `manualOverride: false` explicitly rather than leaving it undefined.
 * `undefined` means "no manual opinion, defer to the earned score."
 */
export function computeIsTrusted(reputationScore: number, manualOverride: boolean | undefined): boolean {
  if (manualOverride !== undefined) return manualOverride;
  return reputationScore >= TRUST_SCORE_THRESHOLD;
}
