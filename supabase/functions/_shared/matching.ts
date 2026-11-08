export type Candidate = { id: string; games: string[]; hobbies: string[]; createdAt: string; isSeed: boolean };
export type Pick = { id: string; score: number; isWildcard: boolean };
export type SquadResult = { picks: Pick[]; commonGames: string[] };

// Every squad needs at least this many real (non-seed) people, so a demo always
// puts two real devices together and seeds are only ever filler.
export const MIN_REAL_MEMBERS = 2;

// Scores are hobbies only: games already decide who can be in a squad together
// (everyone must share one), so hobbies decide who fits best among them.
const tags = (c: Candidate) => new Set(c.hobbies);

export function jaccard(a: Candidate, b: Candidate): number {
  const A = tags(a), B = tags(b);
  const shared = [...A].filter((t) => B.has(t)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : shared / union;
}

export function sharesGame(a: Candidate, b: Candidate): boolean {
  return a.games.some((g) => b.games.includes(g));
}

// The longer the anchor has waited, the smaller a squad we accept,
// so people with unusual tastes aren't stuck in the queue forever.
export function minOthersFor(waitedMs: number): number {
  const HOUR = 60 * 60 * 1000;
  if (waitedMs < HOUR) return 4;       // squad of 5
  if (waitedMs < 24 * HOUR) return 3;  // squad of 4
  return 2;                            // squad of 3
}

// Builds a squad around the anchor (the longest-waiting real user), or returns null
// if this pool can't make a squad that meets the rules yet.
export function buildSquad(
  anchor: Candidate,
  pool: Candidate[],
  minOthers = 2,
  maxOthers = 4,
): SquadResult | null {
  // Real people first, then seeds; within each group, closest match first
  // (ties go to whoever signed up first)
  const scored = pool
    .filter((c) => sharesGame(anchor, c))
    .map((c) => ({ c, score: jaccard(anchor, c) }))
    .sort((x, y) =>
      Number(x.c.isSeed) - Number(y.c.isSeed) ||
      y.score - x.score ||
      x.c.createdAt.localeCompare(y.c.createdAt));

  // Games the whole squad plays so far. We only add someone if this stays non-empty,
  // so every member (wildcard included) is guaranteed at least one game in common.
  let commonGames = anchor.games;
  const keepsCommon = (c: Candidate) => commonGames.some((g) => c.games.includes(g));
  const add = (c: Candidate) => { commonGames = commonGames.filter((g) => c.games.includes(g)); };

  // Close matches first, up to 3
  const close: { c: Candidate; score: number }[] = [];
  for (const s of scored) {
    if (close.length === maxOthers - 1) break;
    if (keepsCommon(s.c)) { close.push(s); add(s.c); }
  }

  // Wildcard: the lowest-scoring remaining person who still shares the squad's game
  const rest = scored.filter((s) => !close.includes(s)).sort((x, y) => x.score - y.score);
  let wild = rest.find((s) => keepsCommon(s.c));
  if (wild) add(wild.c);
  // Only 3 others available: the furthest of them becomes the wildcard
  else if (close.length === 3) wild = close.pop();

  const members = [anchor, ...close.map((s) => s.c), ...(wild ? [wild.c] : [])];
  const others = members.length - 1;
  const real = members.filter((m) => !m.isSeed).length;
  if (others < minOthers || real < MIN_REAL_MEMBERS) return null;

  const picks: Pick[] = [
    { id: anchor.id, score: 1, isWildcard: false },
    ...close.map(({ c, score }) => ({ id: c.id, score, isWildcard: false })),
    ...(wild ? [{ id: wild.c.id, score: wild.score, isWildcard: true }] : []),
  ];
  return { picks, commonGames };
}
