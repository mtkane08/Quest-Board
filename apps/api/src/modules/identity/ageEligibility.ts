/**
 * Section 8: "Age-restricted content uses the applicable local legal
 * threshold... drinking and gambling ages are not assumed to be
 * universally 21." DL-002 (docs/gate-0/06-decision-log.md) is still open
 * on the real jurisdiction-aware rule; this is a single hardcoded US-typical
 * threshold (21) used as the default gate until that decision lands —
 * explicitly not a claim that 21 is correct everywhere.
 */
export const DEFAULT_ADULT_CONTENT_AGE_THRESHOLD = 21;

export function calculateAgeInYears(dateOfBirthIso: string, asOfIso: string): number {
  const dob = new Date(dateOfBirthIso);
  const asOf = new Date(asOfIso);
  let age = asOf.getUTCFullYear() - dob.getUTCFullYear();
  const hasHadBirthdayThisYear =
    asOf.getUTCMonth() > dob.getUTCMonth() ||
    (asOf.getUTCMonth() === dob.getUTCMonth() && asOf.getUTCDate() >= dob.getUTCDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

/**
 * Defaults to `false` (excluded) whenever no birth date is on file — the
 * safe direction per Section 12's hard-constraint ordering (legality/age
 * comes before relevance), never inferred permissive by absence of data,
 * the same principle ADR-010 applies to accessibility.
 */
export function isAdultContentEligible(
  dateOfBirthIso: string | null,
  asOfIso: string,
  thresholdYears: number = DEFAULT_ADULT_CONTENT_AGE_THRESHOLD,
): boolean {
  if (!dateOfBirthIso) return false;
  return calculateAgeInYears(dateOfBirthIso, asOfIso) >= thresholdYears;
}
