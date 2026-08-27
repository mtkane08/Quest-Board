/**
 * Seed quests for the Gate 3 Discovery vertical slice. Deliberately chosen
 * to exercise the acceptance scenarios in spec Section 43 and the hard
 * filters in docs/gate-1/03-data-model.md / permissions logic — not just
 * "some sample content." Each quest notes which scenario/rule it proves.
 */

export interface SeedPlace {
  role: 'primary' | 'stop';
  placeName: string;
  lat: number;
  lng: number;
}

export interface SeedQuest {
  title: string;
  plainSummary: string;
  narratedDescription: string;
  guildKey: string;
  tags: string[];
  originType: 'ai_suggested' | 'community' | 'creator_verified' | 'business_verified' | 'quest_board_curated';
  trustBadges: string[];
  overallTier: 'novice' | 'adventurer' | 'heroic' | 'legendary' | 'mythic';
  factorScores: Record<string, number>;
  audience: string;
  durationMinMinutes: number | null;
  durationMaxMinutes: number | null;
  costMinCents: number | null;
  costMaxCents: number | null;
  travelMode: 'walk' | 'cycle' | 'drive' | 'transit' | 'any' | null;
  physicalIntensity: number | null;
  mentalIntensity: number | null;
  riskRating: 'low' | 'moderate' | 'high' | 'severe';
  accessibilityProfile: {
    wheelchair: string;
    low_walking: string;
    sensory_friendly: string;
    service_animal: string;
    restroom_access: string;
  };
  ageRestrictions: { min_age: number | null; adult_content: boolean; alcohol: boolean; gambling: boolean };
  structureType: string;
  objectives: string[];
  completionMethods: string[];
  requiredEquipment: string[];
  safetyNotes: string | null;
  feasibilityConfidence: 'high' | 'medium' | 'low' | 'critical_unknown';
  lastVerificationAt: string | null;
  places: SeedPlace[];
}

