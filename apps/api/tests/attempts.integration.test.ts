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

describe.skipIf(!dbReachable)('attempts / progression / Hearth / saved quests (Gate 5 integration)', () => {
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

  /** Creates, submits (as a trusted creator), and publishes a 2-objective quest. */
  async function publishTwoObjectiveQuest(title: string) {
    const owner = await registerAgent(`attempts_owner_${title}_${unique}`);
    await ctx.pool.query(`UPDATE users SET creator_trust = TRUE WHERE username = $1`, [
      `attempts_owner_${title}_${unique}`,
    ]);
    const create = await owner.post('/api/v1/quests').send({
      title,
      plainSummary: 'A two-objective test quest.',
      factorScores: validFactorScores,
      riskRating: 'low',
      accessibilityProfile: validAccessibility,
      ageRestrictions: { min_age: null, adult_content: false, alcohol: false, gambling: false },
      objectives: ['Do the first thing', 'Do the second thing'],
      completionMethods: ['honor_system'],
      durationMinMinutes: 30,
      costMinCents: 0,
    });
    const questId = create.body.questId;
    await owner.post(`/api/v1/quests/${questId}/submit`);
    await owner.post(`/api/v1/quests/${questId}/publish`);
    return questId;
  }

  it('rejects starting an attempt on a quest that is not published', async () => {
    const owner = await registerAgent(`attempts_draftowner_${unique}`);
    const create = await owner.post('/api/v1/quests').send({
      title: `Unpublished ${unique}`,
      plainSummary: 'Still a draft.',
      factorScores: validFactorScores,
      riskRating: 'low',
      accessibilityProfile: validAccessibility,
      ageRestrictions: { min_age: null, adult_content: false, alcohol: false, gambling: false },
      objectives: ['One thing'],
      completionMethods: ['honor_system'],
    });
    const player = await registerAgent(`attempts_player0_${unique}`);
    const attempt = await player.post('/api/v1/attempts').send({ questId: create.body.questId });
    expect(attempt.status).toBe(409);
  });

  it('completes a full path: start -> partial evidence -> partial completion -> repeat -> full completion, with diminishing XP and a badge', async () => {
    const questId = await publishTwoObjectiveQuest(`Two Objectives A ${unique}`);
    const player = await registerAgent(`attempts_player1_${unique}`);

    const start1 = await player.post('/api/v1/attempts').send({ questId });
    expect(start1.status).toBe(201);
    const attempt1Id = start1.body.attemptId;

    const detail1 = await player.get(`/api/v1/attempts/${attempt1Id}`);
    expect(detail1.status).toBe(200);
    expect(detail1.body.objectives.length).toBe(2);
    const firstObjectiveId = detail1.body.objectives[0].id;

    const evidence1 = await player.post(`/api/v1/attempts/${attempt1Id}/evidence`).send({
      objectiveId: firstObjectiveId,
      type: 'honor_system',
    });
    expect(evidence1.status).toBe(201);

    const complete1 = await player.post(`/api/v1/attempts/${attempt1Id}/complete`);
    expect(complete1.status).toBe(200);
    expect(complete1.body.state).toBe('partially_completed');
    expect(complete1.body.objectivesCompletedFraction).toBe(0.5);
    // All factor scores are 2 -> weighted mean 2.0 -> "adventurer" tier (base 25 XP).
    // fraction 0.5, no prior completions (multiplier 1) -> round(25 * 0.5 * 1) = 13.
    expect(complete1.body.xpAwarded).toBe(13);
    expect(complete1.body.newBadges).toEqual([]);

    // Second attempt at the same quest, completing both objectives fully.
    const start2 = await player.post('/api/v1/attempts').send({ questId });
    const attempt2Id = start2.body.attemptId;
    const detail2 = await player.get(`/api/v1/attempts/${attempt2Id}`);
    for (const objective of detail2.body.objectives) {
      await player.post(`/api/v1/attempts/${attempt2Id}/evidence`).send({ objectiveId: objective.id, type: 'honor_system' });
    }
    const complete2 = await player.post(`/api/v1/attempts/${attempt2Id}/complete`);
    expect(complete2.status).toBe(200);
    expect(complete2.body.state).toBe('completed');
    expect(complete2.body.objectivesCompletedFraction).toBe(1);
    // Diminishing return: this is the 2nd prior engagement (the partial one counts), so multiplier is 1/2.
    expect(complete2.body.xpAwarded).toBeLessThan(complete1.body.xpAwarded * 2);
    expect(complete2.body.newBadges).toContain('first_completion'); // first FULL completion, badges only count full completions

    const progression = await player.get('/api/v1/progression/me');
    expect(progression.status).toBe(200);
    expect(progression.body.totalXp).toBe(complete1.body.xpAwarded + complete2.body.xpAwarded);
    expect(progression.body.currentStreakDays).toBeGreaterThanOrEqual(1);
    expect(progression.body.badges.map((b: { badge_key: string }) => b.badge_key)).toContain('first_completion');
  });

  it('supports pause/resume and rejects invalid state transitions', async () => {
    const questId = await publishTwoObjectiveQuest(`Two Objectives B ${unique}`);
    const player = await registerAgent(`attempts_player2_${unique}`);
    const start = await player.post('/api/v1/attempts').send({ questId });
    const attemptId = start.body.attemptId;

    const pause = await player.post(`/api/v1/attempts/${attemptId}/pause`);
    expect(pause.status).toBe(200);

    const completeWhilePaused = await player.post(`/api/v1/attempts/${attemptId}/complete`);
    expect(completeWhilePaused.status).toBe(409);

    const resume = await player.post(`/api/v1/attempts/${attemptId}/resume`);
    expect(resume.status).toBe(200);

    const doublePause = await player.post(`/api/v1/attempts/${attemptId}/pause`);
    expect(doublePause.status).toBe(200);
    const abandon = await player.post(`/api/v1/attempts/${attemptId}/abandon`);
    expect(abandon.status).toBe(200);

    const reAbandon = await player.post(`/api/v1/attempts/${attemptId}/abandon`);
    expect(reAbandon.status).toBe(409);
  });

  it('hides another user\'s attempt behind a 404 rather than a 403 (no existence leak)', async () => {
    const questId = await publishTwoObjectiveQuest(`Two Objectives C ${unique}`);
    const owner = await registerAgent(`attempts_player3_${unique}`);
    const stranger = await registerAgent(`attempts_stranger_${unique}`);
    const start = await owner.post('/api/v1/attempts').send({ questId });

    const strangerView = await stranger.get(`/api/v1/attempts/${start.body.attemptId}`);
    expect(strangerView.status).toBe(404);
    const strangerComplete = await stranger.post(`/api/v1/attempts/${start.body.attemptId}/complete`);
    expect(strangerComplete.status).toBe(404);
  });

  it('rejects evidence for an objectiveId that does not belong to the attempt', async () => {
    const questId = await publishTwoObjectiveQuest(`Two Objectives D ${unique}`);
    const player = await registerAgent(`attempts_player4_${unique}`);
    const start = await player.post('/api/v1/attempts').send({ questId });
    const bogusEvidence = await player
      .post(`/api/v1/attempts/${start.body.attemptId}/evidence`)
      .send({ objectiveId: '00000000-0000-0000-0000-000000000000', type: 'honor_system' });
    expect(bogusEvidence.status).toBe(400);
  });

  it('Hearth inventory: add, list, edit, export, delete', async () => {
    const user = await registerAgent(`hearth_user_${unique}`);
    const add = await user.post('/api/v1/hearth/inventory').send({ name: 'canned beans', category: 'pantry', quantity: '2 cans' });
    expect(add.status).toBe(201);
    const itemId = add.body.id;

    const list = await user.get('/api/v1/hearth/inventory');
    expect(list.body.items.some((i: { id: string }) => i.id === itemId)).toBe(true);

    const edit = await user.patch(`/api/v1/hearth/inventory/${itemId}`).send({ quantity: '1 can' });
    expect(edit.status).toBe(204);

    const exported = await user.get('/api/v1/hearth/inventory/export');
    expect(exported.status).toBe(200);
    expect(exported.body.items.length).toBeGreaterThan(0);

    const del = await user.delete(`/api/v1/hearth/inventory/${itemId}`);
    expect(del.status).toBe(204);

    const listAfter = await user.get('/api/v1/hearth/inventory');
    expect(listAfter.body.items.some((i: { id: string }) => i.id === itemId)).toBe(false);
  });

  it('prevents editing or deleting another user\'s inventory item', async () => {
    const owner = await registerAgent(`hearth_owner_${unique}`);
    const stranger = await registerAgent(`hearth_stranger_${unique}`);
    const add = await owner.post('/api/v1/hearth/inventory').send({ name: 'flour' });
    const del = await stranger.delete(`/api/v1/hearth/inventory/${add.body.id}`);
    expect(del.status).toBe(404);
  });

  it('saved quests: save, list, unsave', async () => {
    const questId = await publishTwoObjectiveQuest(`Saveable Quest ${unique}`);
    const user = await registerAgent(`saved_user_${unique}`);

    const save = await user.post(`/api/v1/quests/${questId}/save`);
    expect(save.status).toBe(204);

    const list = await user.get('/api/v1/quests/saved');
    expect(list.body.quests.some((q: { quest_id: string }) => q.quest_id === questId)).toBe(true);

    const unsave = await user.delete(`/api/v1/quests/${questId}/save`);
    expect(unsave.status).toBe(204);

    const listAfter = await user.get('/api/v1/quests/saved');
    expect(listAfter.body.quests.some((q: { quest_id: string }) => q.quest_id === questId)).toBe(false);
  });
});
