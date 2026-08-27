import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildTestApp, isDatabaseReachable } from './helpers/testApp.js';

const dbReachable = await isDatabaseReachable();

const validAccessibility = {
  wheelchair: 'confirmed', low_walking: 'confirmed', sensory_friendly: 'confirmed',
  service_animal: 'confirmed', restroom_access: 'confirmed',
};
const validFactorScores = {
  time_commitment: 2, physical_effort: 2, mental_challenge: 2, travel_complexity: 2,
  cost_burden: 2, preparation: 2, required_skill: 2, objective_complexity: 2, group_coordination: 2,
};

describe.skipIf(!dbReachable)('Idempotency-Key replay protection (ADR-011, Gate 7)', () => {
  let ctx: Awaited<ReturnType<typeof buildTestApp>>;
  const unique = Date.now();

  beforeAll(async () => {
    ctx = await buildTestApp();
  });

  afterAll(async () => {
    await ctx.teardown();
  });

  async function registerAgent(username: string) {
    const agent = request.agent(ctx.app);
    await agent.post('/api/v1/auth/register').send({
      email: `${username}@example.com`,
      username,
      password: 'a-long-enough-password',
    });
    return agent;
  }

  it('a retried /complete with the same Idempotency-Key does not double-award XP', async () => {
    const owner = await registerAgent(`idem_owner_${unique}`);
    await ctx.pool.query(`UPDATE users SET creator_trust = TRUE WHERE username = $1`, [`idem_owner_${unique}`]);
    const create = await owner.post('/api/v1/quests').send({
      title: `Idempotency Quest ${unique}`,
      plainSummary: 'Test quest.',
      factorScores: validFactorScores,
      riskRating: 'low',
      accessibilityProfile: validAccessibility,
      ageRestrictions: { min_age: null, adult_content: false, alcohol: false, gambling: false },
      objectives: ['Do the thing'],
      completionMethods: ['honor_system'],
    });
    const questId = create.body.questId;
    await owner.post(`/api/v1/quests/${questId}/submit`);
    await owner.post(`/api/v1/quests/${questId}/publish`);

    const player = await registerAgent(`idem_player_${unique}`);
    const start = await player.post('/api/v1/attempts').send({ questId });
    const attemptId = start.body.attemptId;
    const detail = await player.get(`/api/v1/attempts/${attemptId}`);
    await player
      .post(`/api/v1/attempts/${attemptId}/evidence`)
      .send({ objectiveId: detail.body.objectives[0].id, type: 'honor_system' });

    const idempotencyKey = `test-key-${unique}`;
    const first = await player.post(`/api/v1/attempts/${attemptId}/complete`).set('Idempotency-Key', idempotencyKey);
    expect(first.status).toBe(200);
    expect(first.body.state).toBe('completed');

    const second = await player
      .post(`/api/v1/attempts/${attemptId}/complete`)
      .set('Idempotency-Key', idempotencyKey);
    expect(second.status).toBe(first.status);
    expect(second.body).toEqual(first.body);

    const progression = await player.get('/api/v1/progression/me');
    expect(progression.body.totalXp).toBe(first.body.xpAwarded); // not doubled
  });

  it('without an Idempotency-Key, behavior is unchanged from every earlier gate (a second call still 409s on an already-completed attempt)', async () => {
    const owner = await registerAgent(`idem_owner2_${unique}`);
    await ctx.pool.query(`UPDATE users SET creator_trust = TRUE WHERE username = $1`, [`idem_owner2_${unique}`]);
    const create = await owner.post('/api/v1/quests').send({
      title: `No Key Quest ${unique}`,
      plainSummary: 'Test quest.',
      factorScores: validFactorScores,
      riskRating: 'low',
      accessibilityProfile: validAccessibility,
      ageRestrictions: { min_age: null, adult_content: false, alcohol: false, gambling: false },
      objectives: ['Do the thing'],
      completionMethods: ['honor_system'],
    });
    const questId = create.body.questId;
    await owner.post(`/api/v1/quests/${questId}/submit`);
    await owner.post(`/api/v1/quests/${questId}/publish`);

    const player = await registerAgent(`idem_player2_${unique}`);
    const start = await player.post('/api/v1/attempts').send({ questId });
    const attemptId = start.body.attemptId;
    const detail = await player.get(`/api/v1/attempts/${attemptId}`);
    await player.post(`/api/v1/attempts/${attemptId}/evidence`).send({ objectiveId: detail.body.objectives[0].id, type: 'honor_system' });

    const first = await player.post(`/api/v1/attempts/${attemptId}/complete`);
    expect(first.status).toBe(200);
    const second = await player.post(`/api/v1/attempts/${attemptId}/complete`);
    expect(second.status).toBe(409); // same conflict behavior as Gate 5, no change
  });
});
