/**
 * Section 19: "Avoid punitive streak loss." Implemented as a pure read
 * over completion dates rather than a maintained counter — there is no
 * "reset streak to 0" write path to accidentally make punitive, because
 * there's no stored streak value to reset. Missing a day simply means the
 * next completion starts counting from 1 again; nothing is taken away.
 */
export function calculateCurrentStreak(completionDatesUtc: string[], asOfUtc: string): number {
  const uniqueDays = new Set(completionDatesUtc.map((d) => d.slice(0, 10)));
  let streak = 0;
  const cursor = new Date(`${asOfUtc.slice(0, 10)}T00:00:00Z`);

  // "As of today" only counts if today has a completion; otherwise the
  // streak is whatever ran up through yesterday (a gap doesn't retroactively
  // zero out days that already happened — it just stops the count going
  // forward, which is what "no punitive loss" means in practice).
  if (!uniqueDays.has(cursor.toISOString().slice(0, 10))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  while (uniqueDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}
