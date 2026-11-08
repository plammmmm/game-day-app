---
name: site-ui
description: Layout, styling and data contracts for the static site in docs/. Use for any frontend work.
---

# Site UI

## Principles
- Plain HTML/CSS/JS, no build step. Chart.js from cdnjs only when a chart is needed.
- Mobile-first: friends open it on phones. Readable at 375px wide.
- Dark theme, variables in `docs/style.css`.
- Show "Last updated X min ago" wherever data is shown.

## Screens
1. **Slate (v1.1):** one card per game — teams, kickoff (CT), and per row: book | spread | total | ML. Opener vs current with ▲/▼. Best price bolded. Refresh button.
2. **Matchup (v1.2):** mirror chart (offense bars left, defense bars right, per unit pairing), mismatch badges, tendencies, form, ATS, injuries, weather.

## Data contract — `/odds?sport=nfl`
```json
{
  "fetchedAt": "ISO",
  "paused": false,
  "credits": { "used": 0, "remaining": 500 },
  "games": [{
    "id": "oddsApiEventId",
    "kickoff": "ISO",
    "home": "KC", "away": "BUF",
    "books": [{
      "book": "draftkings",
      "spread": { "home": -3.0, "homePrice": -110, "awayPrice": -110 },
      "total":  { "points": 47.5, "overPrice": -110, "underPrice": -110 },
      "ml":     { "home": -150, "away": 130 }
    }],
    "opener": { "spreadHome": -2.5, "total": 46.5, "at": "ISO" }
  }]
}
```
