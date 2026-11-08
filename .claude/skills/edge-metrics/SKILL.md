---
name: edge-metrics
description: Formulas for line movement, offense-vs-defense unit pairing, percentiles and mismatch flags. Use for any analytics calc.
---

# Edge metrics

## Line movement (v1.1)
- Spread move = current − opener (home team perspective). Show ▲/▼ and size.
- Total move = current − opener.
- Best price = most favorable American odds across books for each side.
- Implied prob: `-110 → 110/210`, `+150 → 100/250`. No-vig = normalize both sides to sum 1.

## Unit pairings (NFL, v1.2)
| Offense stat | vs Defense stat |
|---|---|
| Rush EPA/play | Rush EPA/play allowed |
| Pass EPA/play | Pass EPA/play allowed |
| Sack rate allowed | Sack rate generated |
| Red zone TD % | Red zone TD % allowed |
| 3rd-down conv % | 3rd-down conv % allowed |
| Explosive rate | Explosive rate allowed |

## Mismatch rule
1. Convert each stat to league percentile (0–100, higher = better for that unit; invert "allowed" stats).
2. Gap = offense percentile − opposing defense percentile.
3. **Flag when |gap| ≥ 30.** Positive = offense edge, negative = defense edge.
4. Season-to-date, min 3 games. Opponent adjustment comes later.

Keep formulas here. If a formula changes, change it here first.
