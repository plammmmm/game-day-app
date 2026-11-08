// Gameday Worker — v1.1
// Single file so it can be pasted into the Cloudflare dashboard editor (no Node needed).
//
// Bindings (Cloudflare dashboard → Worker → Settings):
//   KV namespace:  GAMEDAY_KV
//   Secret:        ODDS_API_KEY
//   Variables:     ALLOWED_ORIGIN, CACHE_SECONDS, MONTHLY_CREDITS, BUDGET_STOP_PCT (optional; defaults below)
//   Cron trigger:  0 14 * * *   (daily opener snapshot, 8am CT)

const SPORTS = { nfl: "americanfootball_nfl" };
const US_BOOKS = ["draftkings", "fanduel", "betmgm", "betrivers", "williamhill_us", "espnbet", "fanatics"];

const NFL_TEAMS = {
  "Arizona Cardinals": "ARI", "Atlanta Falcons": "ATL", "Baltimore Ravens": "BAL", "Buffalo Bills": "BUF",
  "Carolina Panthers": "CAR", "Chicago Bears": "CHI", "Cincinnati Bengals": "CIN", "Cleveland Browns": "CLE",
  "Dallas Cowboys": "DAL", "Denver Broncos": "DEN", "Detroit Lions": "DET", "Green Bay Packers": "GB",
  "Houston Texans": "HOU", "Indianapolis Colts": "IND", "Jacksonville Jaguars": "JAX", "Kansas City Chiefs": "KC",
  "Las Vegas Raiders": "LV", "Los Angeles Chargers": "LAC", "Los Angeles Rams": "LAR", "Miami Dolphins": "MIA",
  "Minnesota Vikings": "MIN", "New England Patriots": "NE", "New Orleans Saints": "NO", "New York Giants": "NYG",
  "New York Jets": "NYJ", "Philadelphia Eagles": "PHI", "Pittsburgh Steelers": "PIT", "San Francisco 49ers": "SF",
  "Seattle Seahawks": "SEA", "Tampa Bay Buccaneers": "TB", "Tennessee Titans": "TEN", "Washington Commanders": "WAS",
};

function cfg(env) {
  return {
    origin: env.ALLOWED_ORIGIN || "https://plammmmm.github.io",
    cacheSeconds: Number(env.CACHE_SECONDS || 600),
    monthly: Number(env.MONTHLY_CREDITS || 500),
    stopPct: Number(env.BUDGET_STOP_PCT || 80),
  };
}

