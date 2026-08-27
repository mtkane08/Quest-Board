import { describe, expect, it } from 'vitest';
import { buildOfflinePacket, OFFLINE_PACKET_VERSION } from '../src/modules/offline/packetBuilder.js';
import type { QuestDetail } from '../src/modules/quest-catalog/types.js';

const baseQuest: QuestDetail = {
  questId: 'q1', versionId: 'v1', title: 'Test Quest', plainSummary: 'summary',
  guildKey: null, guildDisplayName: null, guildPlainSubtitle: null, tags: [],
  overallTier: 'novice', durationMinMinutes: null, durationMaxMinutes: null,
  costMinCents: null, costMaxCents: null, distanceMeters: null,
  originType: 'community', trustBadges: [], feasibilityConfidence: 'high',
  accessibilityHighlights: {}, ageRestrictions: { min_age: null, adult_content: false, alcohol: false, gambling: false },
  primaryPlaceName: null, primaryLocation: null,
  narratedDescription: 'narrated', structureType: 'single_objective', objectives: ['do it'],
  completionMethods: ['honor_system'], requiredEquipment: [], safetyNotes: 'be careful',
  riskRating: 'low', physicalIntensity: null, mentalIntensity: null, travelMode: null,
  accessibilityProfile: { wheelchair: 'unknown', low_walking: 'unknown', sensory_friendly: 'unknown', service_animal: 'unknown', restroom_access: 'unknown' },
  factorScores: {}, publicationScope: 'public', lastVerificationAt: '2026-01-01T00:00:00Z',
  places: [], aggregateRating: { responseCount: 0, isDisplayable: false, averages: null },
};

describe('buildOfflinePacket (Section 30)', () => {
  it('includes everything needed to run the quest offline', () => {
    const packet = buildOfflinePacket(baseQuest);
    expect(packet.packetVersion).toBe(OFFLINE_PACKET_VERSION);
    expect(packet.objectives).toEqual(['do it']);
    expect(packet.safetyNotes).toBe('be careful');
    expect(packet.completionMethods).toEqual(['honor_system']);
  });

  it('stamps a fresh generatedAt each time, so packet age is always knowable', () => {
    const before = Date.now();
    const packet = buildOfflinePacket(baseQuest);
    const generatedAtMs = new Date(packet.generatedAt).getTime();
    expect(generatedAtMs).toBeGreaterThanOrEqual(before);
    expect(generatedAtMs).toBeLessThanOrEqual(Date.now());
  });

  it('never fabricates hints or a party roster that were not actually part of the quest data', () => {
    const packet = buildOfflinePacket(baseQuest);
    expect(packet).not.toHaveProperty('hints');
    expect(packet).not.toHaveProperty('partyRoster');
  });
});
