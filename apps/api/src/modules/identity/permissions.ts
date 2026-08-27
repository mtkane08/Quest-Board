import type { AccessLevel, PermissionTuple, Role } from './types.js';

/**
 * ADR-008: permissions are (action, entity, access) tuples grouped into
 * roles. This is the Gate 2 seed of the full matrix in
 * docs/gate-1/05-role-permission-matrix.md — only entities that exist by
 * Foundation (profile, taxonomy, audit-log) are populated. Each later gate
 * adds its module's rows here rather than inventing a parallel mechanism.
 */
export const ROLE_PERMISSIONS: Record<Role, PermissionTuple[]> = {
  adventurer: [
    { action: 'edit', entity: 'profile', access: 'own' },
    { action: 'view', entity: 'accessibility-profile', access: 'own' },
    { action: 'export', entity: 'own-data', access: 'own' },
    { action: 'create', entity: 'quest', access: 'own' },
    { action: 'edit', entity: 'quest', access: 'own' },
    { action: 'submit', entity: 'quest', access: 'own' },
    { action: 'publish', entity: 'quest', access: 'own' },
  ],
  guardian: [
    { action: 'edit', entity: 'profile', access: 'own' },
    { action: 'view', entity: 'accessibility-profile', access: 'own' },
    { action: 'export', entity: 'own-data', access: 'own' },
    { action: 'manage', entity: 'child-profile', access: 'own' },
  ],
  child: [],
  household_member: [{ action: 'edit', entity: 'profile', access: 'own' }],
  creator: [
    { action: 'edit', entity: 'profile', access: 'own' },
    { action: 'export', entity: 'own-data', access: 'own' },
    { action: 'create', entity: 'quest', access: 'own' },
    { action: 'edit', entity: 'quest', access: 'own' },
    { action: 'submit', entity: 'quest', access: 'own' },
    { action: 'publish', entity: 'quest', access: 'own' },
  ],
  business_manager: [],
  organization_manager: [],
  tourism_manager: [],
  moderator: [
    { action: 'view', entity: 'audit-log', access: 'own' },
    { action: 'moderate', entity: 'report', access: 'any' },
    { action: 'decide', entity: 'moderation-case', access: 'any' },
    { action: 'publish', entity: 'quest', access: 'any' },
    { action: 'view', entity: 'moderation-queue', access: 'any' },
    { action: 'view', entity: 'report', access: 'any' },
  ],
  admin: [
    { action: 'edit', entity: 'taxonomy', access: 'any' },
    { action: 'view', entity: 'audit-log', access: 'any' },
    { action: 'edit', entity: 'feature-flag', access: 'any' },
    { action: 'decide', entity: 'moderation-case', access: 'any' },
    { action: 'publish', entity: 'quest', access: 'any' },
    { action: 'view', entity: 'moderation-queue', access: 'any' },
    { action: 'view', entity: 'report', access: 'any' },
  ],
};

export function roleGrantsPermission(
  role: Role,
  action: string,
  entity: string,
  requestedAccess: AccessLevel,
): boolean {
  const tuples = ROLE_PERMISSIONS[role] ?? [];
  return tuples.some(
    (t) =>
      t.action === action &&
      t.entity === entity &&
      (t.access === 'any' || t.access === requestedAccess),
  );
}
