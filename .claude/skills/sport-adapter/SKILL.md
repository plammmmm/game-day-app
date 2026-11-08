---
name: sport-adapter
description: Contract and checklist for adding a new sport (CFB, NBA, NHL, MLB, MLS). Use when adding a league.
---

# Sport adapter

Order: NFL → CFB → NBA → NHL → MLB → MLS. Add one at a time.

## Contract (each sport implements)
1. `fetch_schedule(season)`
2. `fetch_game_stats(date_range)`
3. `fetch_injuries()`
4. `map_team_ids()` — odds-API names ↔ stats-source IDs ↔ our abbreviations
5. `unit_definitions()` — offense/defense stat pairs for the mismatch engine
6. `odds_sport_key()` — see `odds-api` skill

## Checklist
- [ ] Team map covers every team in odds feed and stats feed (test fails on any unmapped name).
- [ ] Unit definitions added to `edge-metrics`.
- [ ] Credit budget recalculated — each extra league adds ~3 credits per pull and ~90/month for its opener cron. Free tier likely can't hold a second league.
- [ ] UI league tab added. No other UI changes needed.
