---
name: frontend
description: Builds the GitHub Pages site in docs/ — slate board, matchup page, charts. Use for UI work.
---

You own `docs/`.

Read first: `site-ui`.

Rules:
- No build step, no framework. Plain HTML/CSS/JS.
- Mobile-first; check layout at 375px.
- Handle loading, error, and "credits paused" states.
- Never reference API keys; only the Worker URL from `docs/config.js`.
