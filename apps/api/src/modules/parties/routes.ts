import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { Errors } from '../../lib/errors.js';
import { acceptInvitation, createInvitation, createParty, getPartyMembers, isPartyMember } from './repository.js';

/**
 * Section 21: "parties by invitation" for Gate 6. No TemporaryLocationShare
 * yet (needs an active-attempt concept to expire against — deferred, see
 * the Gate 6 report) and no public-gathering/event scheduling (Section 21
 * restricts that to verified businesses/organizations/trusted creators,
 * which don't exist as a real verification system until Release 2).
 */
export function partiesRoutes(pool: Pool): Router {
  const router = Router();

  router.post('/', requireAuth(), async (req, res, next) => {
    try {
      const { questId } = z.object({ questId: z.string().uuid().nullable().default(null) }).parse(req.body);
      const partyId = await createParty(pool, req.session.userId as string, questId);
      res.status(201).json({ partyId });
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(Errors.validation(err.flatten()));
        return;
      }
      next(err);
    }
  });

  router.get('/:id', requireAuth(), async (req, res, next) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      if (!(await isPartyMember(pool, id, req.session.userId as string))) {
        next(Errors.notFound('Party'));
        return;
      }
      const members = await getPartyMembers(pool, id);
      res.json({ members });
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(Errors.validation(err.flatten()));
        return;
      }
      next(err);
    }
  });

  router.post('/:id/invitations', requireAuth(), async (req, res, next) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      if (!(await isPartyMember(pool, id, req.session.userId as string))) {
        next(Errors.notFound('Party'));
        return;
      }
      const inviteCode = await createInvitation(pool, id, req.session.userId as string);
      res.status(201).json({ inviteCode });
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(Errors.validation(err.flatten()));
        return;
      }
      next(err);
    }
  });

  return router;
}

export function invitationsRoutes(pool: Pool): Router {
  const router = Router();

  router.post('/:code/accept', requireAuth(), async (req, res, next) => {
    try {
      const code = z.string().min(1).parse(req.params.code);
      const result = await acceptInvitation(pool, code, req.session.userId as string);
      res.status(200).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(Errors.validation(err.flatten()));
        return;
      }
      if (err instanceof Error && 'code' in err) {
        const code = (err as { code?: string }).code;
        if (code === 'NOT_FOUND') {
          next(Errors.notFound('Invitation'));
          return;
        }
        if (code === 'CONFLICT') {
          next(Errors.conflict(err.message));
          return;
        }
      }
      next(err);
    }
  });

  return router;
}
