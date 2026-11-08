---
name: nflverse-data
description: Pulling and aggregating nflverse NFL data (play-by-play, schedules, injuries) for v1.2 matchups. Use for stats jobs.
---

# nflverse data (v1.2)

## Sources (free, GitHub releases of nflverse/nflverse-data)
- `pbp` release → `play_by_play_{season}.parquet` (372 cols incl. `epa`, `success`, `wp`).
- `schedules` → games, results, `spread_line`, `total_line` (closing), roof, surface, rest.
- `injuries`, `rosters`, `player_stats`.
- Python: `nflreadpy` (or download parquet directly).

## Update timing
- Posts in batches, usually the day after games. Pull Mon + Tue 6am CT via GitHub Actions.

## PBP → team unit stats
- Filter `play_type in ('run','pass')`, exclude kneels/spikes.
- Per team per week, offense (`posteam`) and defense (`defteam`):
  - rush EPA/play, rush success rate
  - pass EPA/play, pass success rate
  - sack rate (sacks / dropbacks)
  - red zone TD rate (drives reaching opp 20)
  - 3rd-down conversion rate
  - explosive rate (rush ≥ 10 yds, pass ≥ 20 yds)
  - pace (seconds per play, neutral situations)
  - pass rate over expected (`pass_oe` where available)

## Output
- `docs/data/nfl/teams.json` and `docs/data/nfl/matchups/{gameId}.json`. Contracts live in `site-ui`.
