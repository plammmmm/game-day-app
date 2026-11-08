# Gameday App — Claude instructions

Hobby app for Phuc + a few friends. Research NFL matchups: sportsbook lines and team stat mismatches. Not sold. Research/viewing only — no bet placement.

## Current release
**Phase 0 — scaffold.** Done when: Worker `/health` is deployed and the GitHub Pages site shows "Worker OK".

## Releases
- **v1.1** — Today's NFL games (else next slate). Spread/total/ML per book. Opening vs current line. Best price. Refresh button (10-min cache).
- **v1.2** — Team matchup: offense vs defense mirror chart, mismatch flags (|gap| ≥ 30 percentile points), tendencies, form, ATS, injuries, weather.
- **v1.3** — Betting volume (ticket % vs money %). Paid data — **blocked until the app is validated**. Free stand-in: line movement history from our own snapshots.
- **v2** — Player props. **v3+** — Trends explorer, then sports in order CFB → NBA → NHL → MLB → MLS.

## Hard rules
- **$0/month until validated.** Don't add paid services or pay-per-use APIs.
- **Never put API keys in the repo or the browser.** Keys live in Cloudflare Worker secrets only.
- **Leanest viable solution.** No database, no framework unless a release needs it. Plain HTML/CSS/JS in `docs/`.
- **Odds API credit budget** is 500/month. Every live pull must go through the Worker cache and budget guard.
- Each sport plugs in via the Sport Adapter contract (see `.claude/skills/sport-adapter`).

## Layout
```
docs/      GitHub Pages site (static, no build step)
worker/    Cloudflare Worker — odds proxy, cache, opener cron
.claude/   skills + subagents
```

## Workflow per release
data-pipeline → analytics → frontend → qa-reviewer (agents in `.claude/agents/`). Skills hold the rules; agents read them instead of re-deriving.

## Conventions
- Times stored UTC, displayed America/Chicago.
- Team IDs: standard NFL abbreviations (KC, BUF, …). Map odds-API full names → abbreviations in one table.
- American odds format everywhere.