export const SEED_QUESTS: SeedQuest[] = [
  {
    // Acceptance scenario 1: guest in Boston finds an open, low-cost
    // two-hour museum/walking quest and sees time/cost/tier/confidence/accessibility.
    title: 'Three Wonders of the MFA',
    plainSummary: 'A guided-by-you walk through three standout galleries at the Museum of Fine Arts.',
    narratedDescription:
      'The Halls of Lore hold treasures beyond counting. Seek out three wonders within these walls and let their stories unfold.',
    guildKey: 'halls_of_lore',
    tags: ['indoor', 'historical', 'beginner', 'wheelchair-accessible'],
    originType: 'quest_board_curated',
    trustBadges: ['Quest Board Curated', 'Recently Confirmed'],
    overallTier: 'novice',
    factorScores: {
      time_commitment: 2, physical_effort: 1, mental_challenge: 2, travel_complexity: 1,
      cost_burden: 2, preparation: 1, required_skill: 1, objective_complexity: 1, group_coordination: 1,
    },
    audience: 'any',
    durationMinMinutes: 90,
    durationMaxMinutes: 150,
    costMinCents: 0,
    costMaxCents: 2500,
    travelMode: 'walk',
    physicalIntensity: 1,
    mentalIntensity: 2,
    riskRating: 'low',
    accessibilityProfile: {
      wheelchair: 'confirmed', low_walking: 'confirmed', sensory_friendly: 'reported',
      service_animal: 'confirmed', restroom_access: 'confirmed',
    },
    ageRestrictions: { min_age: null, adult_content: false, alcohol: false, gambling: false },
    structureType: 'checklist',
    objectives: [
      'Find a gallery from a country you have never visited',
      'Locate the oldest object on public display',
      'Pick one piece you would take home and say why',
    ],
    completionMethods: ['honor_system', 'photo'],
    requiredEquipment: [],
    safetyNotes: 'Standard museum conduct rules apply; wheelchairs and strollers welcome throughout.',
    feasibilityConfidence: 'high',
    lastVerificationAt: '2026-08-01T00:00:00Z',
    places: [{ role: 'primary', placeName: 'Museum of Fine Arts, Boston', lat: 42.3394, lng: -71.0942 }],
  },
  {
    title: "Trace the Freedom Trail's Hidden Corners",
    plainSummary: 'A self-paced walk along the Freedom Trail, looking for details most visitors miss.',
    narratedDescription:
      'Every cobblestone here has seen history turn. Walk the red line and find what the crowds pass by.',
    guildKey: 'roads_and_realms',
    tags: ['outdoor', 'historical', 'free', 'open-now'],
    originType: 'community',
    trustBadges: ['Community Verified'],
    overallTier: 'adventurer',
    factorScores: {
      time_commitment: 3, physical_effort: 3, mental_challenge: 2, travel_complexity: 2,
      cost_burden: 1, preparation: 1, required_skill: 1, objective_complexity: 2, group_coordination: 1,
    },
    audience: 'any',
    durationMinMinutes: 120,
    durationMaxMinutes: 180,
    costMinCents: 0,
    costMaxCents: 0,
    travelMode: 'walk',
    physicalIntensity: 3,
    mentalIntensity: 2,
    riskRating: 'low',
    accessibilityProfile: {
      wheelchair: 'partially', low_walking: 'not_accessible', sensory_friendly: 'unknown',
      service_animal: 'confirmed', restroom_access: 'reported',
    },
    ageRestrictions: { min_age: null, adult_content: false, alcohol: false, gambling: false },
    structureType: 'multi_location_route',
    objectives: ['Find the oldest surviving building on the route', 'Photograph three markers you have never noticed before'],
    completionMethods: ['honor_system', 'photo', 'gps'],
    requiredEquipment: ['comfortable walking shoes'],
    safetyNotes: 'Crosses several active streets; watch for traffic at unmarked crossings. Uneven cobblestone sidewalks in places.',
    feasibilityConfidence: 'high',
    lastVerificationAt: '2026-07-15T00:00:00Z',
    places: [{ role: 'primary', placeName: 'Boston Common (Freedom Trail start)', lat: 42.3551, lng: -71.0657 }],
  },
  {
    // Acceptance scenario 2: rural user gets county-level nature options
    // without fabricated venue details — confidence is medium, not high,
    // and accessibility is honestly unknown rather than assumed.
    title: 'Quabbin Reservoir Overlook Watch',
    plainSummary: 'Find a quiet overlook near the Quabbin Reservoir and spend some time watching for wildlife.',
    narratedDescription:
      'Far from the city, the Wilds keep their own counsel. Find a place to sit still, and see what reveals itself.',
    guildKey: 'the_wilds',
    tags: ['outdoor', 'free', 'solo'],
    originType: 'community',
    trustBadges: ['Community Created', 'Conditions Uncertain'],
    overallTier: 'novice',
    factorScores: {
      time_commitment: 2, physical_effort: 2, mental_challenge: 1, travel_complexity: 3,
      cost_burden: 1, preparation: 2, required_skill: 1, objective_complexity: 1, group_coordination: 1,
    },
    audience: 'any',
    durationMinMinutes: 60,
    durationMaxMinutes: 120,
    costMinCents: 0,
    costMaxCents: 0,
    travelMode: 'drive',
    physicalIntensity: 2,
    mentalIntensity: 1,
    riskRating: 'moderate',
    accessibilityProfile: {
      wheelchair: 'unknown', low_walking: 'unknown', sensory_friendly: 'unknown',
      service_animal: 'unknown', restroom_access: 'unknown',
    },
    ageRestrictions: { min_age: null, adult_content: false, alcohol: false, gambling: false },
    structureType: 'open_ended_challenge',
    objectives: ['Spend at least 20 minutes observing quietly', 'Note three signs of wildlife (tracks, calls, nests, etc.)'],
    completionMethods: ['honor_system'],
    requiredEquipment: ['weather-appropriate clothing'],
    safetyNotes:
      'Rural area with limited cell service and no on-site staff — exact parking/trail access is community-reported, not independently verified. Tell someone your plans.',
    feasibilityConfidence: 'medium',
    lastVerificationAt: '2026-06-20T00:00:00Z',
    places: [{ role: 'primary', placeName: 'Quabbin Reservoir (Enfield Lookout area)', lat: 42.3084, lng: -72.3237 }],
  },
  {
    // Acceptance scenario 3: family rainy-day pantry activity, no location.
    title: 'Pantry Alchemy: One-Pot Surprise',
    plainSummary: 'Turn whatever is already in your kitchen into a one-pot dinner, together.',
    narratedDescription:
      'The Hearth asks no permission to begin. Gather what you have, and see what magic your pantry holds.',
    guildKey: 'hearth_and_home',
    tags: ['rainy-day', 'family', 'indoor', 'free', 'beginner'],
    originType: 'quest_board_curated',
    trustBadges: ['Quest Board Curated'],
    overallTier: 'novice',
    factorScores: {
      time_commitment: 2, physical_effort: 1, mental_challenge: 2, travel_complexity: 1,
      cost_burden: 1, preparation: 1, required_skill: 2, objective_complexity: 2, group_coordination: 2,
    },
    audience: 'family',
    durationMinMinutes: 45,
    durationMaxMinutes: 90,
    costMinCents: 0,
    costMaxCents: 0,
    travelMode: null,
    physicalIntensity: 1,
    mentalIntensity: 2,
    riskRating: 'low',
    accessibilityProfile: {
      wheelchair: 'confirmed', low_walking: 'confirmed', sensory_friendly: 'reported',
      service_animal: 'confirmed', restroom_access: 'confirmed',
    },
    ageRestrictions: { min_age: null, adult_content: false, alcohol: false, gambling: false },
    structureType: 'checklist',
    objectives: [
      'Pick 5 pantry/fridge items without buying anything new',
      'Assign each family member one cooking task',
      'Name the dish together before eating it',
    ],
    completionMethods: ['honor_system', 'photo'],
    requiredEquipment: ['a pot', 'a stove'],
    safetyNotes: 'Adult supervision required for stovetop use with children.',
    feasibilityConfidence: 'high',
    lastVerificationAt: null,
    places: [],
  },
  {
    // Acceptance scenario 4: wheelchair user requests a date activity;
    // unknown accessibility must not be presented as confirmed.
    title: 'Riverside Sculpture Stroll for Two',
    plainSummary: 'An easy riverside walk past public art along the Charles River Esplanade.',
    narratedDescription:
      'The river remembers every couple who has walked beside it. Add your own quiet chapter.',
    guildKey: 'the_revels',
    tags: ['date-night', 'outdoor', 'free', 'low-walking'],
    originType: 'community',
    trustBadges: ['Community Created'],
    overallTier: 'novice',
    factorScores: {
      time_commitment: 2, physical_effort: 2, mental_challenge: 1, travel_complexity: 2,
      cost_burden: 1, preparation: 1, required_skill: 1, objective_complexity: 1, group_coordination: 1,
    },
    audience: 'couple',
    durationMinMinutes: 45,
    durationMaxMinutes: 75,
    costMinCents: 0,
    costMaxCents: 0,
    travelMode: 'walk',
    physicalIntensity: 2,
    mentalIntensity: 1,
    riskRating: 'low',
    accessibilityProfile: {
      // Deliberately unknown, not assumed accessible — this is the exact
      // case acceptance scenario 4 and Principle 10 are about.
      wheelchair: 'unknown', low_walking: 'reported', sensory_friendly: 'unknown',
      service_animal: 'unknown', restroom_access: 'unknown',
    },
    ageRestrictions: { min_age: null, adult_content: false, alcohol: false, gambling: false },
    structureType: 'single_objective',
    objectives: ['Walk the esplanade path and find your favorite sculpture', 'Watch the river for at least 10 minutes'],
    completionMethods: ['honor_system'],
    requiredEquipment: [],
    safetyNotes: 'Paved path condition and curb-cut access have not been independently verified for wheelchair use.',
    feasibilityConfidence: 'medium',
    lastVerificationAt: '2026-05-01T00:00:00Z',
    places: [{ role: 'primary', placeName: 'Charles River Esplanade', lat: 42.3565, lng: -71.0798 }],
  },
  {
    // Acceptance scenario 5: age-restricted content, excluded by default
    // from discovery unless a caller explicitly opts in.
    title: 'Brewery Flight & Trivia Night',
    plainSummary: 'Sample a tasting flight and take on a local trivia night at a Boston brewery.',
    narratedDescription: 'The Revels never sleep. Raise a glass, sharpen your wit, and see who claims the crown.',
    guildKey: 'the_revels',
    tags: ['alcohol', 'mature', 'reservation-required'],
    originType: 'business_verified',
    trustBadges: ['Business Verified'],
    overallTier: 'novice',
    factorScores: {
      time_commitment: 2, physical_effort: 1, mental_challenge: 2, travel_complexity: 1,
      cost_burden: 2, preparation: 1, required_skill: 1, objective_complexity: 1, group_coordination: 2,
    },
    audience: 'any',
    durationMinMinutes: 90,
    durationMaxMinutes: 120,
    costMinCents: 2000,
    costMaxCents: 4000,
    travelMode: 'any',
    physicalIntensity: 1,
    mentalIntensity: 2,
    riskRating: 'low',
    accessibilityProfile: {
      wheelchair: 'confirmed', low_walking: 'confirmed', sensory_friendly: 'not_accessible',
      service_animal: 'confirmed', restroom_access: 'confirmed',
    },
    ageRestrictions: { min_age: 21, adult_content: true, alcohol: true, gambling: false },
    structureType: 'competitive_race',
    objectives: ['Complete the tasting flight', 'Place in the top 3 of trivia night'],
    completionMethods: ['host_approval'],
    requiredEquipment: ['valid ID'],
    safetyNotes: 'Age-restricted per Massachusetts law (21+). Drink responsibly; arrange a sober ride home.',
    feasibilityConfidence: 'high',
    lastVerificationAt: '2026-08-10T00:00:00Z',
    places: [{ role: 'primary', placeName: 'Sample Boston Brewery (fixture)', lat: 42.3467, lng: -71.0972 }],
  },
  {
    // First content for trials_of_might — previously empty. No fixed venue
    // by design: this guild is about the activity, not a place, so honest
    // accessibility/location fields are genuinely null/unknown rather than
    // a fabricated stand-in address.
    title: 'Sunrise 5K Challenge',
    plainSummary: 'Run or walk 5 kilometers before 8am, anywhere that works for you.',
    narratedDescription:
      'Trials of Might favor no one but the willing. Rise before the sun claims the sky, and cover the distance on your own two feet.',
    guildKey: 'trials_of_might',
    tags: ['outdoor', 'solo', 'free', 'beginner'],
    originType: 'quest_board_curated',
    trustBadges: ['Quest Board Curated'],
    overallTier: 'adventurer',
    factorScores: {
      time_commitment: 2, physical_effort: 4, mental_challenge: 2, travel_complexity: 1,
      cost_burden: 1, preparation: 2, required_skill: 1, objective_complexity: 1, group_coordination: 1,
    },
    audience: 'any',
    durationMinMinutes: 20,
    durationMaxMinutes: 60,
    costMinCents: 0,
    costMaxCents: 0,
    travelMode: null,
    physicalIntensity: 4,
    mentalIntensity: 2,
    riskRating: 'moderate',
    accessibilityProfile: {
      wheelchair: 'unknown', low_walking: 'not_accessible', sensory_friendly: 'unknown',
      service_animal: 'unknown', restroom_access: 'unknown',
    },
    ageRestrictions: { min_age: null, adult_content: false, alcohol: false, gambling: false },
    structureType: 'single_objective',
    objectives: ['Cover 5 kilometers (or 30+ minutes of continuous movement) before 8am', 'Note your time or distance at the end'],
    completionMethods: ['honor_system'],
    requiredEquipment: ['comfortable shoes'],
    safetyNotes: 'Route, terrain, and lighting conditions depend entirely on where you choose to go — check conditions yourself before heading out in the dark.',
    feasibilityConfidence: 'high',
    lastVerificationAt: null,
    places: [],
  },
  {
    // First content for the_makers_guild — previously empty.
    title: 'Golden Hour Photo Walk',
    plainSummary: 'Spend the hour before sunset capturing five photos that only that light makes possible.',
    narratedDescription:
      "The Maker's Guild sees what others walk past. Chase the light while it lasts, and bring back proof of what you found.",
    guildKey: 'the_makers_guild',
    tags: ['outdoor', 'solo', 'free', 'beginner'],
    originType: 'quest_board_curated',
    trustBadges: ['Quest Board Curated'],
    overallTier: 'novice',
    factorScores: {
      time_commitment: 1, physical_effort: 2, mental_challenge: 2, travel_complexity: 1,
      cost_burden: 1, preparation: 1, required_skill: 2, objective_complexity: 2, group_coordination: 1,
    },
    audience: 'any',
    durationMinMinutes: 30,
    durationMaxMinutes: 60,
    costMinCents: 0,
    costMaxCents: 0,
    travelMode: 'walk',
    physicalIntensity: 2,
    mentalIntensity: 2,
    riskRating: 'low',
    accessibilityProfile: {
      wheelchair: 'unknown', low_walking: 'unknown', sensory_friendly: 'unknown',
      service_animal: 'unknown', restroom_access: 'unknown',
    },
    ageRestrictions: { min_age: null, adult_content: false, alcohol: false, gambling: false },
    structureType: 'checklist',
    objectives: [
      'Photograph a long shadow',
      'Photograph something reflective catching the light',
      'Photograph a silhouette',
      'Photograph a texture you would normally ignore',
      'Pick your favorite and say why',
    ],
    completionMethods: ['photo'],
    requiredEquipment: ['a camera or phone'],
    safetyNotes: 'Stay aware of your surroundings while looking through a viewfinder, especially near roads or uneven ground.',
    feasibilityConfidence: 'high',
    lastVerificationAt: null,
    places: [],
  },
  {
    // First content for mysteries_and_mischief — previously empty.
    title: 'Neighborhood Scavenger Hunt',
    plainSummary: 'Build your own scavenger hunt out of the block you already live on.',
    narratedDescription:
      'Mysteries and mischief hide in plain sight. Look closer at the streets you have already walked a hundred times.',
    guildKey: 'mysteries_and_mischief',
    tags: ['outdoor', 'family', 'free', 'beginner'],
    originType: 'community',
    trustBadges: ['Community Created'],
    overallTier: 'novice',
    factorScores: {
      time_commitment: 2, physical_effort: 2, mental_challenge: 2, travel_complexity: 1,
      cost_burden: 1, preparation: 1, required_skill: 1, objective_complexity: 2, group_coordination: 2,
    },
    audience: 'family',
    durationMinMinutes: 30,
    durationMaxMinutes: 60,
    costMinCents: 0,
    costMaxCents: 0,
    travelMode: 'walk',
    physicalIntensity: 2,
    mentalIntensity: 2,
    riskRating: 'low',
    accessibilityProfile: {
      wheelchair: 'unknown', low_walking: 'unknown', sensory_friendly: 'unknown',
      service_animal: 'unknown', restroom_access: 'unknown',
    },
    ageRestrictions: { min_age: null, adult_content: false, alcohol: false, gambling: false },
    structureType: 'checklist',
    objectives: [
      'Find something older than you',
      'Find something with a number painted on it',
      'Find an animal that is not a pet',
      'Find a door you have never noticed before',
    ],
    completionMethods: ['honor_system', 'photo'],
    requiredEquipment: [],
    safetyNotes: 'Stay on sidewalks and obey traffic signals; adult supervision recommended for children.',
    feasibilityConfidence: 'high',
    lastVerificationAt: null,
    places: [],
  },
  {
    // First content for deeds_of_fellowship — previously empty.
    title: 'One Hour for Your Neighbors',
    plainSummary: 'Spend one hour doing something useful for someone near you who did not ask for it.',
    narratedDescription:
      'Fellowship is a deed, not a feeling. Find one hour, and one neighbor, and close the distance between you.',
    guildKey: 'deeds_of_fellowship',
    tags: ['solo', 'free', 'beginner'],
    originType: 'quest_board_curated',
    trustBadges: ['Quest Board Curated'],
    overallTier: 'novice',
    factorScores: {
      time_commitment: 2, physical_effort: 2, mental_challenge: 1, travel_complexity: 1,
      cost_burden: 1, preparation: 1, required_skill: 1, objective_complexity: 1, group_coordination: 2,
    },
    audience: 'any',
    durationMinMinutes: 60,
    durationMaxMinutes: 90,
    costMinCents: 0,
    costMaxCents: 0,
    travelMode: null,
    physicalIntensity: 2,
    mentalIntensity: 1,
    riskRating: 'low',
    accessibilityProfile: {
      wheelchair: 'unknown', low_walking: 'unknown', sensory_friendly: 'unknown',
      service_animal: 'unknown', restroom_access: 'unknown',
    },
    ageRestrictions: { min_age: null, adult_content: false, alcohol: false, gambling: false },
    structureType: 'open_ended_challenge',
    objectives: [
      'Pick one neighbor, relative, or nearby stranger who could use an hour of help',
      'Do the task without expecting anything back',
    ],
    completionMethods: ['honor_system'],
    requiredEquipment: [],
    safetyNotes: 'Use your own judgment about who to approach and what tasks are appropriate; never enter a stranger’s home alone.',
    feasibilityConfidence: 'high',
    lastVerificationAt: null,
    places: [],
  },
  {
    // First content for the_daily_path — previously empty. Multi-day by
    // nature; structureType reflects a run of small repeated objectives
    // rather than one checklist completed in a single sitting.
    title: 'Seven-Day Streak Starter',
    plainSummary: 'Pick one small habit and do it every day for a week.',
    narratedDescription:
      'The Daily Path is walked one step at a time. Choose a single step you can repeat, and repeat it until it holds.',
    guildKey: 'the_daily_path',
    tags: ['solo', 'free', 'beginner', 'multi-day'],
    originType: 'quest_board_curated',
    trustBadges: ['Quest Board Curated'],
    overallTier: 'novice',
    factorScores: {
      time_commitment: 3, physical_effort: 1, mental_challenge: 2, travel_complexity: 1,
      cost_burden: 1, preparation: 1, required_skill: 1, objective_complexity: 1, group_coordination: 1,
    },
    audience: 'any',
    durationMinMinutes: 10,
    durationMaxMinutes: 20,
    costMinCents: 0,
    costMaxCents: 0,
    travelMode: null,
    physicalIntensity: 1,
    mentalIntensity: 2,
    riskRating: 'low',
    accessibilityProfile: {
      wheelchair: 'confirmed', low_walking: 'confirmed', sensory_friendly: 'confirmed',
      service_animal: 'confirmed', restroom_access: 'confirmed',
    },
    ageRestrictions: { min_age: null, adult_content: false, alcohol: false, gambling: false },
    structureType: 'multi_day_streak',
    objectives: [
      'Choose one small habit (e.g. 10 pushups, a page of reading, a made bed)',
      'Complete it 7 days in a row',
      'Note which day was hardest and why',
    ],
    completionMethods: ['honor_system'],
    requiredEquipment: [],
    safetyNotes: null,
    feasibilityConfidence: 'high',
    lastVerificationAt: null,
    places: [],
  },
  {
    // First content for festivals_and_omens — previously empty.
    // Weather/season-triggered rather than schedulable; confidence is
    // medium since completability depends on conditions outside anyone's
    // control, not on unverified venue details.
    title: 'First Snow Ritual',
    plainSummary: "Step outside within an hour of the season's first real snowfall and mark the moment.",
    narratedDescription:
      'Festivals and Omens answer to the sky, not the calendar. When the first snow falls, the Realm asks only that you notice.',
    guildKey: 'festivals_and_omens',
    tags: ['outdoor', 'free', 'solo', 'family'],
    originType: 'community',
    trustBadges: ['Community Created', 'Conditions Uncertain'],
    overallTier: 'novice',
    factorScores: {
      time_commitment: 1, physical_effort: 1, mental_challenge: 1, travel_complexity: 1,
      cost_burden: 1, preparation: 1, required_skill: 1, objective_complexity: 1, group_coordination: 1,
    },
    audience: 'any',
    durationMinMinutes: 10,
    durationMaxMinutes: 30,
    costMinCents: 0,
    costMaxCents: 0,
    travelMode: null,
    physicalIntensity: 1,
    mentalIntensity: 1,
    riskRating: 'low',
    accessibilityProfile: {
      wheelchair: 'unknown', low_walking: 'unknown', sensory_friendly: 'unknown',
      service_animal: 'unknown', restroom_access: 'unknown',
    },
    ageRestrictions: { min_age: null, adult_content: false, alcohol: false, gambling: false },
    structureType: 'open_ended_challenge',
    objectives: ['Go outside within an hour of the first snow sticking to the ground', 'Catch a snowflake and actually look at it'],
    completionMethods: ['honor_system', 'photo'],
    requiredEquipment: ['warm clothing'],
    safetyNotes: 'Watch for ice on steps and walkways during first snowfall.',
    feasibilityConfidence: 'medium',
    lastVerificationAt: null,
    places: [],
  },
  {
    // First content for the_unknown — previously empty. Deliberately
    // meta/cross-category, matching the guild's own description.
    title: 'Roll the Dice: Random Adventure',
    plainSummary: 'Let chance pick your next quest guild, then do whatever that guild suggests.',
    narratedDescription:
      'The Unknown makes no promises and keeps no rules. Hand it the choice, and see where it points.',
    guildKey: 'the_unknown',
    tags: ['solo', 'free', 'beginner'],
    originType: 'quest_board_curated',
    trustBadges: ['Quest Board Curated'],
    overallTier: 'novice',
    factorScores: {
      time_commitment: 2, physical_effort: 1, mental_challenge: 2, travel_complexity: 1,
      cost_burden: 1, preparation: 1, required_skill: 1, objective_complexity: 2, group_coordination: 1,
    },
    audience: 'any',
    durationMinMinutes: 15,
    durationMaxMinutes: 60,
    costMinCents: 0,
    costMaxCents: 0,
    travelMode: null,
    physicalIntensity: 1,
    mentalIntensity: 2,
    riskRating: 'low',
    accessibilityProfile: {
      wheelchair: 'unknown', low_walking: 'unknown', sensory_friendly: 'unknown',
      service_animal: 'unknown', restroom_access: 'unknown',
    },
    ageRestrictions: { min_age: null, adult_content: false, alcohol: false, gambling: false },
    structureType: 'open_ended_challenge',
    objectives: [
      'Number the other 11 guilds 1 through 11 and roll a die (or use a random number generator) to pick one',
      'Do the smallest possible activity that fits that guild',
    ],
    completionMethods: ['honor_system'],
    requiredEquipment: [],
    safetyNotes: null,
    feasibilityConfidence: 'high',
    lastVerificationAt: null,
    places: [],
  },
  {
    // Heroic-tier example — every other seed quest so far is novice or
    // adventurer. Real, well-known public trail referenced generically
    // (no fabricated hours/pricing/amenity claims); confidence is medium
    // because exact trail-surface conditions are not independently
    // verified, not because the location itself is in doubt.
    title: 'Cape Cod Rail Trail: End to End',
    plainSummary: 'Cycle the full length of the Cape Cod Rail Trail in a single outing.',
    narratedDescription:
      'Roads and Realms reward those who go the distance. Twenty-two miles of paved trail stand between you and the far end of the Cape.',
    guildKey: 'roads_and_realms',
    tags: ['outdoor', 'multi-day', 'beginner'],
    originType: 'community',
    trustBadges: ['Community Verified'],
    overallTier: 'heroic',
    factorScores: {
      time_commitment: 4, physical_effort: 5, mental_challenge: 2, travel_complexity: 3,
      cost_burden: 2, preparation: 3, required_skill: 2, objective_complexity: 2, group_coordination: 1,
    },
    audience: 'any',
    durationMinMinutes: 150,
    durationMaxMinutes: 300,
    costMinCents: 0,
    costMaxCents: 3000,
    travelMode: 'cycle',
    physicalIntensity: 5,
    mentalIntensity: 2,
    riskRating: 'moderate',
    accessibilityProfile: {
      wheelchair: 'not_accessible', low_walking: 'not_accessible', sensory_friendly: 'unknown',
      service_animal: 'unknown', restroom_access: 'reported',
    },
    ageRestrictions: { min_age: null, adult_content: false, alcohol: false, gambling: false },
    structureType: 'multi_location_route',
    objectives: ['Ride the full paved trail from South Dennis to Wellfleet (or back)', 'Stop at least once to actually look at the scenery instead of just riding through it'],
    completionMethods: ['honor_system', 'gps', 'photo'],
    requiredEquipment: ['bicycle', 'helmet', 'water'],
    safetyNotes: 'Shared-use paved trail with pedestrians, other cyclists, and road crossings at several points. Bike rental cost, if any, is not included in cost estimate.',
    feasibilityConfidence: 'medium',
    lastVerificationAt: '2026-06-01T00:00:00Z',
    places: [{ role: 'primary', placeName: 'Cape Cod Rail Trail (South Dennis trailhead)', lat: 41.7292, lng: -70.1725 }],
  },
];
