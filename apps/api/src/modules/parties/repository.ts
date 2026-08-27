import { randomBytes } from 'node:crypto';
import type { Pool } from 'pg';

const INVITE_EXPIRY_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export async function createParty(pool: Pool, createdBy: string, questId: string | null): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const partyResult = await client.query<{ id: string }>(
      `INSERT INTO parties (quest_id, created_by) VALUES ($1, $2) RETURNING id`,
      [questId, createdBy],
    );
    const party = partyResult.rows[0];
    if (!party) throw new Error('Party creation returned no row.');
    await client.query(`INSERT INTO party_members (party_id, user_id, role) VALUES ($1, $2, 'host')`, [party.id, createdBy]);
    await client.query('COMMIT');
    return party.id;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function isPartyMember(pool: Pool, partyId: string, userId: string): Promise<boolean> {
  const result = await pool.query(`SELECT 1 FROM party_members WHERE party_id = $1 AND user_id = $2`, [partyId, userId]);
  return (result.rowCount ?? 0) > 0;
}

export async function createInvitation(pool: Pool, partyId: string, createdBy: string): Promise<string> {
  const code = randomBytes(6).toString('hex');
  await pool.query(
    `INSERT INTO invitations (party_id, invite_code, created_by, expires_at) VALUES ($1, $2, $3, $4)`,
    [partyId, code, createdBy, new Date(Date.now() + INVITE_EXPIRY_MS)],
  );
  return code;
}

export async function acceptInvitation(pool: Pool, code: string, userId: string): Promise<{ partyId: string }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const invitationResult = await client.query<{ id: string; party_id: string; expires_at: string; used_at: string | null }>(
      `SELECT id, party_id, expires_at, used_at FROM invitations WHERE invite_code = $1 FOR UPDATE`,
      [code],
    );
    const invitation = invitationResult.rows[0];
    if (!invitation) throw Object.assign(new Error('Invalid invite code.'), { code: 'NOT_FOUND' });
    if (invitation.used_at) throw Object.assign(new Error('This invitation has already been used.'), { code: 'CONFLICT' });
    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      throw Object.assign(new Error('This invitation has expired.'), { code: 'CONFLICT' });
    }

    await client.query(
      `INSERT INTO party_members (party_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT (party_id, user_id) DO NOTHING`,
      [invitation.party_id, userId],
    );
    await client.query(`UPDATE invitations SET used_by_user_id = $2, used_at = NOW() WHERE id = $1`, [invitation.id, userId]);

    await client.query('COMMIT');
    return { partyId: invitation.party_id };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getPartyMembers(pool: Pool, partyId: string) {
  const result = await pool.query(
    `SELECT u.id, u.username, pm.role, pm.joined_at FROM party_members pm JOIN users u ON u.id = pm.user_id
     WHERE pm.party_id = $1 ORDER BY pm.joined_at`,
    [partyId],
  );
  return result.rows;
}
