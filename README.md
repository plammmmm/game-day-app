# Game Day App

NFL matchup research for a few friends: sportsbook lines (opening vs current) and offense-vs-defense mismatches.

## Pieces
- `docs/` — static site on GitHub Pages
- `worker/` — Cloudflare Worker that holds the Odds API key, caches odds, and snapshots opening lines daily

## One-time setup
1. **GitHub Pages:** Settings → Pages → Deploy from branch → `main` / `/docs`.
2. **Odds API key:** sign up (free tier) at the-odds-api.com.
3. **Cloudflare Worker:**
   ```bash
   cd worker
   npm install
   npx wrangler login
   npx wrangler kv namespace create GAMEDAY_KV   # paste the id into wrangler.toml
   npx wrangler secret put ODDS_API_KEY
   npx wrangler deploy
   ```
4. Put the Worker URL in `docs/config.js`.

## Cost
$0/month. Odds API free tier = 500 credits/month; one NFL pull = 3 credits.
