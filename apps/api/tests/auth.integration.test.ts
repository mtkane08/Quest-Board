import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildTestApp, isDatabaseReachable } from './helpers/testApp.js';

const dbReachable = await isDatabaseReachable();

describe.skipIf(!dbReachable)('auth routes (integration)', () => {
  let ctx: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    ctx = await buildTestApp();
  });

  afterAll(async () => {
    await ctx.teardown();
  });

  const unique = Date.now();
  const credentials = {
    email: `gate2-test-${unique}@example.com`,
    username: `gate2test${unique}`,
    password: 'a-long-enough-password',
  };

  it('registers a new adventurer and starts a session', async () => {
    const agent = request.agent(ctx.app);
    const res = await agent.post('/api/v1/auth/register').send(credentials);
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(credentials.email);

    const me = await agent.get('/api/v1/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.roles).toEqual(['adventurer']);
  });

  it('rejects a duplicate registration', async () => {
    const res = await request(ctx.app).post('/api/v1/auth/register').send(credentials);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('logs in with correct credentials and rejects incorrect ones', async () => {
    const wrongPassword = await request(ctx.app)
      .post('/api/v1/auth/login')
      .send({ emailOrUsername: credentials.username, password: 'wrong-password' });
    expect(wrongPassword.status).toBe(401);

    const agent = request.agent(ctx.app);
    const rightPassword = await agent
      .post('/api/v1/auth/login')
      .send({ emailOrUsername: credentials.username, password: credentials.password });
    expect(rightPassword.status).toBe(200);

    const me = await agent.get('/api/v1/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe(credentials.username);
  });

  it('rejects /me without a session', async () => {
    const res = await request(ctx.app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('issues a guest session without creating an account (QB-001)', async () => {
    const res = await request(ctx.app).post('/api/v1/auth/guest-session');
    expect(res.status).toBe(201);
    expect(res.body.guest).toBe(true);
  });

  it('logs out and clears the session', async () => {
    const agent = request.agent(ctx.app);
    await agent
      .post('/api/v1/auth/login')
      .send({ emailOrUsername: credentials.username, password: credentials.password });
    const logout = await agent.post('/api/v1/auth/logout');
    expect(logout.status).toBe(204);

    const me = await agent.get('/api/v1/auth/me');
    expect(me.status).toBe(401);
  });
});
