// Run with: deno test supabase/functions/_shared/starters_test.ts
// node:assert is built into Deno, so these tests need no downloads.
import assert from 'node:assert/strict';
import { buildPrompt, pickFromBank, pickSpotlight, STARTER_BANK, validateStarter } from './starters.ts';

const opts = { hobby: 'rock-climbing', memberNames: ['Neon Viper', 'Al'] };
const reply = (obj: unknown) => JSON.stringify(obj);

Deno.test('validateStarter accepts a good question', () => {
  const r = validateStarter(reply({ kind: 'question', text: "What's your favorite way to be active?", answer: null }), opts);
  assert.deepEqual(r, { ok: true, starter: { kind: 'question', text: "What's your favorite way to be active?", answer: null } });
});

Deno.test('validateStarter rejects text that names the spotlight hobby (slug or label)', () => {
  const slug = validateStarter(reply({ kind: 'question', text: 'Anyone into rock-climbing?', answer: null }), opts);
  const label = validateStarter(reply({ kind: 'question', text: 'Who here likes Rock Climbing?', answer: null }), opts);
  assert.deepEqual(slug, { ok: false, reason: 'names the spotlight hobby' });
  assert.deepEqual(label, { ok: false, reason: 'names the spotlight hobby' });
});

Deno.test('validateStarter rejects a riddle whose answer is the hobby', () => {
  const r = validateStarter(reply({ kind: 'riddle', text: 'You go up a wall with chalk. What is it?', answer: 'Rock climbing' }), opts);
  assert.equal(r.ok, false);
});

Deno.test('validateStarter rejects member names as whole words only', () => {
  assert.equal(validateStarter(reply({ kind: 'question', text: 'Neon Viper, what do you do for fun?', answer: null }), opts).ok, false);
  assert.equal(validateStarter(reply({ kind: 'question', text: 'Hey al, what do you do for fun?', answer: null }), opts).ok, false);
  // "really" contains "al" but isn't the name
  assert.equal(validateStarter(reply({ kind: 'question', text: 'What really helps you relax?', answer: null }), opts).ok, true);
});

Deno.test('validateStarter strips ``` fences', () => {
  const r = validateStarter('```json\n{"kind":"question","text":"Best snack for a long session?","answer":null}\n```', opts);
  assert.equal(r.ok, true);
});

Deno.test('validateStarter rejects bad output', () => {
  assert.equal(validateStarter(null, opts).ok, false);
  assert.equal(validateStarter('not json at all', opts).ok, false);
  assert.equal(validateStarter(reply({ kind: 'poem', text: 'hi', answer: null }), opts).ok, false);
  assert.equal(validateStarter(reply({ kind: 'question', text: '', answer: null }), opts).ok, false);
  assert.equal(validateStarter(reply({ kind: 'question', text: 'x'.repeat(301), answer: null }), opts).ok, false);
  assert.equal(validateStarter(reply({ kind: 'riddle', text: 'What am I?', answer: '' }), opts).ok, false);
});

Deno.test('pickSpotlight picks the least recently spotlighted member and an unused hobby', () => {
  const members = [
    { id: 'a', hobbies: ['baking', 'reading'] },
    { id: 'b', hobbies: ['rock-climbing', 'photography'] },
  ];
  const past = [
    { userId: 'a', hobby: 'baking', createdAt: '2026-11-08T10:00:00Z' },
    { userId: 'b', hobby: 'rock-climbing', createdAt: '2026-11-07T10:00:00Z' },
  ];
  assert.deepEqual(pickSpotlight(members, past, () => 0), { userId: 'b', hobby: 'photography' });
  // Never spotlighted beats everyone
  assert.equal(pickSpotlight([...members, { id: 'c', hobbies: ['gym'] }], past, () => 0)?.userId, 'c');
  assert.equal(pickSpotlight([{ id: 'x', hobbies: [] }], []), null);
});

Deno.test('buildPrompt numbers members and never includes ids', () => {
  const p = buildPrompt({
    commonGames: ['minecraft'],
    members: [{ id: 'secret-uuid', hobbies: ['baking'] }],
    spotlightHobby: 'baking',
    recentStarters: [],
  });
  assert.equal(p, 'Shared games: minecraft\nMembers:\n- Member 1: baking\nSPOTLIGHT hobby: baking');
});

Deno.test('pickFromBank skips starters the squad already had', () => {
  const allButLast = STARTER_BANK.slice(0, -1).map((s) => s.text);
  assert.equal(pickFromBank(allButLast, () => 0), STARTER_BANK.at(-1));
});
