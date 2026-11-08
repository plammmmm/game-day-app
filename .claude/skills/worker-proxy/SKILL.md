---
name: worker-proxy
description: Cloudflare Worker patterns for this app — routes, KV keys, cron opener snapshot, secrets, CORS. Use when editing worker/.
---

# Worker proxy

## Routes
- `GET /health` — deploy check.
- `GET /odds?sport=nfl` — cached odds + openers (v1.1).
- `GET /history?game=ID` — line snapshots for movement (v1.3 stand-in).

## KV keys
- `odds:{sport}:latest` → `{ fetchedAt, games: [...] }`
- `opener:{sport}:{gameId}` → first snapshot seen for that game. **Write once, never overwrite.**
- `snap:{sport}:{gameId}:{iso}` → each live pull (for history). Keep 14 days (`expirationTtl`).
- `credits` → `{ used, remaining, at }` from response headers.

## Cron (daily 14:00 UTC)
- Pull NFL odds once. For each game without an `opener:` key, write it.
- Also refreshes `odds:nfl:latest`, so the first visitor of the day is free.

## Secrets & config
- `ODDS_API_KEY` via `wrangler secret put`. Never in code, toml, or git.
- `ALLOWED_ORIGIN` = `https://plammmmm.github.io`. Return CORS headers on every response.

## Free-tier limits to respect
- KV free tier: 1,000 writes/day. Snapshots per pull ≈ games on slate (~16). Fine.
