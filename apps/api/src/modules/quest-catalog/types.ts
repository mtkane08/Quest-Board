/**
 * Read-path shapes for the Gate 3 Discovery slice. Mirrors the field set
 * spec Section 45 requires on a quest card, plus what Section 31's
 * "preflight" visibility rule (QB-031) requires on the detail view —
 * safety/accessibility/cost/time/travel/equipment/age before starting,
 * regardless of spoilers.
 */
export type Tier = 'novice' | 'adventurer' | 'heroic' | 'legendary' | 'mythic';
export type FeasibilityConfidence = 'high' | 'medium' | 'low' | 'critical_unknown';
export type AccessibilityState = 'confirmed' | 'reported' | 'partially' | 'not_accessible' | 'unknown';

export interface AccessibilityProfile {
  wheelchair: AccessibilityState;
  low_walking: AccessibilityState;
  sensory_friendly: AccessibilityState;
  service_animal: AccessibilityState;
  restroom_access: AccessibilityState;
}

export interface AgeRestrictions {
  min_age: number | null;
  adult_content: boolean;
  alcohol: boolean;
  gambling: boolean;
}

export interface QuestCard {
  questId: string;
  versionId: string;
  title: string;
  plainSummary: string;
  guildKey: string | null;
  guildDisplayName: string | null;
  guildPlainSubtitle: string | null;
  tags: string[];
  overallTier: Tier;
  durationMinMinutes: number | null;
  durationMaxMinutes: number | null;
  costMinCents: number | null;
  costMaxCents: number | null;
  distanceMeters: number | null;
  originType: string;
  trustBadges: string[];
  feasibilityConfidence: FeasibilityConfidence;
  accessibilityHighlights: Partial<AccessibilityProfile>;
  ageRestrictions: AgeRestrictions;
  primaryPlaceName: string | null;
  primaryLocation: { lat: number; lng: number } | null;
}

export interface QuestDetail extends QuestCard {
  narratedDescription: string | null;
  structureType: string;
  objectives: string[];
  completionMethods: string[];
  requiredEquipment: string[];
  safetyNotes: string | null;
  riskRating: 'low' | 'moderate' | 'high' | 'severe';
  physicalIntensity: number | null;
  mentalIntensity: number | null;
  travelMode: string | null;
  accessibilityProfile: AccessibilityProfile;
  factorScores: Record<string, number>;
  publicationScope: string;
  lastVerificationAt: string | null;
  places: Array<{ role: string; placeName: string | null; location: { lat: number; lng: number } | null }>;
  /** Section 23: null averages until MIN_RESPONSE_THRESHOLD responses exist. */
  aggregateRating: {
    responseCount: number;
    isDisplayable: boolean;
    averages: { enjoyment: number; accuracy: number; tierAccuracy: number; wouldRecommend: number } | null;
  };
}
