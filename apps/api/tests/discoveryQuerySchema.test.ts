import { describe, expect, it } from 'vitest';
import { discoveryQuerySchema } from '../src/modules/discovery/routes.js';

describe('discoveryQuerySchema wheelchairAccessible parsing', () => {
  it('parses an absent param as false', () => {
    const parsed = discoveryQuerySchema.parse({});
    expect(parsed.wheelchairAccessible).toBe(false);
  });

  it('parses ?wheelchairAccessible=true as true', () => {
    const parsed = discoveryQuerySchema.parse({ wheelchairAccessible: 'true' });
    expect(parsed.wheelchairAccessible).toBe(true);
  });

  it('parses the literal string "false" as false, not true (regression)', () => {
    // z.coerce.boolean() would fail this: JS Boolean("false") is truthy,
    // so a naive coercion turns the string "false" into `true`. This is
    // exactly the bug that made the web client's discover page silently
    // apply the wheelchair-only filter on every request, hiding 3 of 5
    // seeded quests in production before anyone had touched the checkbox.
    const parsed = discoveryQuerySchema.parse({ wheelchairAccessible: 'false' });
    expect(parsed.wheelchairAccessible).toBe(false);
  });
});
