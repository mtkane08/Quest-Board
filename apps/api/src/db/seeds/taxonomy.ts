/**
 * Seed data transcribed directly from spec Section 8 (realms/guilds) and
 * Section 28 (tones). Kept as data, not hardcoded logic, so it's editable
 * without a deploy once the admin taxonomy UI exists (QB-020) — this seed
 * is just how it gets into the table the first time.
 */

export const REALMS = ['Nearby', 'Hearth & Home', 'Events', 'Roads & Realms / Journeys'] as const;

export const GUILDS: Array<{ key: string; displayName: string; plainSubtitle: string }> = [
  { key: 'the_wilds', displayName: 'The Wilds', plainSubtitle: 'Parks, beaches, forests, hiking, cycling, ecology, outdoor recreation' },
  { key: 'hearth_and_home', displayName: 'Hearth & Home', plainSubtitle: 'Cooking, baking, crafts, games, movies, puzzles, chores, household projects' },
  { key: 'halls_of_lore', displayName: 'Halls of Lore', plainSubtitle: 'Museums, galleries, history, science, architecture, education, libraries' },
  { key: 'the_revels', displayName: 'The Revels', plainSubtitle: 'Restaurants, cafes, entertainment, social outings, nightlife' },
  { key: 'trials_of_might', displayName: 'Trials of Might', plainSubtitle: 'Fitness, sports, wellness, physical challenges' },
  { key: 'the_makers_guild', displayName: "The Maker's Guild", plainSubtitle: 'Art, building, writing, music, photography, filmmaking, creative projects' },
  { key: 'roads_and_realms', displayName: 'Roads & Realms', plainSubtitle: 'Sightseeing, routes, road trips, tourism, multi-stop travel' },
  { key: 'mysteries_and_mischief', displayName: 'Mysteries & Mischief', plainSubtitle: 'Riddles, trivia, scavenger hunts, escape rooms, unusual challenges' },
  { key: 'deeds_of_fellowship', displayName: 'Deeds of Fellowship', plainSubtitle: 'Volunteering, mutual aid, civic and community service' },
  { key: 'the_daily_path', displayName: 'The Daily Path', plainSubtitle: 'Habits, errands, learning, personal development, practical goals' },
  { key: 'festivals_and_omens', displayName: 'Festivals & Omens', plainSubtitle: 'Live events, holidays, seasons, weather-driven and limited-time quests' },
  { key: 'the_unknown', displayName: 'The Unknown', plainSubtitle: 'Surprise, randomized, experimental, cross-category quests' },
];

// Guilds requiring explicit age-gate/classification per spec Section 8.
export const AGE_GATED_GUILD_KEYS = new Set(['the_revels', 'trials_of_might']);

export const TAGS: Array<{ key: string; category: string }> = [
  'rainy-day', 'date-night', 'solo', 'family', 'teen', 'under-20', 'free',
  'wheelchair-accessible', 'low-walking', 'sensory-friendly', 'dog-friendly',
  'open-now', 'spooky', 'historical', 'food', 'alcohol', 'mature',
  'reservation-required', 'outdoor', 'indoor', 'offline-friendly', 'beginner',
  'multi-day',
].map((key) => ({
  key,
  category: ['wheelchair-accessible', 'low-walking', 'sensory-friendly'].includes(key)
    ? 'accessibility'
    : ['alcohol', 'mature'].includes(key)
      ? 'restricted'
      : 'general',
}));

export const TONES: Array<{ key: string; label: string }> = [
  { key: 'classic_fantasy', label: 'Classic fantasy' },
  { key: 'epic_high_fantasy', label: 'Epic high fantasy' },
  { key: 'cozy_adventure', label: 'Cozy adventure' },
  { key: 'mystery_noir', label: 'Mystery/noir' },
  { key: 'science_fiction', label: 'Science fiction' },
  { key: 'historical_expedition', label: 'Historical expedition' },
  { key: 'pirate', label: 'Pirate' },
  { key: 'superhero', label: 'Superhero' },
  { key: 'horror', label: 'Horror' },
  { key: 'comedy', label: 'Comedy' },
  { key: 'child_friendly_storybook', label: 'Child-friendly storybook' },
  { key: 'minimal_plain_language', label: 'Minimal/plain language' },
];
