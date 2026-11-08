// Conversation starters: pure functions only (no database, no network), so they're easy
// to test and explain. post-starter.ts does the loading, the LLM call and the inserts.
//
// Privacy: the LLM only ever sees "Member 1", "Member 2"... with their hobbies, plus the
// squad's shared games. Never names, ages, emails, avatars or ids. Display names are used
// here only to REJECT a starter that happens to contain one.

export type StarterMember = { id: string; hobbies: string[] };
export type PastSpotlight = { userId: string | null; hobby: string | null; createdAt: string };
export type Spotlight = { userId: string; hobby: string };
export type Starter = { kind: 'question' | 'riddle'; text: string; answer: string | null };

// Shown to judges as-is: this is everything the model is told about its job.
export const STARTER_SYSTEM_PROMPT = `You write one conversation starter for a small group of adult gamers who just met
through a friendship app. Your goal is to help them talk, not to quiz them.

Rules:
- Write ONE open question, or ONE short riddle, under 200 characters.
- Everyone in the group must be able to answer it, whatever their hobbies, so make it vague.
- It must give a person whose hobby is the SPOTLIGHT a natural opening to talk about it,
  by asking about a broader category the hobby belongs to.
- Never name the spotlight hobby, never refer to any member, and never say or hint that
  someone in the group has a particular interest, but don't be on the nose.
- Don't have possiible or example answers in the question.
- You may tie it to one of the shared games if that fits naturally.
- Keep it light and low-pressure. No health, body, money, politics, religion, dating,
  family or trauma. Nothing that assumes ability, wealth or location.
- Riddle should be intriguing and somewhat mysterious.
- Try change the sentence structure from previouse starters.
- Don't use em dashes.

GOOD examples (input, then the reply you should give):
 
Shared games: valorant, apex-legends
Members:
- Member 1: gym, anime
- Member 2: rock-climbing, photography
- Member 3: anime
SPOTLIGHT hobby: rock-climbing
{"kind":"question","text":"What's your favorite way to get moving when you're not gaming, and how did you get into it?","answer":null}
 
Shared games: stardew-valley
Members:
- Member 1: baking, reading
- Member 2: gardening
- Member 3: drawing, cooking
SPOTLIGHT hobby: gardening
{"kind":"question","text":"What's something you've slowly grown or built up over time that you're proud of?","answer":null}
 
Shared games: league-of-legends
Members:
- Member 1: poker, music-production
- Member 2: chess
- Member 3: anime, gym
SPOTLIGHT hobby: chess
{"kind":"question","text":"What's something people wrongly think they have to be a genius to be good at?","answer":null}
 
Shared games: league-of-legends, dota-2
Members:
- Member 1: poker
- Member 2: music-production, anime
- Member 3: chess
SPOTLIGHT hobby: poker
{"kind":"riddle","text":"You hold me close, tell everyone I'm amazing, then dump me the second things get hard. What am I?","answer":"A bad hand."}
 
Shared games: minecraft, terraria
Members:
- Member 1: hiking, drawing
- Member 2: cooking
- Member 3: reading
SPOTLIGHT hobby: drawing
{"kind":"question","text":"If you could design one new block or item for Minecraft, what would it look like and what would it do?","answer":null}
 
Shared games: minecraft
Members:
- Member 1: hiking
- Member 2: baking, gardening
- Member 3: gym
SPOTLIGHT hobby: hiking
{"kind":"riddle","text":"I go all the way up the mountain without breaking a sweat, and watched you cry the whole way. What am I?","answer":"The trail"}
 
Shared games: lethal-company
Members:
- Member 1: cooking, photography
- Member 2: anime
- Member 3: music-production
SPOTLIGHT hobby: cooking
{"kind":"question","text":"What's your go-to snack for a long gaming session?","answer":null}
 
Shared games: apex-legends
Members:
- Member 1: music-production
- Member 2: gym, anime
- Member 3: rock-climbing
SPOTLIGHT hobby: music-production
{"kind":"question","text":"What song or kind of music gets you locked in?","answer":null}
 
Shared games: animal-crossing
Members:
- Member 1: reading, baking
- Member 2: photography
- Member 3: gardening
SPOTLIGHT hobby: photography
{"kind":"question","text":"What are your most memorable life experiences? And why do you still remember them?","answer":null}
 
Shared games: valorant
Members:
- Member 1: anime, gym
- Member 2: reading
- Member 3: poker
SPOTLIGHT hobby: anime
{"kind":"question","text":"What's your favourite non-gaming pass time?","answer":null}
 
BAD examples (never write anything like these):
 
"What type of visual storytelling medium do you enjoy most—like comics, movies, or games?"
-> don't list possible answers.
 
"What’s a simple kitchen trick you love that turns everyday ingredients into something surprisingly tasty?"
-> Too obvious: obviously spotlighted on someone who likes cooking.
 
Reply with JSON only: {"kind":"question"|"riddle","text":"...","answer":null|"..."}`;

