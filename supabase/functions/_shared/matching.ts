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
  // Every member (including wildcard) must share at least one game with the caller
  const eligible = pool.filter((c) => sharesGame(caller, c));
  if (eligible.length < 2) return null;
  const scored = eligible
    .map((c) => ({ c, score: jaccard(caller, c) }))
    .sort((x, y) => y.score - x.score || x.c.createdAt.localeCompare(y.c.createdAt));
  const others = Math.min(maxOthers, scored.length);
  const wildcards = others >= 3 ? 1 : 0;
  const close = scored.slice(0, others - wildcards);
  const wild = wildcards ? [scored[scored.length - 1]] : [];
  const picks: Pick[] = [
    { id: caller.id, score: 1, isWildcard: false },
    ...close.map(({ c, score }) => ({ id: c.id, score, isWildcard: false })),
    ...wild.map(({ c, score }) => ({ id: c.id, score, isWildcard: true })),
  ];
  // Games every member of the squad plays (caller + all picks)
  const allMembers = [caller, ...close.map(({ c }) => c), ...wild.map(({ c }) => c)];
  const commonGames = allMembers.reduce<string[]>(
    (acc, m) => acc.filter((g) => m.games.includes(g)),
    caller.games,
  );
  return { picks, commonGames };
}
