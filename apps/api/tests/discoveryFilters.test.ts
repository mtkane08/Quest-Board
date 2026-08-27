import { describe, expect, it } from 'vitest';
import { buildFilterClauses } from '../src/modules/quest-catalog/repository.js';

describe('buildFilterClauses (Section 12 hard-constraint gate)', () => {
  it('excludes adult content by default', () => {
    const clauses = buildFilterClauses({}, []);
    expect(clauses.some((c) => c.includes('adult_content'))).toBe(true);
  });

  it('omits the adult-content exclusion only when explicitly opted in', () => {
    const clauses = buildFilterClauses({ includeAdultContent: true }, []);
    expect(clauses.some((c) => c.includes('adult_content'))).toBe(false);
  });

  it('always restricts to published quests', () => {
    const clauses = buildFilterClauses({}, []);
    expect(clauses).toContain(`qv.status = 'published'`);
  });

  it('wheelchair filter only matches confirmed/reported, never unknown (ADR-010, risk R-11)', () => {
    const clauses = buildFilterClauses({ wheelchairAccessible: true }, []);
    const clause = clauses.find((c) => c.includes('wheelchair'));
    expect(clause).toBeDefined();
    expect(clause).toContain("IN ('confirmed', 'reported')");
    expect(clause).not.toContain('unknown');
  });

  it('does not add a wheelchair clause when the filter is not requested', () => {
    const clauses = buildFilterClauses({}, []);
    expect(clauses.some((c) => c.includes('wheelchair'))).toBe(false);
  });

  it('parameterizes guild/tag/tier filters rather than inlining values (SQL injection safety)', () => {
    const params: unknown[] = [];
    const clauses = buildFilterClauses(
      { guildKey: "the_wilds'; DROP TABLE quests; --", tag: 'family', tier: 'novice' },
      params,
    );
    expect(params).toContain("the_wilds'; DROP TABLE quests; --");
    expect(clauses.every((c) => !c.includes('DROP TABLE'))).toBe(true);
  });
});
