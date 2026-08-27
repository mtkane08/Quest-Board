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
];
