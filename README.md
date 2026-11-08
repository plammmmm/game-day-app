# Game Day App

NFL lines for a few friends: today's games, every book's spread/total/moneyline, opening vs current line, best price highlighted.

## Pieces
- `docs/` — static site on GitHub Pages. Shows **sample data** until a Worker URL is set in `docs/config.js`.
- `worker/src/index.js` — Cloudflare Worker (one file). Holds the Odds API key, caches odds 10 min, snapshots opening lines daily, stops pulling at 80% of monthly credits.

## Deploy the Worker (browser only, no Node needed)
1. Cloudflare dashboard → **Storage & Databases → KV** → Create namespace `GAMEDAY_KV`.
2. **Workers & Pages → Create → Worker** → name it `gameday-worker` → Deploy.
3. **Edit code** → replace everything with `worker/src/index.js` → Deploy.
4. Worker **Settings → Bindings** → Add → KV namespace → variable name `GAMEDAY_KV` → pick the namespace.
5. **Settings → Variables and Secrets** → Add → type **Secret** → name `ODDS_API_KEY` → paste key.
6. **Settings → Triggers → Cron Triggers** → Add `0 14 * * *` (daily 8am CT opener snapshot).
7. Open `https://gameday-worker.<your-subdomain>.workers.dev/health` → should show `"hasOddsKey":true,"hasKv":true`.
8. Put that base URL in `docs/config.js`.

(CLI alternative: `cd worker && npm install && npx wrangler deploy` — needs Node.)

## GitHub Pages
Settings → Pages → Deploy from branch → `main` / `/docs`. Free GitHub Pages requires a **public** repo.

## Tests
```
node worker/test/run.mjs        # Worker: parsing, cache, budget guard, openers
node docs/test/slate.test.cjs   # Site: slate pick, movement, best price
```
Fixtures come from a real pull on 2026-11-08.

## Cost
$0/month. Odds API free tier = 500 credits; one NFL pull = 3 credits; cache + 80% guard protect the budget.
