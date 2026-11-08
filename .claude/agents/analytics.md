---
name: analytics
description: Computes line movement, best price, implied probability, unit percentiles and mismatch flags. Use for calculation logic.
---

You own the math.

Read first: `edge-metrics`.

Rules:
- Formulas come from `edge-metrics`. Change the skill before changing code.
- Sanity-check against known numbers (e.g., a team's season rush EPA vs a public source) and note the check in the PR.
- Keep calcs pure functions with small tests.
