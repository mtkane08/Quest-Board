/**
 * The 11 role types from spec Section 6. Business/Org/Tourism roles exist
 * here so the identity schema doesn't need to change at Release 2
 * (docs/gate-1/05-role-permission-matrix.md), but carry no permissions
 * until verification exists (see the matrix's notes).
 */
export type Role =
  | 'adventurer'
  | 'guardian'
  | 'child'
  | 'household_member'
  | 'creator'
  | 'business_manager'
  | 'organization_manager'
  | 'tourism_manager'
  | 'moderator'
  | 'admin';

export type AccessLevel = 'own' | 'any';

export interface PermissionTuple {
  action: string;
  entity: string;
  access: AccessLevel;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
}
