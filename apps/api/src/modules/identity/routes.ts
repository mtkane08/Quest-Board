import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { authRateLimit } from '../../middleware/rateLimit.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { Errors } from '../../lib/errors.js';
import { registerUser, verifyCredentials, getActiveRoles } from './service.js';

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30),
  password: z.string().min(10, 'Password must be at least 10 characters.'),
});

const loginSchema = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string().min(1),
});

const ageAttestationSchema = z.object({
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must be YYYY-MM-DD'),
});

export function identityRoutes(pool: Pool): Router {
  const router = Router();

  router.post('/register', authRateLimit, validateBody(registerSchema), async (req, res, next) => {
    try {
      const user = await registerUser(pool, req.body);
      req.session.userId = user.id;
      req.session.isGuest = false;
      res.status(201).json({ user });
    } catch (err) {
      next(err);
    }
  });

  router.post('/login', authRateLimit, validateBody(loginSchema), async (req, res, next) => {
    try {
      const { emailOrUsername, password } = req.body as z.infer<typeof loginSchema>;
      const user = await verifyCredentials(pool, emailOrUsername, password);
      req.session.userId = user.id;
      req.session.isGuest = false;
      res.json({ user });
    } catch (err) {
      next(err);
    }
  });

  // QB-001: guests get a scoped session with no account — enough to browse
  // and try one limited private AI quest, nothing persisted long-term.
  router.post('/guest-session', authRateLimit, (req, res) => {
    req.session.userId = undefined;
    req.session.isGuest = true;
    res.status(201).json({ guest: true });
  });

  router.post('/logout', (req, res, next) => {
    req.session.destroy((err) => {
      if (err) {
        next(Errors.internal('Failed to end session.'));
        return;
      }
      res.status(204).end();
    });
  });

  router.get('/me', requireAuth(), async (req, res, next) => {
    try {
      const userResult = await pool.query<{ id: string; email: string; username: string }>(
        'SELECT id, email, username FROM users WHERE id = $1',
        [req.session.userId],
      );
      const user = userResult.rows[0];
      if (!user) {
        next(Errors.notFound('User'));
        return;
      }
      const roles = await getActiveRoles(pool, user.id);
      res.json({ user, roles });
    } catch (err) {
      next(err);
    }
  });

  // Section 8: independent-account age default / adult-content gating
  // needs a real birth date on file — self-attested for now (Section 6's
  // "AgeAttestation" entity), server-side-computed eligibility, never a
  // client-supplied "I'm an adult" flag (see modules/identity/ageEligibility.ts).
  router.post('/age-attestation', requireAuth(), validateBody(ageAttestationSchema), async (req, res, next) => {
    try {
      const { dateOfBirth } = req.body as z.infer<typeof ageAttestationSchema>;
      await pool.query(
        `INSERT INTO age_attestations (user_id, date_of_birth) VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET date_of_birth = $2, attested_at = NOW()`,
        [req.session.userId, dateOfBirth],
      );
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
