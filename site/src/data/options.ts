// The only games and hobbies a user can pick. Matching compares these slugs,
// and scripts/seed-data.json uses the same values, so don't rename one without the other.
export type Option = { value: string; label: string };

export const GAMES: Option[] = [
  { value: 'valorant', label: 'Valorant' },
  { value: 'cs2', label: 'Counter-Strike 2' },
  { value: 'apex-legends', label: 'Apex Legends' },
  { value: 'league-of-legends', label: 'League of Legends' },
  { value: 'dota-2', label: 'Dota 2' },
  { value: 'minecraft', label: 'Minecraft' },
  { value: 'terraria', label: 'Terraria' },
  { value: 'stardew-valley', label: 'Stardew Valley' },
  { value: 'animal-crossing', label: 'Animal Crossing' },
  { value: 'lethal-company', label: 'Lethal Company' },
  { value: 'chess', label: 'Chess' },
];

export const HOBBIES: Option[] = [
  { value: 'gym', label: 'Gym' },
  { value: 'anime', label: 'Anime' },
  { value: 'music-production', label: 'Music production' },
  { value: 'poker', label: 'Poker' },
  { value: 'chess', label: 'Chess' },
  { value: 'reading', label: 'Reading' },
  { value: 'drawing', label: 'Drawing' },
  { value: 'photography', label: 'Photography' },
  { value: 'cooking', label: 'Cooking' },
  { value: 'baking', label: 'Baking' },
  { value: 'gardening', label: 'Gardening' },
  { value: 'hiking', label: 'Hiking' },
  { value: 'rock-climbing', label: 'Rock climbing' },
];
