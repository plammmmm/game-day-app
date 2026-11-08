// Run: node worker/test/run.mjs   (from repo root)
// Uses a real NFL pull (2026-11-08 12:17 CT) rebuilt as Odds API JSON.
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import worker, { normalize, consensus, mergeOpeners } from "../src/index.js";

const events = JSON.parse(readFileSync(new URL("./fixture-events.json", import.meta.url)));
const pulledAt = Date.parse("2026-11-08T18:17:00Z");
const games = normalize(events, pulledAt);
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log("ok -", name); };

t("13 games, all teams mapped to abbreviations", () => {
  assert.equal(games.length, 13);
  for (const g of games) { assert.match(g.home, /^[A-Z]{2,3}$/); assert.match(g.away, /^[A-Z]{2,3}$/); }
});

t("games that already kicked off are marked live", () => {
  const live = games.filter((g) => g.live).length;
  assert.equal(live, 7); // 7 noon games had started at 12:17 CT
});

t("spread sides offset and totals parsed", () => {
  for (const g of games) for (const b of g.books) {
    if (b.spread) assert.equal(b.spread.home, -b.spread.away);
    if (b.total) assert.equal(typeof b.total.points, "number");
  }
});

t("US vs offshore books flagged", () => {
  const all = new Set(games.flatMap((g) => g.books.filter((b) => b.us).map((b) => b.book)));
  assert.deepEqual([...all].sort(), ["betmgm", "betrivers", "draftkings", "fanduel"]);
});

t("consensus uses US-book median", () => {
  const c = consensus([
    { us: true, spread: { home: -3 }, total: { points: 44 } },
    { us: true, spread: { home: -3.5 }, total: { points: 45 } },
    { us: true, spread: { home: -4 }, total: { points: 46 } },
    { us: false, spread: { home: -10 }, total: { points: 60 } },
  ]);
  assert.deepEqual(c, { spreadHome: -3.5, total: 45 });
});

t("openers: pre-kickoff games only, never overwritten, old ones pruned", () => {
  const nowIso = new Date(pulledAt).toISOString();
  const o1 = mergeOpeners({}, games, nowIso);
  assert.equal(Object.keys(o1).length, 6); // 13 games - 7 live
  const moved = games.map((g) => ({ ...g, consensus: { spreadHome: 99, total: 99 } }));
  const o2 = mergeOpeners(o1, moved, nowIso);
  for (const id of Object.keys(o1)) assert.equal(o2[id].spreadHome, o1[id].spreadHome);
  const later = new Date(pulledAt + 5 * 864e5).toISOString();
  assert.equal(Object.keys(mergeOpeners(o1, [], later)).length, 0);
});

// --- Worker routes with fake KV + fake fetch ---
function fakeKv() {
  const m = new Map();
  return { get: async (k, type) => (m.has(k) ? (type === "json" ? JSON.parse(m.get(k)) : m.get(k)) : null),
           put: async (k, v) => m.set(k, v), _m: m };
}
let apiCalls = 0, remaining = 500;
globalThis.fetch = async () => {
  apiCalls++; remaining -= 3;
  return new Response(JSON.stringify(events), { headers: { "x-requests-used": String(500 - remaining), "x-requests-remaining": String(remaining) } });
};
const env = { GAMEDAY_KV: fakeKv(), ODDS_API_KEY: "test" };
const call = async (path) => (await worker.fetch(new Request("https://w.dev" + path), env)).json();

const r1 = await call("/odds?sport=nfl");
const r2 = await call("/odds?sport=nfl");
t("second request inside 10 min is served from cache (0 credits)", () => {
  assert.equal(r1.cached, false); assert.equal(r2.cached, true); assert.equal(apiCalls, 1);
});

{
  env.GAMEDAY_KV._m.set("credits", JSON.stringify({ used: 400, remaining: 100 }));
  const latest = JSON.parse(env.GAMEDAY_KV._m.get("odds:nfl:latest"));
  latest.fetchedAt = "2026-01-01T00:00:00Z"; // stale
  env.GAMEDAY_KV._m.set("odds:nfl:latest", JSON.stringify(latest));
  const r3 = await call("/odds?sport=nfl");
  assert.equal(r3.paused, true); assert.equal(apiCalls, 1);
  passed++; console.log("ok - budget guard: at 80% used, serves stale cache with no API call");
}

t("API key never appears in a response", () => assert.ok(!JSON.stringify(r1).includes("apiKey")));

// Write sample data for the site's demo mode.
const sample = { ...r1, fetchedAt: new Date(pulledAt).toISOString(), credits: null, sample: true };
writeFileSync(new URL("../../docs/data/sample-odds.json", import.meta.url), JSON.stringify(sample));
console.log(`\n${passed} checks passed. Wrote docs/data/sample-odds.json`);
