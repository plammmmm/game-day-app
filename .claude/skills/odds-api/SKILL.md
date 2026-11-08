---
name: odds-api
description: Rules for calling The Odds API from the Worker — endpoints, sport keys, credit math, caching and budget guard. Use for any odds fetch work.
---

# The Odds API

## Endpoints (v4)
- Odds: `GET https://api.the-odds-api.com/v4/sports/{sport}/odds?apiKey=KEY&regions=us&markets=h2h,spreads,totals&oddsFormat=american`
- Events (no odds, **free**): `GET /v4/sports/{sport}/events?apiKey=KEY`
- Response headers: `x-requests-remaining`, `x-requests-used`, `x-requests-last`. Store them in KV after every call.

## Sport keys
- NFL `americanfootball_nfl` · CFB `americanfootball_ncaaf` · NBA `basketball_nba` · NHL `icehockey_nhl` · MLB `baseball_mlb` · MLS `soccer_usa_mls`

## Credit math
- Cost per odds call = **markets × regions**. NFL h2h+spreads+totals, US = **3 credits**.
- Historical endpoints cost 10× and need a paid plan — **never use them**.
- Free tier: 500 credits/month. Daily opener cron ≈ 90/month. Leaves ~135 on-demand pulls.

## Rules
1. All pulls go through the Worker. Never call from the browser.
2. Cache each sport's latest odds in KV for `CACHE_SECONDS` (600). Serve cache if fresh.
3. **Budget guard:** if `x-requests-used` ≥ `MONTHLY_CREDITS × BUDGET_STOP_PCT / 100`, stop live pulls and serve cache with `{ paused: true }`.
4. Books to show: draftkings, fanduel, betmgm, williamhill_us (Caesars), espnbet, betrivers, fanatics, bovada. Ignore others.
5. Normalize team names to NFL abbreviations before storing.
