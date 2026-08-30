# DXB-03 Brick Core

## STATUS
Completed

*(Documentation backfilled retroactively during DXB-04's closure workflow — this task was implemented and committed ("DXB-03 Brick Core") before this file existed. Content below is reconstructed from the shipped code and its own inline documentation, not written contemporaneously.)*

## FILES CREATED

- `src/entities/dx-ball/Brick.ts`
- `src/entities/dx-ball/BrickGrid.ts`

## FILES MODIFIED

- `src/entities/dx-ball/Ball.ts` — constructor now also takes a `BrickGrid` reference (alongside the existing `Paddle`); each `launched`-state frame, after wall-collision resolution, the ball asks the grid whether it's overlapping a brick via `resolveBrickCollisions()` and reflects velocity on whichever axis is reported.
- `src/scenes/MainScene.ts` — constructs a `BrickGrid` (before the `Ball`, since the ball takes it by reference at construction time) and drives its `resize()` alongside the paddle's and ball's on every viewport change. The ARC-01 diagnostic viewport border/label was also removed here, since real gameplay (paddle, ball, and now bricks) had made that temporary placeholder obsolete.

## ARCHITECTURAL DECISIONS

- `Brick` is a thin `Phaser.GameObjects.Rectangle` subclass that owns only its fixed `row`/`column` identity — no sizing, layout, or collision logic of its own. All of that lives in `BrickGrid`, mirroring how `MainScene` owns `Paddle`/`Ball` rather than those entities owning each other.
- `BrickGrid` owns the full set of bricks (default 5 rows × 8 columns, one color per row, cycling the palette if `rows` exceeds it) and computes their responsive layout the same ratio-based way `Paddle` and `Ball` size themselves — recomputed on every `resize()` call.
- `BrickGrid.resolveBallCollision()` centralizes ball/brick collision: it checks a ball's circle against every remaining brick, and on the first overlap found, removes that brick from its tracked list *before* calling `destroy()` on it — guaranteeing no later step (in that call or a future one) can ever touch an already-destroyed brick. At most one brick is removed per call, since it's called once per frame and a hit brick disappears immediately (so it can never be double-hit).
- The bounce axis returned by `resolveBallCollision()` is whichever of the ball/brick overlap's two axes (x or y) is *smaller* — that's the axis the ball just crossed into the brick along, so that's the axis reflected. The ball itself (not the grid) owns reflecting its own velocity; the grid only reports which axis to reflect.
- No physics engine or shared collision system was introduced — brick collision follows the same "entity checks another entity directly" pattern established by the ball's existing wall-collision logic, just extended to a collection of many bricks instead of the four fixed viewport edges.

## KNOWN RISKS

- `rows`, `columns`, `colors`, and every layout ratio (`topOffsetRatio`, `sideMarginRatio`, `gapRatio`, `rowHeightRatio`) in `BrickGridConfig` are placeholder tuning values, not playtested.
- `resolveBallCollision()` only reflects velocity on overlap — it never corrects the ball's position out of the brick it hit. At high enough ball speed relative to a brick's thin height (`rowHeightRatio: 0.035`), the ball could theoretically tunnel through a brick in a single frame without ever registering an overlap.
- Deliberately excluded from this task (per its own scope restrictions): scoring, lives, levels, audio, UI, and powerups — none of that exists here or anywhere else yet. Paddle/ball collision was also still missing at this point (added later, in DXB-04).
- No win condition existed yet at this task's completion — nothing checked whether all bricks had been cleared (added later, in DXB-04, via `BrickGrid.isCleared()`).

## NEXT RECOMMENDED TASK

DXB-04 Gameplay Loop
