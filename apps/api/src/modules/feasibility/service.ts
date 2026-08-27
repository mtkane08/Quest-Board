import type {
  FeasibilityAssessmentResult,
  FeasibilityInput,
  VerificationCheckResult,
} from './types.js';

/**
 * ADR-009 / spec Section 15: this is the mandatory gate a quest must pass
 * before it can be Approved. It deliberately does NOT ask an AI model "is
 * this feasible?" as an open question (QB-064: "may not mark a quest
 * feasible solely because the prose sounds plausible") — every check below
 * is a structural fact about the quest's own data, checkable without a
 * live Places/AI call. This is a legitimate first implementation of the
 * feasibility evaluator, not a placeholder for one: Section 15's checklist
 * includes live-data checks (hours, closures, recent reports) that
 * genuinely require a configured Places provider and are out of scope
 * until that's wired in (see docs/gate-0/04-provider-licensing-questions.md).
 */
export function evaluateFeasibility(input: FeasibilityInput): FeasibilityAssessmentResult {
  const checks: VerificationCheckResult[] = [];

  // 1. Core content must exist at all.
  const hasCoreFields = input.title.trim().length > 0 && input.plainSummary.trim().length > 0 && input.objectives.length > 0;
  checks.push({
    checkType: 'core_fields_present',
    result: hasCoreFields ? 'pass' : 'blocker',
    detail: hasCoreFields
      ? 'Title, summary, and at least one objective are present.'
      : 'Missing title, plain summary, or objectives — a quest cannot be evaluated without them.',
  });

  // 2. A quest without any way to mark it complete cannot be attempted.
  const hasCompletionMethod = input.completionMethods.length > 0;
  checks.push({
    checkType: 'completion_method_specified',
    result: hasCompletionMethod ? 'pass' : 'blocker',
    detail: hasCompletionMethod
      ? `Completion method(s): ${input.completionMethods.join(', ')}.`
      : 'No completion method specified — a quest must declare at least one (honor system, GPS, photo, etc.).',
  });

  // 3. Section 15: "public access versus private property... trespassing
  // risks" can't be checked without a place, but we can at least flag
  // when a travel-mode quest has no place attached at all.
  const requiresLocation = input.travelMode !== null && input.travelMode !== 'any';
  const locationOk = !requiresLocation || input.hasPrimaryPlace;
  checks.push({
    checkType: 'location_specified',
    result: locationOk ? 'pass' : 'warning',
    detail: locationOk
      ? 'Location data is consistent with the declared travel mode.'
      : `Travel mode "${input.travelMode}" implies a real-world destination, but no place is attached.`,
  });

  // 4. Section 18: evidence/safety requirements should be proportional —
  // a moderate+ risk quest without safety notes is a real gap, not just
  // a style nitpick.
  const needsSafetyNotes = input.riskRating === 'moderate' || input.riskRating === 'high' || input.riskRating === 'severe';
  const hasSafetyNotes = Boolean(input.safetyNotes && input.safetyNotes.trim().length > 0);
  const safetyResult = !needsSafetyNotes ? 'pass' : hasSafetyNotes ? 'pass' : input.riskRating === 'moderate' ? 'warning' : 'blocker';
  checks.push({
    checkType: 'safety_notes_for_risk',
    result: safetyResult,
    detail:
      safetyResult === 'pass'
        ? 'Safety notes are adequate for the declared risk level.'
        : `Risk rating is "${input.riskRating}" but no safety notes are present.`,
  });

  // 5. Section 8: age-gated guilds require explicit classification, not
  // an assumption either way.
  const needsAgeClassification = input.guildRequiresAgeGate;
  const hasAgeClassification =
    input.ageRestrictions.adult_content || input.ageRestrictions.alcohol || input.ageRestrictions.gambling || input.ageRestrictions.min_age !== null;
  checks.push({
    checkType: 'age_gate_classification',
    result: !needsAgeClassification || hasAgeClassification ? 'pass' : 'warning',
    detail:
      !needsAgeClassification || hasAgeClassification
        ? 'Age classification is consistent with this quest’s category.'
        : 'This category commonly requires age classification, but none is set on this quest — confirm whether it applies.',
  });

  // 6. Principle 10: accessibility being entirely unassessed is allowed,
  // but it should visibly lower confidence rather than pass silently.
  const accessibilityValues = Object.values(input.accessibilityProfile);
  const accessibilityAssessed = accessibilityValues.some((v) => v !== 'unknown');
  checks.push({
    checkType: 'accessibility_assessed',
    result: accessibilityAssessed ? 'pass' : 'warning',
    detail: accessibilityAssessed
      ? 'At least one accessibility category has been assessed.'
      : 'No accessibility category has been assessed — all fields are "unknown."',
  });

  // 7. Discovery needs at least a rough time/cost estimate to be useful.
  const hasDurationOrCost =
    input.durationMinMinutes !== null || input.durationMaxMinutes !== null || input.costMinCents !== null || input.costMaxCents !== null;
  checks.push({
    checkType: 'duration_or_cost_present',
    result: hasDurationOrCost ? 'pass' : 'warning',
    detail: hasDurationOrCost ? 'Time and/or cost estimates are present.' : 'No time or cost estimate is present.',
  });

  const blockers = checks.filter((c) => c.result === 'blocker').map((c) => c.detail);
  const warnings = checks.filter((c) => c.result === 'warning').map((c) => c.detail);

  let overallConfidence: FeasibilityAssessmentResult['overallConfidence'];
  if (blockers.length > 0) overallConfidence = 'critical_unknown';
  else if (warnings.length === 0) overallConfidence = 'high';
  else if (warnings.length <= 2) overallConfidence = 'medium';
  else overallConfidence = 'low';

  const recommendedPublicationScope: FeasibilityAssessmentResult['recommendedPublicationScope'] =
    overallConfidence === 'high' ? 'public' : overallConfidence === 'medium' ? 'unlisted' : 'private';

  return {
    checks,
    overallConfidence,
    blockers,
    warnings,
    unknowns: accessibilityAssessed ? [] : ['accessibility_profile'],
    recommendedPublicationScope,
  };
}