function headers(env) {
  return {
    "Access-Control-Allow-Origin": cfg(env).origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
}

const json = (body, env, status = 200) => new Response(JSON.stringify(body), { status, headers: headers(env) });

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// ---- Pure functions (tested in worker/test) ----

export function normalize(events, nowMs) {
  return events.map((e) => {
    const home = NFL_TEAMS[e.home_team] || e.home_team;
    const away = NFL_TEAMS[e.away_team] || e.away_team;
    const books = (e.bookmakers || []).map((b) => {
      const row = { book: b.key, title: b.title, us: US_BOOKS.includes(b.key), updated: b.last_update };
      for (const m of b.markets || []) {
        const by = (name) => m.outcomes.find((o) => o.name === name);
        if (m.key === "spreads") {
          const h = by(e.home_team), a = by(e.away_team);
          if (h && a) row.spread = { home: h.point, homePrice: h.price, away: a.point, awayPrice: a.price };
        } else if (m.key === "totals") {
          const o = by("Over"), u = by("Under");
          if (o && u) row.total = { points: o.point, overPrice: o.price, underPrice: u.price };
        } else if (m.key === "h2h") {
          const h = by(e.home_team), a = by(e.away_team);
          if (h && a) row.ml = { home: h.price, away: a.price };
        }
      }
      return row;
    });
    return {
      id: e.id,
      kickoff: e.commence_time,
      live: Date.parse(e.commence_time) <= nowMs,
      home, away, homeName: e.home_team, awayName: e.away_team,
      books,
      consensus: consensus(books),
    };
  });
}

// Consensus = median across US books (falls back to all books if no US book has the market).
export function consensus(books) {
  const pick = (f) => {
    const us = books.filter((b) => b.us).map(f).filter((v) => v != null);
    return median(us.length ? us : books.map(f).filter((v) => v != null));
  };
  const half = (x) => (x == null ? null : Math.round(x * 2) / 2); // books quote in half points
  return { spreadHome: half(pick((b) => b.spread?.home)), total: half(pick((b) => b.total?.points)) };
}

// Openers: first consensus seen for each pre-kickoff game. Never overwritten.
export function mergeOpeners(openers, games, nowIso) {
  const out = { ...openers };
  for (const g of games) {
    if (!out[g.id] && !g.live && g.consensus.spreadHome != null) {
      out[g.id] = { spreadHome: g.consensus.spreadHome, total: g.consensus.total, at: nowIso, kickoff: g.kickoff };
    }
  }
  // Prune games that kicked off more than 3 days ago.
  const cutoff = Date.parse(nowIso) - 3 * 864e5;
  for (const [id, o] of Object.entries(out)) if (Date.parse(o.kickoff) < cutoff) delete out[id];
  return out;
}

// ---- KV-backed fetch with cache + budget guard ----

async function getOdds(env, sport, { force = false } = {}) {
  const c = cfg(env);
  const kv = env.GAMEDAY_KV;
  const latestKey = `odds:${sport}:latest`, openersKey = `openers:${sport}`;
  const [latest, credits, openers] = await Promise.all([
    kv.get(latestKey, "json"), kv.get("credits", "json"), kv.get(openersKey, "json"),
  ]);
  const fresh = latest && Date.now() - Date.parse(latest.fetchedAt) < c.cacheSeconds * 1000;
  const floor = (c.monthly * (100 - c.stopPct)) / 100; // stop when remaining credits drop to this
  const paused = credits && credits.remaining != null && credits.remaining <= floor;

  const respond = (data, extra) => ({ ...data, openers: openers || {}, credits, ...extra });

  if (latest && (fresh || paused) && !force) return respond(latest, { cached: true, paused: !!paused });
  if (paused) return respond(latest || { games: [] }, { cached: true, paused: true });
  if (!env.ODDS_API_KEY) throw new Error("ODDS_API_KEY secret is not set");

  const url = `https://api.the-odds-api.com/v4/sports/${SPORTS[sport]}/odds` +
    `?apiKey=${env.ODDS_API_KEY}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;
  const res = await fetch(url);
  if (!res.ok) {
    if (latest) return respond(latest, { cached: true, error: `Odds API ${res.status}` });
    throw new Error(`Odds API ${res.status}`);
  }
  const nowIso = new Date().toISOString();
  const games = normalize(await res.json(), Date.now());
  const newCredits = {
    used: Number(res.headers.get("x-requests-used")),
    remaining: Number(res.headers.get("x-requests-remaining")),
    at: nowIso,
  };
  const newOpeners = mergeOpeners(openers || {}, games, nowIso);
  const data = { fetchedAt: nowIso, games };
  await Promise.all([
    kv.put(latestKey, JSON.stringify(data)),
    kv.put("credits", JSON.stringify(newCredits)),
    kv.put(openersKey, JSON.stringify(newOpeners)),
  ]);
  return { ...data, openers: newOpeners, credits: newCredits, cached: false, paused: false };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: headers(env) });
    const url = new URL(request.url);
    try {
      if (url.pathname === "/health") {
        return json({ ok: true, version: "1.1", hasOddsKey: !!env.ODDS_API_KEY, hasKv: !!env.GAMEDAY_KV, time: new Date().toISOString() }, env);
      }
      if (url.pathname === "/odds") {
        const sport = url.searchParams.get("sport") || "nfl";
        if (!SPORTS[sport]) return json({ error: `Unknown sport ${sport}` }, env, 400);
        if (!env.GAMEDAY_KV) return json({ error: "KV namespace GAMEDAY_KV is not bound" }, env, 500);
        return json(await getOdds(env, sport), env);
      }
      return json({ error: "Not found" }, env, 404);
    } catch (err) {
      return json({ error: err.message }, env, 500);
    }
  },

  // Daily opener snapshot (still respects the budget guard).
  async scheduled(event, env, ctx) {
    if (!env.GAMEDAY_KV || !env.ODDS_API_KEY) return;
    ctx.waitUntil(getOdds(env, "nfl", { force: true }).catch(() => {}));
  },
};
