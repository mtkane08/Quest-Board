import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildTestApp, isDatabaseReachable } from './helpers/testApp.js';

const dbReachable = await isDatabaseReachable();

describe.skipIf(!dbReachable)('exploration / fog of war (Section 20, Gate 7)', () => {
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

  it('is opt-in: no tiles exist until a session is started and pinged', async () => {
    const user = await registerAgent(`explore_optin_${unique}`);
    const before = await user.get('/api/v1/exploration/regions');
    expect(before.body.totalTilesDiscovered).toBe(0);
  });

  it('walking reveals more tiles than driving for the same ping', async () => {
    const walker = await registerAgent(`explore_walk_${unique}`);
    const driver = await registerAgent(`explore_drive_${unique}`);

    const walkSession = await walker.post('/api/v1/exploration/sessions/start');
    const walkPing = await walker
      .post(`/api/v1/exploration/sessions/${walkSession.body.sessionId}/ping`)
      .send({ lat: 42.36, lng: -71.06, travelMode: 'walk' });
    expect(walkPing.status).toBe(200);

    const driveSession = await driver.post('/api/v1/exploration/sessions/start');
    const drivePing = await driver
      .post(`/api/v1/exploration/sessions/${driveSession.body.sessionId}/ping`)
      .send({ lat: 42.36, lng: -71.06, travelMode: 'drive' });
    expect(drivePing.status).toBe(200);

    expect(walkPing.body.newlyRevealedTiles.length).toBeGreaterThan(drivePing.body.newlyRevealedTiles.length);
  });

  it('flags an impossible jump as suspicious without blocking the ping or erroring', async () => {
    const user = await registerAgent(`explore_suspicious_${unique}`);
    const session = await user.post('/api/v1/exploration/sessions/start');
    const sessionId = session.body.sessionId;

    const first = await user
      .post(`/api/v1/exploration/sessions/${sessionId}/ping`)
      .send({ lat: 42.36, lng: -71.06, travelMode: 'walk' });
    expect(first.body.suspicious).toBe(false);

    const jump = await user
      .post(`/api/v1/exploration/sessions/${sessionId}/ping`)
      .send({ lat: 51.5, lng: -0.13, travelMode: 'walk' }); // Boston to London, immediately
    expect(jump.status).toBe(200); // never blocked — "cautiously," not punitively
    expect(jump.body.suspicious).toBe(true);
  });

  it('a completed quest reveals a larger area than an ordinary walking ping, via the attempts flow', async () => {
    const owner = await registerAgent(`explore_quest_owner_${unique}`);
    await ctx.pool.query(`UPDATE users SET creator_trust = TRUE WHERE username = $1`, [`explore_quest_owner_${unique}`]);
    const create = await owner.post('/api/v1/quests').send({
      title: `Exploration Bonus Quest ${unique}`,
      plainSummary: 'Test quest with a location.',
      factorScores: {
        time_commitment: 2, physical_effort: 2, mental_challenge: 2, travel_complexity: 2,
        cost_burden: 2, preparation: 2, required_skill: 2, objective_complexity: 2, group_coordination: 2,
      },
      riskRating: 'low',
      accessibilityProfile: { wheelchair: 'confirmed', low_walking: 'confirmed', sensory_friendly: 'confirmed', service_animal: 'confirmed', restroom_access: 'confirmed' },
      ageRestrictions: { min_age: null, adult_content: false, alcohol: false, gambling: false },
      objectives: ['Do the thing'],
      completionMethods: ['honor_system'],
      places: [{ role: 'primary', placeName: 'Test Place', lat: 43.0, lng: -72.0 }],
    });
    const questId = create.body.questId;
    await owner.post(`/api/v1/quests/${questId}/submit`);
    await owner.post(`/api/v1/quests/${questId}/publish`);

    const player = await registerAgent(`explore_quest_player_${unique}`);
    const start = await player.post('/api/v1/attempts').send({ questId });
    const detail = await player.get(`/api/v1/attempts/${start.body.attemptId}`);
    await player.post(`/api/v1/attempts/${start.body.attemptId}/evidence`).send({ objectiveId: detail.body.objectives[0].id, type: 'honor_system' });
    await player.post(`/api/v1/attempts/${start.body.attemptId}/complete`);

    const regions = await player.get('/api/v1/exploration/regions');
    expect(regions.body.totalTilesDiscovered).toBeGreaterThan(0);
  });

  it('deleting fog history removes tiles but preserves badges and XP', async () => {
    const user = await registerAgent(`explore_delete_${unique}`);
    const session = await user.post('/api/v1/exploration/sessions/start');
    await user.post(`/api/v1/exploration/sessions/${session.body.sessionId}/ping`).send({ lat: 42.36, lng: -71.06, travelMode: 'walk' });

    const before = await user.get('/api/v1/exploration/regions');
    expect(before.body.totalTilesDiscovered).toBeGreaterThan(0);
    const progressionBefore = await user.get('/api/v1/progression/me');

    const del = await user.delete('/api/v1/exploration/history');
    expect(del.status).toBe(204);

    const after = await user.get('/api/v1/exploration/regions');
    expect(after.body.totalTilesDiscovered).toBe(0);

    const progressionAfter = await user.get('/api/v1/progression/me');
    expect(progressionAfter.body.totalXp).toBe(progressionBefore.body.totalXp);
    expect(progressionAfter.body.badges).toEqual(progressionBefore.body.badges);
  });

  it('a stranger cannot ping or stop someone else\'s session', async () => {
    const owner = await registerAgent(`explore_sessionowner_${unique}`);
    const stranger = await registerAgent(`explore_sessionstranger_${unique}`);
    const session = await owner.post('/api/v1/exploration/sessions/start');

    const strangerPing = await stranger
      .post(`/api/v1/exploration/sessions/${session.body.sessionId}/ping`)
      .send({ lat: 42.36, lng: -71.06, travelMode: 'walk' });
    expect(strangerPing.status).toBe(404);

    const strangerStop = await stranger.post(`/api/v1/exploration/sessions/${session.body.sessionId}/stop`);
    expect(strangerStop.status).toBe(404);
  });

  it('rejects a ping after the session has been stopped', async () => {
    const user = await registerAgent(`explore_stopped_${unique}`);
    const session = await user.post('/api/v1/exploration/sessions/start');
    await user.post(`/api/v1/exploration/sessions/${session.body.sessionId}/stop`);
    const pingAfterStop = await user
      .post(`/api/v1/exploration/sessions/${session.body.sessionId}/ping`)
      .send({ lat: 42.36, lng: -71.06, travelMode: 'walk' });
    expect(pingAfterStop.status).toBe(409);
  });
});