// Picks whose hobby the next starter is built around.
// 1. The member spotlighted least recently in this squad (never spotlighted = first).
//    Seeds count as members. Ties are broken at random so the first member isn't always picked.
// 2. One of their hobbies this squad hasn't had a starter about yet; if all used, any of theirs.
// Returns null if nobody in the squad has a hobby. `random` is injectable for tests.
export function pickSpotlight(
  members: StarterMember[],
  past: PastSpotlight[],
  random: () => number = Math.random,
): Spotlight | null {
  const candidates = members.filter((m) => m.hobbies.length > 0);
  if (candidates.length === 0) return null;

  // When each member was last spotlighted; '' (sorts first) means never
  const lastAt = (id: string) =>
    past.filter((p) => p.userId === id).map((p) => p.createdAt).sort().at(-1) ?? '';
  const oldest = candidates.map((m) => lastAt(m.id)).sort()[0];
  const tied = candidates.filter((m) => lastAt(m.id) === oldest);
  const member = pickRandom(tied, random);

  const usedHobbies = new Set(past.map((p) => p.hobby));
  const fresh = member.hobbies.filter((h) => !usedHobbies.has(h));
  const hobby = pickRandom(fresh.length > 0 ? fresh : member.hobbies, random);
  return { userId: member.id, hobby };
}

// The user message sent to the LLM. Members are numbered, never named.
export function buildPrompt(input: {
  commonGames: string[];
  members: StarterMember[];
  spotlightHobby: string;
  recentStarters: string[];
}): string {
  const lines = [
    `Shared games: ${input.commonGames.join(', ')}`,
    'Members:',
    ...input.members.map((m, i) => `- Member ${i + 1}: ${m.hobbies.join(', ')}`),
    `SPOTLIGHT hobby: ${input.spotlightHobby}`,
  ];
  if (input.recentStarters.length > 0) {
    lines.push('Avoid repeating these earlier starters:', ...input.recentStarters.map((t) => `- "${t}"`));
  }
  return lines.join('\n');
}

// Every option label equals its slug with spaces for hyphens ("rock-climbing" → "Rock climbing"),
// so we derive it instead of importing site/src/data/options.ts, which Edge Functions can't bundle.
export const hobbyLabel = (slug: string) => slug.replace(/-/g, ' ');

