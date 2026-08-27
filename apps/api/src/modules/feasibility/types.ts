import type { AccessibilityProfile, AgeRestrictions } from '../quest-catalog/types.js';

export type CheckResult = 'pass' | 'warning' | 'blocker';
export type FeasibilityConfidence = 'high' | 'medium' | 'low' | 'critical_unknown';
export type PublicationScope =
  | 'private'
  | 'shared_by_link'
  | 'friends_only'
  | 'group_only'
  | 'unlisted'
  | 'public'
  | 'scheduled_public_event';

export interface FeasibilityInput {
  title: string;
  plainSummary: string;
  objectives: string[];
  completionMethods: string[];
  travelMode: string | null;
  hasPrimaryPlace: boolean;
  riskRating: 'low' | 'moderate' | 'high' | 'severe';
  safetyNotes: string | null;
  accessibilityProfile: AccessibilityProfile;
  ageRestrictions: AgeRestrictions;
  guildRequiresAgeGate: boolean;
  durationMinMinutes: number | null;
  durationMaxMinutes: number | null;
  costMinCents: number | null;
  costMaxCents: number | null;
}

export interface VerificationCheckResult {
  checkType: string;
  result: CheckResult;
  detail: string;
}

export interface FeasibilityAssessmentResult {
  checks: VerificationCheckResult[];
  overallConfidence: FeasibilityConfidence;
  blockers: string[];
  warnings: string[];
  unknowns: string[];
  recommendedPublicationScope: PublicationScope;
}
