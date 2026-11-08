export type Candidate = { id: string; games: string[]; hobbies: string[]; createdAt: string };
export type Pick = { id: string; score: number; isWildcard: boolean };
export type SquadResult = { picks: Pick[]; commonGames: string[] };

const tags = (c: Candidate) =>
  new Set([...c.games.map((g) => `g:${g}`), ...c.hobbies.map((h) => `h:${h}`)]);

export function jaccard(a: Candidate, b: Candidate): number {
  const A = tags(a), B = tags(b);
  const shared = [...A].filter((t) => B.has(t)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : shared / union;
}

export function sharesGame(a: Candidate, b: Candidate): boolean {
  return a.games.some((g) => b.games.includes(g));
}

export function buildSquad(caller: Candidate, pool: Candidate[], maxOthers = 4): SquadResult | null {
  const scored = pool
    .filter((c) => sharesGame(caller, c))
    .map((c) => ({ c, score: jaccard(caller, c) }))
    .sort((x, y) => y.score - x.score || x.c.createdAt.localeCompare(y.c.createdAt));

  // Games the whole squad plays so far. We only add someone if this stays non-empty,
  // so every member (wildcard included) is guaranteed at least one game in common.
  let commonGames = caller.games;
  const keepsCommon = (c: Candidate) => commonGames.some((g) => c.games.includes(g));
  const add = (c: Candidate) => { commonGames = commonGames.filter((g) => c.games.includes(g)); };

  // Closest matches first, up to 3
  const close: { c: Candidate; score: number }[] = [];
  for (const s of scored) {
    if (close.length === maxOthers - 1) break;
    if (keepsCommon(s.c)) { close.push(s); add(s.c); }
  }
  if (close.length < 2) return null;

  // Wildcard: the lowest-scoring remaining person who still shares the squad's game
  const rest = scored.filter((s) => !close.includes(s)).reverse();
  let wild = rest.find((s) => keepsCommon(s.c));
  if (wild) add(wild.c);
  // Only 3 others available: the furthest of them becomes the wildcard
  else if (close.length === 3) wild = close.pop();

  const picks: Pick[] = [
    { id: caller.id, score: 1, isWildcard: false },
    ...close.map(({ c, score }) => ({ id: c.id, score, isWildcard: false })),
    ...(wild ? [{ id: wild.c.id, score: wild.score, isWildcard: true }] : []),
  ];
  return { picks, commonGames };
}
