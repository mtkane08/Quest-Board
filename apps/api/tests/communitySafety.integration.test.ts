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

describe.skipIf(!dbReachable)('community safety: ratings, reports, moderation/appeals, reputation, privacy, age-gating, parties (Gate 6)', () => {
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

  async function makeAdmin(username: string) {
    await ctx.pool.query(`INSERT INTO role_grants (user_id, role) SELECT id, 'admin' FROM users WHERE username = $1`, [username]);
  }

  /** Trusted creator publishes a one-objective quest; returns questId. */
  async function publishQuest(title: string, ownerUsername: string) {
    const owner = await registerAgent(ownerUsername);
    await ctx.pool.query(`UPDATE users SET creator_trust = TRUE WHERE username = $1`, [ownerUsername]);
    const create = await owner.post('/api/v1/quests').send({
      title,
      plainSummary: 'A test quest.',
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
    return questId;
  }

  async function completeQuest(agent: ReturnType<typeof request.agent>, questId: string) {
    const start = await agent.post('/api/v1/attempts').send({ questId });
    const attemptId = start.body.attemptId;
    const detail = await agent.get(`/api/v1/attempts/${attemptId}`);
    await agent.post(`/api/v1/attempts/${attemptId}/evidence`).send({ objectiveId: detail.body.objectives[0].id, type: 'honor_system' });
    await agent.post(`/api/v1/attempts/${attemptId}/complete`);
    return attemptId;
  }

  it('hides the aggregate rating below the response threshold, then reveals it once enough responses exist', async () => {
    const questId = await publishQuest(`Rating Quest ${unique}`, `rating_owner_${unique}`);

    const player1 = await registerAgent(`rating_player1_${unique}`);
    const attempt1 = await completeQuest(player1, questId);
    const rate1 = await player1.post(`/api/v1/attempts/${attempt1}/rating`).send({ enjoyment: 5, accuracy: 5, tierAccuracy: 5, wouldRecommend: 5 });
    expect(rate1.status).toBe(201);

    const duplicateRate = await player1.post(`/api/v1/attempts/${attempt1}/rating`).send({ enjoyment: 1, accuracy: 1, tierAccuracy: 1, wouldRecommend: 1 });
    expect(duplicateRate.status).toBe(409);

    let detail = await request(ctx.app).get(`/api/v1/quests/${questId}`);
    expect(detail.body.quest.aggregateRating.isDisplayable).toBe(false);

    for (const suffix of ['2', '3']) {
      const player = await registerAgent(`rating_player${suffix}_${unique}`);
      const attempt = await completeQuest(player, questId);
      await player.post(`/api/v1/attempts/${attempt}/rating`).send({ enjoyment: 3, accuracy: 3, tierAccuracy: 3, wouldRecommend: 3 });
    }

    detail = await request(ctx.app).get(`/api/v1/quests/${questId}`);
    expect(detail.body.quest.aggregateRating.isDisplayable).toBe(true);
    expect(detail.body.quest.aggregateRating.averages.enjoyment).toBeCloseTo((5 + 3 + 3) / 3, 5);
  });

  it('a high-severity report suppresses a published quest and opens a moderation case; a low-severity one does not', async () => {
    const lowSeverityQuestId = await publishQuest(`Low Severity Quest ${unique}`, `lowsev_owner_${unique}`);
    // A syntactically-valid UUID is enough here — severity 'low' never even
    // reaches the suppression lookup, so it doesn't matter that this isn't
    // actually that quest's quest_version id.
    const lowReport = await request(ctx.app)
      .post('/api/v1/reports')
      .send({ targetType: 'quest_version', targetId: lowSeverityQuestId, category: 'bad_directions', severity: 'low' });
    expect(lowReport.status).toBe(201);
    expect(lowReport.body.suppressionApplied).toBe(false);
    const stillUp = await request(ctx.app).get(`/api/v1/quests/${lowSeverityQuestId}`);
    expect(stillUp.status).toBe(200);
  });

  it('full flagged -> suspended -> appeal -> upheld loop restores the quest to published', async () => {
    const questId = await publishQuest(`Appeal Quest ${unique}`, `appeal_owner_${unique}`);

    // Resolve the actual quest_version_id (reports target quest_version, not quest).
    const versionRow = await ctx.pool.query<{ current_version_id: string }>(`SELECT current_version_id FROM quests WHERE id = $1`, [questId]);
    const questVersionId = versionRow.rows[0]!.current_version_id;

    const report = await request(ctx.app)
      .post('/api/v1/reports')
      .send({ targetType: 'quest_version', targetId: questVersionId, category: 'unsafe_conditions', severity: 'high' });
    expect(report.status).toBe(201);
    expect(report.body.suppressionApplied).toBe(true);
    const caseId = report.body.moderationCaseId;

    const flaggedNowHidden = await request(ctx.app).get(`/api/v1/quests/${questId}`);
    expect(flaggedNowHidden.status).toBe(404);

    const admin = await registerAgent(`appeal_admin_${unique}`);
    await makeAdmin(`appeal_admin_${unique}`);

    const nonAdminDecide = await request(ctx.app).post(`/api/v1/moderation/cases/${caseId}/decide`).send({ decision: 'suspend' });
    expect(nonAdminDecide.status).toBe(401); // no session at all on the bare request agent

    const decide = await admin.post(`/api/v1/moderation/cases/${caseId}/decide`).send({ decision: 'suspend' });
    expect(decide.status).toBe(200);
    expect(decide.body.newStatus).toBe('suspended');

    const reputationRow = await ctx.pool.query(
      `SELECT * FROM reputation_events WHERE user_id = $1 AND event_type = 'report_upheld_against'`,
      [decide.body.creatorUserId],
    );
    expect(reputationRow.rowCount).toBeGreaterThan(0);

    const owner = request.agent(ctx.app);
    await owner.post('/api/v1/auth/login').send({ emailOrUsername: `appeal_owner_${unique}`, password: 'a-long-enough-password' });

    const strangerAppeal = await admin.post(`/api/v1/quests/${questId}/appeal`).send({ reasonText: 'not mine' });
    expect(strangerAppeal.status).toBe(403);

    const appeal = await owner.post(`/api/v1/quests/${questId}/appeal`).send({ reasonText: 'The report was mistaken.' });
    expect(appeal.status).toBe(201);
    const appealId = appeal.body.appealId;

    const upheld = await admin.post(`/api/v1/moderation/appeals/${appealId}/decide`).send({ decision: 'uphold' });
    expect(upheld.status).toBe(200);

    const restored = await request(ctx.app).get(`/api/v1/quests/${questId}`);
    expect(restored.status).toBe(200);
  });

  it('privacy export/erase: export includes owned data, erase invalidates the account', async () => {
    const user = await registerAgent(`privacy_user_${unique}`);
    const exportRes = await user.get('/api/v1/me/export');
    expect(exportRes.status).toBe(200);
    expect(exportRes.body.profile.username).toBe(`privacy_user_${unique}`);

    const erase = await user.post('/api/v1/me/erase');
    expect(erase.status).toBe(204);

    const exportAfter = await user.get('/api/v1/me/export');
    expect(exportAfter.status).toBe(401); // session was destroyed by erase

    const loginAfter = await request(ctx.app)
      .post('/api/v1/auth/login')
      .send({ emailOrUsername: `privacy_user_${unique}`, password: 'a-long-enough-password' });
    expect(loginAfter.status).toBe(401); // credentials scrubbed
  });

  it('age-gated adult content: hidden by default, visible once an adult attestation is on file', async () => {
    const brewery = await publishQuest(`Adult Content Quest ${unique}`, `agegate_owner_${unique}`);
    await ctx.pool.query(
      `UPDATE quest_versions SET age_restrictions = '{"min_age": 21, "adult_content": true, "alcohol": true, "gambling": false}' WHERE id = (
         SELECT current_version_id FROM quests WHERE id = $1
       )`,
      [brewery],
    );

    const user = await registerAgent(`agegate_user_${unique}`);
    const beforeAttestation = await user.get('/api/v1/discovery/list').query({ limit: 50 });
    expect(beforeAttestation.body.results.some((r: { questId: string }) => r.questId === brewery)).toBe(false);

    const attest = await user.post('/api/v1/auth/age-attestation').send({ dateOfBirth: '1990-01-01' });
    expect(attest.status).toBe(204);

    const afterAttestation = await user.get('/api/v1/discovery/list').query({ limit: 50 });
    expect(afterAttestation.body.results.some((r: { questId: string }) => r.questId === brewery)).toBe(true);
  });

  it('parties by invitation: create, invite, accept, and reject reuse of a used code', async () => {
    const host = await registerAgent(`party_host_${unique}`);
    const guest = await registerAgent(`party_guest_${unique}`);
    const stranger = await registerAgent(`party_stranger_${unique}`);

    const party = await host.post('/api/v1/parties').send({ questId: null });
    expect(party.status).toBe(201);
    const partyId = party.body.partyId;

    const invite = await host.post(`/api/v1/parties/${partyId}/invitations`);
    expect(invite.status).toBe(201);
    const code = invite.body.inviteCode;

    const strangerView = await stranger.get(`/api/v1/parties/${partyId}`);
    expect(strangerView.status).toBe(404);

    const accept = await guest.post(`/api/v1/invitations/${code}/accept`);
    expect(accept.status).toBe(200);

    const members = await host.get(`/api/v1/parties/${partyId}`);
    expect(members.body.members.length).toBe(2);

    const reuse = await stranger.post(`/api/v1/invitations/${code}/accept`);
    expect(reuse.status).toBe(409);
  });
});
