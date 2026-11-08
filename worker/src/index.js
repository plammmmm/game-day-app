// Gameday Worker — Phase 0 skeleton.
// Holds ODDS_API_KEY (secret), serves odds to the static site with caching.
// Phase 0: only /health is live. /odds and the opener cron arrive in v1.1.

function cors(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };
}

function json(body, env, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors(env) });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors(env) });

    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({
        ok: true,
        phase: 0,
        hasOddsKey: Boolean(env.ODDS_API_KEY),
        hasKv: Boolean(env.GAMEDAY_KV),
        time: new Date().toISOString(),
      }, env);
    }

    if (url.pathname === "/odds") {
      return json({ error: "Not built yet (v1.1)" }, env, 501);
    }

    return json({ error: "Not found" }, env, 404);
  },

  // Daily opener snapshot — implemented in v1.1.
  async scheduled(event, env, ctx) {},
};
