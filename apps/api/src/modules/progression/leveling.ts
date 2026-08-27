/**
 * Section 19: "Account XP and levels" + "Fantasy ranks/titles." Levels and
 * ranks are derived entirely from cumulative XP (docs/gate-1/03-data-model.md:
 * "Level, Rank — derived/config-driven thresholds over cumulative XP") —
 * there is deliberately no mutable `levels`/`ranks` table to keep in sync;
 * a user's level is always a pure function of their XPEvent ledger sum.
 * Thresholds are provisional pending DL-006, same caveat as tiering/reward.
 */
export interface LevelDefinition {
  level: number;
  rank: string;
  minXp: number;
}

export const LEVEL_TABLE: LevelDefinition[] = [
  { level: 1, rank: 'Wayfarer', minXp: 0 },
  { level: 2, rank: 'Pathfinder', minXp: 50 },
  { level: 3, rank: 'Trailblazer', minXp: 150 },
  { level: 4, rank: 'Ranger', minXp: 350 },
  { level: 5, rank: 'Explorer', minXp: 700 },
  { level: 6, rank: 'Wanderer-Sage', minXp: 1300 },
  { level: 7, rank: 'Champion', minXp: 2300 },
  { level: 8, rank: 'Legend', minXp: 4000 },
];

export function calculateLevel(totalXp: number): { level: number; rank: string; nextLevelXp: number | null } {
  let current = LEVEL_TABLE[0]!;
  for (const def of LEVEL_TABLE) {
    if (totalXp >= def.minXp) current = def;
    else break;
  }
  const currentIndex = LEVEL_TABLE.indexOf(current);
  const next = LEVEL_TABLE[currentIndex + 1];
  return { level: current.level, rank: current.rank, nextLevelXp: next ? next.minXp : null };
}
