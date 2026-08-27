'use client';

import { ensureUrlScheme } from './normalizeUrl';

/**
 * Browser-side API client. Unlike lib/api.ts (server-to-server, used for
 * discovery reads), auth/Forge calls need the user's session cookie, so
 * these run client-side with `credentials: 'include'` against the API
 * origin directly. In local dev, localhost:3000 and localhost:3001 are
 * same-site (same registrable domain, different port), so the API's
 * `SameSite=Lax` session cookie is sent correctly. In a real deployment
 * where the web app and API sit on unrelated subdomains, the API switches
 * that cookie to `SameSite=None; Secure` instead — see
 * apps/api/src/config/cookieOptions.ts.
 */
const API_BASE_URL = ensureUrlScheme(process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001');

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiClientError(res.status, body?.error?.code ?? 'UNKNOWN', body?.error?.message ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const apiClient = {
  getGuilds: () =>
    request<{ guilds: Array<{ stable_key: string; display_name: string }> }>('/api/v1/taxonomy/guilds'),

  register: (input: { email: string; username: string; password: string }) =>
    request('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(input) }),
  login: (input: { emailOrUsername: string; password: string }) =>
    request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  logout: () => request('/api/v1/auth/logout', { method: 'POST' }),
  me: () => request<{ user: { id: string; username: string }; roles: string[] }>('/api/v1/auth/me'),

  generateQuestDraft: (ideaText: string) =>
    request<{ jobId: string }>('/api/v1/ai/quest-forge', { method: 'POST', body: JSON.stringify({ ideaText }) }),
  getGenerationJob: (jobId: string) =>
    request<{
      job: { status: string; output: { title: string; description: string; objectives: string[]; confidence: string } | null; errorMessage: string | null };
    }>(`/api/v1/ai/jobs/${jobId}`),

  createQuestDraft: (input: unknown) =>
    request<{ questId: string; versionId: string; tier: string }>('/api/v1/quests', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  submitQuest: (questId: string) =>
    request<{ status: string; feasibility: { overallConfidence: string; blockers: string[]; warnings: string[] }; moderationCaseId: string | null }>(
      `/api/v1/quests/${questId}/submit`,
      { method: 'POST' },
    ),
  publishQuest: (questId: string) =>
    request<{ status: string }>(`/api/v1/quests/${questId}/publish`, { method: 'POST' }),
  myQuests: () =>
    request<{ quests: Array<{ quest_id: string; title: string; status: string; feasibility_confidence: string }> }>(
      '/api/v1/quests/mine',
    ),

  saveQuest: (questId: string) => request(`/api/v1/quests/${questId}/save`, { method: 'POST' }),
  unsaveQuest: (questId: string) => request(`/api/v1/quests/${questId}/save`, { method: 'DELETE' }),
  savedQuests: () =>
    request<{ quests: Array<{ quest_id: string; title: string; overall_tier: string; saved_at: string }> }>('/api/v1/quests/saved'),

  startAttempt: (questId: string) => request<{ attemptId: string }>('/api/v1/attempts', { method: 'POST', body: JSON.stringify({ questId }) }),
  myAttempts: () =>
    request<{ attempts: Array<{ attempt_id: string; state: string; title: string; started_at: string | null; completed_at: string | null }> }>(
      '/api/v1/attempts/mine',
    ),
  getAttempt: (attemptId: string) =>
    request<{
      attempt: { attemptId: string; state: string; questId: string; questVersionId: string };
      objectives: Array<{ id: string; text: string; completedAt: string | null }>;
    }>(`/api/v1/attempts/${attemptId}`),
  addEvidence: (attemptId: string, objectiveId: string | null, type: string) =>
    request(`/api/v1/attempts/${attemptId}/evidence`, { method: 'POST', body: JSON.stringify({ objectiveId, type }) }),
  pauseAttempt: (attemptId: string) => request<{ state: string }>(`/api/v1/attempts/${attemptId}/pause`, { method: 'POST' }),
  resumeAttempt: (attemptId: string) => request<{ state: string }>(`/api/v1/attempts/${attemptId}/resume`, { method: 'POST' }),
  abandonAttempt: (attemptId: string) => request<{ state: string }>(`/api/v1/attempts/${attemptId}/abandon`, { method: 'POST' }),
  completeAttempt: (attemptId: string) =>
    request<{ state: string; xpAwarded: number; objectivesCompletedFraction: number; newBadges: string[] }>(
      `/api/v1/attempts/${attemptId}/complete`,
      { method: 'POST' },
    ),

  getProgression: () =>
    request<{
      totalXp: number;
      level: number;
      rank: string;
      nextLevelXp: number | null;
      currentStreakDays: number;
      badges: Array<{ badge_key: string; earned_at: string }>;
    }>('/api/v1/progression/me'),

  getInventory: () => request<{ items: Array<{ id: string; name: string; category: string | null; quantity: string | null }> }>('/api/v1/hearth/inventory'),
  addInventoryItem: (input: { name: string; category?: string | null; quantity?: string | null }) =>
    request<{ id: string }>('/api/v1/hearth/inventory', { method: 'POST', body: JSON.stringify(input) }),
  deleteInventoryItem: (id: string) => request(`/api/v1/hearth/inventory/${id}`, { method: 'DELETE' }),

  submitRating: (
    attemptId: string,
    input: { enjoyment: number; accuracy: number; tierAccuracy: number; wouldRecommend: number; reviewText: string | null },
  ) => request(`/api/v1/attempts/${attemptId}/rating`, { method: 'POST', body: JSON.stringify(input) }),

  submitReport: (input: { targetId: string; category: string; severity: string; note: string | null }) =>
    request<{ reportId: string; suppressionApplied: boolean }>('/api/v1/reports', {
      method: 'POST',
      body: JSON.stringify({ targetType: 'quest_version', ...input }),
    }),

  submitAgeAttestation: (dateOfBirth: string) =>
    request('/api/v1/auth/age-attestation', { method: 'POST', body: JSON.stringify({ dateOfBirth }) }),
  eraseAccount: () => request('/api/v1/me/erase', { method: 'POST' }),

  getQuestPacket: (questId: string) => request<{ packet: Record<string, unknown> & { questId: string; title: string; generatedAt: string } }>(`/api/v1/quests/${questId}/packet`),

  startExplorationSession: () => request<{ sessionId: string }>('/api/v1/exploration/sessions/start', { method: 'POST' }),
  pingExploration: (sessionId: string, lat: number, lng: number, travelMode: 'walk' | 'cycle' | 'drive') =>
    request<{ newlyRevealedTiles: string[]; suspicious: boolean }>(`/api/v1/exploration/sessions/${sessionId}/ping`, {
      method: 'POST',
      body: JSON.stringify({ lat, lng, travelMode }),
    }),
  stopExplorationSession: (sessionId: string) => request(`/api/v1/exploration/sessions/${sessionId}/stop`, { method: 'POST' }),
  getRegionProgress: () => request<{ totalTilesDiscovered: number; regions: Array<{ regionId: string; tileCount: number }> }>('/api/v1/exploration/regions'),
  deleteExplorationHistory: () => request('/api/v1/exploration/history', { method: 'DELETE' }),
};

export const API_BASE_URL_FOR_LINKS = API_BASE_URL;
