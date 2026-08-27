import { describe, expect, it } from 'vitest';
import { evaluateFeasibility } from '../src/modules/feasibility/service.js';
import type { FeasibilityInput } from '../src/modules/feasibility/types.js';

const baseInput: FeasibilityInput = {
  title: 'Walk the arboretum',
  plainSummary: 'Photograph three trees you have never noticed.',
  objectives: ['Find three trees', 'Take a photo of each'],
  completionMethods: ['photo'],
  travelMode: 'walk',
  hasPrimaryPlace: true,
  riskRating: 'low',
  safetyNotes: null,
  accessibilityProfile: {
    wheelchair: 'confirmed', low_walking: 'confirmed', sensory_friendly: 'confirmed',
    service_animal: 'confirmed', restroom_access: 'confirmed',
  },
  ageRestrictions: { min_age: null, adult_content: false, alcohol: false, gambling: false },
  guildRequiresAgeGate: false,
  durationMinMinutes: 60,
  durationMaxMinutes: 90,
  costMinCents: 0,
  costMaxCents: 0,
};

describe('evaluateFeasibility (ADR-009 mandatory gate)', () => {
  it('gives high confidence and public scope to a fully specified, low-risk quest', () => {
    const result = evaluateFeasibility(baseInput);
    expect(result.overallConfidence).toBe('high');
    expect(result.recommendedPublicationScope).toBe('public');
    expect(result.blockers).toEqual([]);
  });

  it('never marks a quest feasible just because prose sounds plausible — missing core fields blocks it', () => {
    const result = evaluateFeasibility({ ...baseInput, title: '', objectives: [] });
    expect(result.overallConfidence).toBe('critical_unknown');
    expect(result.blockers.length).toBeGreaterThan(0);
  });

  it('blocks a quest with no completion method', () => {
    const result = evaluateFeasibility({ ...baseInput, completionMethods: [] });
    expect(result.overallConfidence).toBe('critical_unknown');
  });

  it('blocks a high-risk quest with no safety notes', () => {
    const result = evaluateFeasibility({ ...baseInput, riskRating: 'high', safetyNotes: null });
    expect(result.overallConfidence).toBe('critical_unknown');
  });

  it('only warns (does not block) a moderate-risk quest with no safety notes', () => {
    const result = evaluateFeasibility({ ...baseInput, riskRating: 'moderate', safetyNotes: null });
    expect(result.blockers).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('warns rather than blocks when a travel-mode quest has no place attached', () => {
    const result = evaluateFeasibility({ ...baseInput, hasPrimaryPlace: false });
    expect(result.blockers).toEqual([]);
    expect(result.warnings.some((w) => w.includes('destination'))).toBe(true);
  });

  it('flags unassessed accessibility as a warning and lists it under unknowns', () => {
    const result = evaluateFeasibility({
      ...baseInput,
      accessibilityProfile: {
        wheelchair: 'unknown', low_walking: 'unknown', sensory_friendly: 'unknown',
        service_animal: 'unknown', restroom_access: 'unknown',
      },
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.unknowns).toContain('accessibility_profile');
  });

  it('warns when an age-gated guild has no age classification set', () => {
    const result = evaluateFeasibility({ ...baseInput, guildRequiresAgeGate: true });
    expect(result.warnings.some((w) => w.toLowerCase().includes('age'))).toBe(true);
  });

  it('downgrades to medium confidence with 1-2 warnings, low with 3+', () => {
    const oneWarning = evaluateFeasibility({ ...baseInput, hasPrimaryPlace: false });
    expect(oneWarning.overallConfidence).toBe('medium');

    const manyWarnings = evaluateFeasibility({
      ...baseInput,
      hasPrimaryPlace: false,
      guildRequiresAgeGate: true,
      durationMinMinutes: null,
      durationMaxMinutes: null,
      costMinCents: null,
      costMaxCents: null,
      accessibilityProfile: {
        wheelchair: 'unknown', low_walking: 'unknown', sensory_friendly: 'unknown',
        service_animal: 'unknown', restroom_access: 'unknown',
      },
    });
    expect(manyWarnings.overallConfidence).toBe('low');
    expect(manyWarnings.recommendedPublicationScope).toBe('private');
  });
});
