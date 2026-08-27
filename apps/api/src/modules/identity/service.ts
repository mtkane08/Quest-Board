import bcrypt from 'bcryptjs';
import type { Pool } from 'pg';
import { Errors } from '../../lib/errors.js';
import { roleGrantsPermission } from './permissions.js';
import type { AccessLevel, AuthenticatedUser, Role } from './types.js';

const BCRYPT_ROUNDS = 12;

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
}

export async function registerUser(pool: Pool, input: RegisterInput): Promise<AuthenticatedUser> {
  const existing = await pool.query(
    'SELECT id FROM users WHERE email = $1 OR username = $2',
    [input.email, input.username],
  );
  if ((existing.rowCount ?? 0) > 0) {
    throw Errors.conflict('An account with that email or username already exists.');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userResult = await client.query<{ id: string; email: string; username: string }>(
      `INSERT INTO users (email, username, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, username`,
      [input.email, input.username, passwordHash],
    );
    const user = userResult.rows[0];
    if (!user) throw Errors.internal('User creation returned no row.');

    await client.query(`INSERT INTO profiles (user_id, display_name) VALUES ($1, $2)`, [
      user.id,
      input.username,
    ]);

    // Every self-registered account starts as a plain adventurer (Section 6);
    // role-switching to other role types happens through separate,
    // authorized grants, not at signup.
    await client.query(
      `INSERT INTO role_grants (user_id, role, scope_type) VALUES ($1, 'adventurer', 'global')`,
      [user.id],
    );

    await client.query(
      `INSERT INTO audit_events (actor_id, action, entity_type, entity_id, after_state)
       VALUES ($1, 'register', 'user', $1, $2)`,
      [user.id, JSON.stringify({ email: user.email, username: user.username })],
    );

    await client.query('COMMIT');
    return user;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function verifyCredentials(
  pool: Pool,
  emailOrUsername: string,
  password: string,
): Promise<AuthenticatedUser> {
  const result = await pool.query<{
    id: string;
    email: string;
    username: string;
    password_hash: string;
    is_active: boolean;
  }>(
    'SELECT id, email, username, password_hash, is_active FROM users WHERE email = $1 OR username = $1',
    [emailOrUsername],
  );
  const row = result.rows[0];
  if (!row) throw Errors.unauthorized('Invalid credentials.');
  if (!row.is_active) throw Errors.forbidden('sign in as', 'deactivated account');

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) throw Errors.unauthorized('Invalid credentials.');

  return { id: row.id, email: row.email, username: row.username };
}

export async function getActiveRoles(pool: Pool, userId: string): Promise<Role[]> {
  const result = await pool.query<{ role: Role }>(
    'SELECT role FROM role_grants WHERE user_id = $1 AND revoked_at IS NULL',
    [userId],
  );
  return result.rows.map((r) => r.role);
}

export async function userHasPermission(
  pool: Pool,
  userId: string,
  action: string,
  entity: string,
  access: AccessLevel,
): Promise<boolean> {
  const roles = await getActiveRoles(pool, userId);
  return roles.some((role) => roleGrantsPermission(role, action, entity, access));
}
