import type { QuestDetail } from '../quest-catalog/types.js';

export const OFFLINE_PACKET_VERSION = 'v1';

/**
 * Section 30: "Downloadable quest packets may contain instructions,
 * route/checkpoint data, limited map context, puzzle assets, hints,
 * safety/venue information, party roster, and queued evidence. Clearly
 * show what is available offline, packet age, and information that may
 * have changed." This build has no hints content and no party-roster
 * concept tied to a packet yet (parties aren't quest-scoped that way) —
 * both are honestly omitted rather than stubbed with fake data. "Queued
 * evidence" sync is handled by the idempotency-key mechanism on the
 * evidence/complete endpoints themselves (Gate 7), not by anything in the
 * packet payload.
 */
export interface OfflinePacket {
  packetVersion: string;
  generatedAt: string;
  questId: string;
  title: string;
  plainSummary: string;
  narratedDescription: string | null;
  objectives: string[];
  completionMethods: string[];
  requiredEquipment: string[];
  safetyNotes: string | null;
  riskRating: string;
  accessibilityProfile: QuestDetail['accessibilityProfile'];
  ageRestrictions: QuestDetail['ageRestrictions'];
  places: QuestDetail['places'];
  feasibilityConfidence: string;
  lastVerificationAt: string | null;
}

export function buildOfflinePacket(quest: QuestDetail): OfflinePacket {
  return {
    packetVersion: OFFLINE_PACKET_VERSION,
    generatedAt: new Date().toISOString(),
    questId: quest.questId,
    title: quest.title,
    plainSummary: quest.plainSummary,
    narratedDescription: quest.narratedDescription,
    objectives: quest.objectives,
    completionMethods: quest.completionMethods,
    requiredEquipment: quest.requiredEquipment,
    safetyNotes: quest.safetyNotes,
    riskRating: quest.riskRating,
    accessibilityProfile: quest.accessibilityProfile,
    ageRestrictions: quest.ageRestrictions,
    places: quest.places,
    feasibilityConfidence: quest.feasibilityConfidence,
    lastVerificationAt: quest.lastVerificationAt,
  };
}
