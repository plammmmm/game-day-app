// Run: node docs/test/slate.test.cjs   (from repo root)
const assert = require("node:assert/strict");
const S = require("../slate.js");
const sample = require("../data/sample-odds.json");

let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok -", name); };
const pulled = Date.parse("2026-11-08T18:17:00Z");

t("today's slate on Sunday noon = 12 Sunday games, live sorted last", () => {
  const s = S.pickSlate(sample.games, pulled);
  assert.equal(s.label, "Today");
  assert.equal(s.games.length, 12); // MNF is Monday
  const firstLive = s.games.findIndex((g) => g.live);
  assert.ok(s.games.slice(firstLive).every((g) => g.live));
});

t("Monday morning falls through to MNF as today's game", () => {
  const s = S.pickSlate(sample.games, Date.parse("2026-11-09T15:00:00Z"));
  assert.equal(s.label, "Today"); assert.equal(s.games.length, 1); assert.equal(s.games[0].home, "MIN");
});

t("Tuesday with no games shows the next slate", () => {
  const future = sample.games.map((g) => ({ ...g, kickoff: "2026-11-15T18:00:00Z", live: false }));
  const s = S.pickSlate(future, Date.parse("2026-11-10T15:00:00Z"));
  assert.match(s.label, /^Next slate · Sunday, Nov 15/);
});

t("movement: home -3 -> -4.5 is -1.5; total 44 -> 45.5 is +1.5", () => {
  assert.deepEqual(S.movement({ spreadHome: -3, total: 44 }, { spreadHome: -4.5, total: 45.5 }), { spread: -1.5, total: 1.5 });
  assert.equal(S.movement(undefined, { spreadHome: -3 }), null);
});

t("best price: best number first, then best price", () => {
  const b = S.bestPrices([
    { book: "a", spread: { home: -3, homePrice: -110, away: 3, awayPrice: -110 }, total: { points: 44, overPrice: -110, underPrice: -110 }, ml: { home: -150, away: 130 } },
    { book: "b", spread: { home: -3, homePrice: -105, away: 3, awayPrice: -115 }, total: { points: 44.5, overPrice: -110, underPrice: -110 }, ml: { home: -140, away: 125 } },
    { book: "c", spread: { home: -3.5, homePrice: +100, away: 3.5, awayPrice: -120 }, total: { points: 43.5, overPrice: -115, underPrice: -105 }, ml: { home: -160, away: 135 } },
  ]);
  assert.deepEqual(b, { spreadHome: "b", spreadAway: "c", over: "c", under: "b", mlHome: "b", mlAway: "c" });
});

t("formatting", () => {
  assert.equal(S.fmtPrice(130), "+130"); assert.equal(S.fmtPrice(-110), "-110");
  assert.equal(S.fmtPoint(3.5), "+3.5"); assert.equal(S.fmtPoint(0), "PK");
  assert.equal(S.ctKickoff("2026-11-09T01:20:00Z"), "Sun 7:20 PM");
});

t("sample data has no API key or credits", () => {
  const raw = JSON.stringify(sample);
  assert.ok(!/apiKey/i.test(raw)); assert.equal(sample.credits, null);
});

console.log(`\n${n} checks passed.`);