// Checks the LLM's reply. Returns the starter, or the reason it was rejected.
// Rejected = we use the hand-written bank instead, so a bad reply never reaches a chat.
export function validateStarter(
  raw: unknown,
  opts: { hobby: string; memberNames: string[] },
): { ok: true; starter: Starter } | { ok: false; reason: string } {
  if (typeof raw !== 'string') return { ok: false, reason: 'no content' };

  let parsed: unknown;
  try {
    // Models sometimes wrap JSON in ``` fences even when told not to
    parsed = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  } catch {
    return { ok: false, reason: 'not json' };
  }
  if (typeof parsed !== 'object' || parsed === null) return { ok: false, reason: 'not an object' };
  const { kind, text, answer } = parsed as Record<string, unknown>;

  if (kind !== 'question' && kind !== 'riddle') return { ok: false, reason: 'bad kind' };
  if (typeof text !== 'string') return { ok: false, reason: 'no text' };
  const cleanText = text.trim();
  if (cleanText.length < 1 || cleanText.length > 300) return { ok: false, reason: 'text length' };

  let cleanAnswer: string | null = null;
  if (kind === 'riddle') {
    if (typeof answer !== 'string' || answer.trim().length === 0) return { ok: false, reason: 'riddle without answer' };
    cleanAnswer = answer.trim().slice(0, 200);
  }

  // The answer is shown too (behind "Reveal answer"), so it's checked like the text.
  // A riddle whose answer is "rock climbing" would name the hobby just as much.
  const shown = `${cleanText}\n${cleanAnswer ?? ''}`.toLowerCase();
  const hobby = opts.hobby.toLowerCase();
  if (shown.includes(hobby) || shown.includes(hobbyLabel(hobby))) {
    return { ok: false, reason: 'names the spotlight hobby' };
  }
  // Names are matched as whole words, so a member called "Al" doesn't reject "really"
  for (const name of opts.memberNames) {
    if (name.trim() && containsWord(shown, name.trim().toLowerCase())) {
      return { ok: false, reason: 'names a member' };
    }
  }

  return { ok: true, starter: { kind, text: cleanText, answer: cleanAnswer } };
}

// Hand-written starters, used whenever the LLM is down, rate-limited, slow or says
// something we reject. General enough for any squad, so the demo never depends on Groq.
export const STARTER_BANK: Starter[] = [
  { kind: 'question', text: "What's something you got into recently that you didn't expect to enjoy?", answer: null },
  { kind: 'question', text: "What's your go-to way to unwind after a long day, besides gaming?", answer: null },
  { kind: 'question', text: 'If you could get instantly good at one new skill, what would it be?', answer: null },
  { kind: 'question', text: "What's a game soundtrack you'd happily listen to outside the game?", answer: null },
  { kind: 'question', text: "What's the first game you remember really falling for?", answer: null },
  { kind: 'question', text: 'Co-op or competitive: which brings out the best in you?', answer: null },
  { kind: 'question', text: "What's a small thing that reliably makes your week better?", answer: null },
  { kind: 'question', text: 'If your weekend had a loading screen tip, what would it say?', answer: null },
  { kind: 'question', text: "What's something you made, built or finished that you're quietly proud of?", answer: null },
  { kind: 'question', text: 'Which game world would you actually want to live in for a week?', answer: null },
  { kind: 'question', text: "What's a hobby you'd love to try if time weren't a thing?", answer: null },
  { kind: 'question', text: "What's the best tip someone ever gave you, in a game or out of one?", answer: null },
  { kind: 'question', text: 'Are you a plan-everything person or a figure-it-out-as-you-go person?', answer: null },
  { kind: 'question', text: "What's a game you think is underrated, and why should we try it?", answer: null },
  { kind: 'question', text: 'Morning person, night owl, or "depends on the patch notes"?', answer: null },
  { kind: 'question', text: "What's something you could talk about for an hour with zero prep?", answer: null },
  { kind: 'riddle', text: 'The more of me you take, the more you leave behind. What am I?', answer: 'Footsteps' },
  { kind: 'riddle', text: 'I have keys but open no locks, and space but no room. What am I?', answer: 'A keyboard' },
  { kind: 'riddle', text: 'What has to be broken before you can use it?', answer: 'An egg' },
  { kind: 'riddle', text: 'I go up and down but never move. What am I?', answer: 'A staircase' },
];

// A bank starter this squad hasn't had yet (matched by text); if it's had them all, any of them.
export function pickFromBank(pastTexts: string[], random: () => number = Math.random): Starter {
  const used = new Set(pastTexts);
  const fresh = STARTER_BANK.filter((s) => !used.has(s.text));
  return pickRandom(fresh.length > 0 ? fresh : STARTER_BANK, random);
}

function pickRandom<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

function containsWord(haystack: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'u').test(haystack);
}
