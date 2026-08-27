import { describe, expect, it } from 'vitest';
import { roleGrantsPermission } from '../src/modules/identity/permissions.js';

describe('roleGrantsPermission (ADR-008)', () => {
  it('grants an adventurer permission to edit their own profile', () => {
    expect(roleGrantsPermission('adventurer', 'edit', 'profile', 'own')).toBe(true);
  });

  it('does not grant an adventurer permission to edit any profile', () => {
    expect(roleGrantsPermission('adventurer', 'edit', 'profile', 'any')).toBe(false);
  });

  it('grants admin any-access permissions to everything admin owns, not just own', () => {
    expect(roleGrantsPermission('admin', 'edit', 'taxonomy', 'own')).toBe(true);
    expect(roleGrantsPermission('admin', 'edit', 'taxonomy', 'any')).toBe(true);
  });

  it('grants a child profile no permissions at all', () => {
    expect(roleGrantsPermission('child', 'edit', 'profile', 'own')).toBe(false);
  });

  it('does not grant an unrelated action/entity pair', () => {
    expect(roleGrantsPermission('moderator', 'edit', 'taxonomy', 'any')).toBe(false);
  });
});
