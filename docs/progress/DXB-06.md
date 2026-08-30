# DXB-06 Score System

## TASK
Implement a score system for DX-Ball: award points for destroying bricks,
display the current run's score in a HUD, and track/persist a best score
across restarts.

## STATUS
Completed

## SCOPE
"Score System" left a few genuine open decisions (scoring rule, whether a
best score should persist, whether the win message should report it) the
same way DXB-04/DXB-05 confirmed scope before implementing an ambiguous
task name. Confirmed with the requester up front:

1. **Row-weighted scoring** — bricks further from the paddle (lower row
   index, i.e. the back rows) are worth more points, the classic
   Arkanoid/DX-Ball convention — not a flat per-brick amount.
2. **Best score persists across restarts** via `localStorage`, not just
   an in-memory current-run counter.
3. **The win message reports the final score reached**, alongside the
   existing restart prompt.

## FILES CREATED
- `src/systems/HighScoreStore.ts` — game-agnostic `localStorage` wrapper
  (`get(key)` / `set(key, value)`), the "save/score persistence" example
  already named in `systems/README.md`.
- `src/ui/ScoreLabel.ts` — the first shared HUD widget in `ui/`, the
  "generic ScoreLabel" example already named in `ui/README.md`.

## FILES MODIFIED
- `src/entities/dx-ball/Brick.ts` — added a `points` field, assigned once
  at construction by `BrickGrid` and never mutated (mirrors `row`/`column`).
- `src/entities/dx-ball/BrickGrid.ts` — added `basePointsPerRow` config,
  a `computePointsForRow()` helper, a running `score` field accumulated in
  `resolveBallCollision()` whenever a brick is removed, and a `getScore()`
  query.
- `src/scenes/MainScene.ts` — creates a `Score:` `ScoreLabel` (top-left)
  and a `Best:` `ScoreLabel` (top-right); polls `brickGrid.getScore()`
  every frame the same way it already polled `isCleared()`; loads/saves
  the best score via `HighScoreStore`; the win message now includes the
  final score; both labels resize on viewport change like every other
  entity.

## ARCHITECTURAL DECISIONS
- **Scoring lives entirely in `BrickGrid`, not `Ball`.** A brick already
  carries everything needed to award its own points, and `BrickGrid`
  already owns brick removal — accumulating a running total there,
  exposed via a `getScore()` query, required zero changes to `Ball` or
  `Paddle`. This follows the exact precedent DXB-04 set with
  `isCleared()`: "the owning scene polls a getter" instead of an event
  bus, applied to score the same way it was applied to the win condition.
- **The HUD is two independent `ScoreLabel` instances, not one combined
  widget.** `ScoreLabel` only knows "a prefix + a number, anchored to a
  corner" — it has no opinion on "score" vs. "best" as concepts. This
  keeps it genuinely reusable (a future game could use the same class for
  a lives counter) rather than baking DX-Ball's specific score/best pair
  into the widget itself.
- **Best score updates live, not just at win time.** `MainScene` compares
  the current run's score against the in-memory best every frame (right
  next to the existing `isCleared()` poll) and persists immediately the
  moment it's passed, rather than deferring to a win/game-over event —
  there being no loss condition yet, deferring to "win" would mean a
  best score set mid-run (then lost on a later miss, if lives are ever
  added) would never be captured at all.
- **`HighScoreStore` knows nothing about DX-Ball.** It only stores a
  number under a caller-provided string key (`MainScene` owns the
  `'dx-ball-high-score'` key), following `systems/`'s own rule that
  nothing there should contain a specific game's rules — the row-based
  scoring formula lives entirely in `BrickGrid`, never in `systems/`.
- **Row-weighted formula: `(rows - row) * basePointsPerRow`.** With the
  default 5 rows and `basePointsPerRow: 10`, the back row (row 0) is
  worth 50 and the front row (row 4, closest to the paddle) is worth 10.
  A pure multiplier of row distance was chosen over a hardcoded
  points-per-row array so it stays correct if `rows` is reconfigured.

## REQUIREMENTS VERIFICATION
Manually verified in a running dev build (Chrome DevTools Protocol
automation): the HUD shows "Score: 0" (top-left) and "Best: 0" (top-right)
on load; launching the ball and destroying two bottom-row bricks (row 4 of
5, worth `(5-4)*10 = 10` each) updated the live HUD to "Score: 20",
confirming both the row-weighted formula and the live-updating label.
`npm run typecheck` and `npm run build` both pass with no errors.

## KNOWN RISKS
- **Score resets to 0 on every scene restart**, same as every other piece
  of per-run state (bricks, ball position) — only the *best* score
  survives a restart. This was an explicit scope decision (in-memory
  current-run score, persisted best), not an oversight.
- **`basePointsPerRow` (10) is a placeholder tuning value, not
  playtested** — consistent with every other ratio/config value called
  out as a known risk in DXB-01–DXB-05.
- **`HighScoreStore` has no migration/versioning strategy.** If the
  scoring formula changes significantly in the future, an old persisted
  best score under the same key could look inconsistent with the new
  scale. Acceptable for a single evolving key with no other consumers yet.
- **No visual feedback for scoring** (e.g. a "+10" popup, a flash on the
  label, or a "New Best!" callout) — the label simply updates its text
  instantly. Raised as a possible future polish item, not selected here,
  the same way DXB-05 deferred tweens/flashes for hit feedback.
- **This session's shell tool was intermittently unresponsive** (the same
  known issue noted at DXB-05's closure) before recovering; every
  verification step (`typecheck`, `build`, and the live browser check)
  did ultimately complete successfully once the shell responded.
- **DXB-05's own changes were still uncommitted in git when this task
  started** (the last commit on `main` was DXB-04). Committed as its own
  separate `DXB-05 Gameplay Polish` commit as part of this task's closure,
  ahead of this task's own commit, so history reflects the two tasks
  distinctly rather than squashing them together.

## NEXT RECOMMENDED TASK
A lives/game-over system — there is still no losing condition (a missed
ball simply re-serves indefinitely), which both DXB-04 and DXB-05 already
flagged as the other obvious candidate. Visual scoring feedback (a "+N"
popup or brief label flash on hit) is a smaller, optional polish item
that could accompany it or come later.
