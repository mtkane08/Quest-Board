/**
 * Section 19: "Badges, achievements, collections, and streaks." A small
 * fixed catalog for Gate 5 — proving the mechanism (evaluated after every
 * completion, persisted once, never re-awarded) rather than building out
 * the full achievement taxonomy the spec eventually wants.
 */
export interface BadgeDefinition {
  key: string;
  label: string;
  /** Completion count at which this badge is newly earned. */
  atCompletionCount: number;
}

export const BADGE_CATALOG: BadgeDefinition[] = [
  { key: 'first_completion', label: 'First Steps', atCompletionCount: 1 },
  { key: 'five_completions', label: 'Seasoned Adventurer', atCompletionCount: 5 },
  { key: 'twenty_five_completions', label: 'Veteran of the Realm', atCompletionCount: 25 },
];

/**
 * Pure: given the completion count before and after this event, returns
 * which badges were newly crossed — so calling this twice with the same
 * inputs never double-awards, and the caller doesn't need its own
 * has-this-badge-already lookup logic duplicated here.
 */
export function evaluateNewBadges(previousCompletionCount: number, newCompletionCount: number): BadgeDefinition[] {
  return BADGE_CATALOG.filter(
    (b) => b.atCompletionCount > previousCompletionCount && b.atCompletionCount <= newCompletionCount,
  );
}
