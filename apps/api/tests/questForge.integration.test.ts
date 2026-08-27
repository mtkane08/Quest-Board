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

function highConfidenceDraft(title: string) {
  return {
    title,
    plainSummary: 'A fully specified test quest.',
    factorScores: validFactorScores,
    riskRating: 'low',
    accessibilityProfile: validAccessibility,
    ageRestrictions: { min_age: null, adult_content: false, alcohol: false, gambling: false },
    objectives: ['Do the one thing'],
    completionMethods: ['honor_system'],
    durationMinMinutes: 30,
    durationMaxMinutes: 60,
    costMinCents: 0,
    costMaxCents: 0,
  };
}

describe.skipIf(!dbReachable)('quest Forge / feasibility / moderation (Gate 4 integration)', () => {
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

  it('creates a draft quest and computes its tier from factor scores', async () => {
    const owner = await registerAgent(`forge_owner_${unique}`);
    const res = await owner.post('/api/v1/quests').send(highConfidenceDraft(`Draft Quest ${unique}`));
    expect(res.status).toBe(201);
    expect(res.body.tier).toBe('adventurer'); // weighted mean of all-2s = 2.0 -> adventurer bin
  });

  it('rejects creating a quest with an out-of-range factor score', async () => {
    const owner = await registerAgent(`forge_badscore_${unique}`);
    const draft = { ...highConfidenceDraft(`Bad Score ${unique}`), factorScores: { ...validFactorScores, cost_burden: 9 } };
    const res = await owner.post('/api/v1/quests').send(draft);
    expect(res.status).toBe(400);
  });

  it('lets an untrusted creator submit a complete draft, which requires moderation review', async () => {
    const owner = await registerAgent(`forge_untrusted_${unique}`);
    const create = await owner.post('/api/v1/quests').send(highConfidenceDraft(`Untrusted Quest ${unique}`));
    const questId = create.body.questId;

    const submit = await owner.post(`/api/v1/quests/${questId}/submit`);
    expect(submit.status).toBe(200);
    expect(submit.body.status).toBe('submitted');
    expect(submit.body.feasibility.overallConfidence).toBe('high');
    expect(submit.body.moderationCaseId).not.toBeNull();

    const mine = await owner.get('/api/v1/quests/mine');
    const found = mine.body.quests.find((q: { quest_id: string }) => q.quest_id === questId);
    expect(found.status).toBe('submitted');
  });

  it('routes an incomplete draft to needs_correction without opening a moderation case', async () => {
    const owner = await registerAgent(`forge_incomplete_${unique}`);
    const incomplete = { ...highConfidenceDraft(`Incomplete Quest ${unique}`), objectives: [], completionMethods: [] };
    const create = await owner.post('/api/v1/quests').send(incomplete);
    const submit = await owner.post(`/api/v1/quests/${create.body.questId}/submit`);
    expect(submit.status).toBe(200);
    expect(submit.body.status).toBe('needs_correction');
    expect(submit.body.moderationCaseId).toBeNull();
    expect(submit.body.feasibility.blockers.length).toBeGreaterThan(0);
  });

  it('rejects publishing before a quest is approved', async () => {
    const owner = await registerAgent(`forge_earlypublish_${unique}`);
    const create = await owner.post('/api/v1/quests').send(highConfidenceDraft(`Early Publish ${unique}`));
    const publish = await owner.post(`/api/v1/quests/${create.body.questId}/publish`);
    expect(publish.status).toBe(409);
  });

  it('prevents a non-owner from editing, submitting, or publishing someone else\'s quest', async () => {
    const owner = await registerAgent(`forge_owner2_${unique}`);
    const stranger = await registerAgent(`forge_stranger_${unique}`);
    const create = await owner.post('/api/v1/quests').send(highConfidenceDraft(`Owned Quest ${unique}`));
    const questId = create.body.questId;

    const editAttempt = await stranger.patch(`/api/v1/quests/${questId}`).send(highConfidenceDraft('Hijacked'));
    expect(editAttempt.status).toBe(403);

    const submitAttempt = await stranger.post(`/api/v1/quests/${questId}/submit`);
    expect(submitAttempt.status).toBe(403);
  });

  it('auto-approves a trusted creator\'s submission, skipping the moderation queue', async () => {
    const owner = await registerAgent(`forge_trusted_${unique}`);
    await ctx.pool.query(`UPDATE users SET creator_trust = TRUE WHERE username = $1`, [`forge_trusted_${unique}`]);

    const create = await owner.post('/api/v1/quests').send(highConfidenceDraft(`Trusted Quest ${unique}`));
    const submit = await owner.post(`/api/v1/quests/${create.body.questId}/submit`);
    expect(submit.status).toBe(200);
    expect(submit.body.status).toBe('approved');
    expect(submit.body.moderationCaseId).toBeNull();

    const publish = await owner.post(`/api/v1/quests/${create.body.questId}/publish`);
    expect(publish.status).toBe(200);

    const detail = await request(ctx.app).get(`/api/v1/quests/${create.body.questId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.quest.title).toBe(`Trusted Quest ${unique}`);
  });

  it('an admin can decide a moderation case and the owner can then publish', async () => {
    const owner = await registerAgent(`forge_modowner_${unique}`);
    const admin = await registerAgent(`forge_admin_${unique}`);
    await ctx.pool.query(
      `INSERT INTO role_grants (user_id, role) SELECT id, 'admin' FROM users WHERE username = $1`,
      [`forge_admin_${unique}`],
    );

    const create = await owner.post('/api/v1/quests').send(highConfidenceDraft(`Moderated Quest ${unique}`));
    const submit = await owner.post(`/api/v1/quests/${create.body.questId}/submit`);
    const caseId = submit.body.moderationCaseId;
    expect(caseId).not.toBeNull();

    const forbiddenDecide = await owner.post(`/api/v1/moderation/cases/${caseId}/decide`).send({ decision: 'approve' });
    expect(forbiddenDecide.status).toBe(403);

    const decide = await admin.post(`/api/v1/moderation/cases/${caseId}/decide`).send({ decision: 'approve' });
    expect(decide.status).toBe(200);

    const publish = await owner.post(`/api/v1/quests/${create.body.questId}/publish`);
    expect(publish.status).toBe(200);
  });

  it('guests can generate exactly one AI quest draft, then are blocked', async () => {
    const guest = request.agent(ctx.app);
    await guest.post('/api/v1/auth/guest-session');

    const first = await guest.post('/api/v1/ai/quest-forge').send({ ideaText: 'walk the arboretum' });
    expect(first.status).toBe(202);

    const job = await guest.get(`/api/v1/ai/jobs/${first.body.jobId}`);
    expect(job.status).toBe(200);
    expect(job.body.job.status).toBe('succeeded');
    expect(job.body.job.output.confidence).toBe('critical_unknown');

    const second = await guest.post('/api/v1/ai/quest-forge').send({ ideaText: 'another idea' });
    expect(second.status).toBe(403);
  });
});
