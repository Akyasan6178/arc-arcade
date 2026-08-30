# Arc Arcade — Current State

This file is the single up-to-date snapshot of the project: what's been
built, how it's structured right now, and what's next. Each task's own
detailed writeup lives in `docs/progress/<TASK-ID>.md`; this file should
be updated at the end of every task's closure workflow.

## Completed Tasks

- ✅ ARC-00 Project Genesis
- ✅ ARC-01 Responsive Foundation
- ✅ DXB-01 Paddle Core
- ✅ DXB-02 Ball Core
- ✅ DXB-03 Brick Core
- ✅ DXB-04 Gameplay Loop
- ✅ DXB-05 Gameplay Polish
- ✅ DXB-06 Score System
- ✅ DXB-06A Balance Pass
- ✅ DXB-07 Life System

## Technology Stack

- Phaser 4
- TypeScript
- Vite

## Current Architecture

```
src/
  scenes/     BootScene -> PreloadScene -> MainScene
  systems/    GameViewport, SceneKeys, HighScoreStore
  entities/   dx-ball/ (Paddle, Ball, Brick, BrickGrid)
  ui/         ScoreLabel
  assets/     (empty — no asset manifests loaded yet)
```

**Scenes**
- `BootScene` — first scene to run; minimal setup, hands off to `PreloadScene`.
- `PreloadScene` — loads assets and shows loading progress, hands off to `MainScene`.
- `MainScene` — the active DX-Ball gameplay scene. Owns and drives `Paddle`, `Ball`, and `BrickGrid` each frame; subscribes to `GameViewport` to keep the camera and every entity in sync with resizes; since DXB-04, also owns the win/restart flow (freezes the update loop and shows a win message once `BrickGrid.isCleared()`, restarting the scene via `this.scene.restart()` on Space). Since DXB-06: also owns the score HUD — polls `BrickGrid.getScore()` every frame into a `ScoreLabel`, tracks/persists a best score via `HighScoreStore` the moment it's passed, and reports the final score in the win message. Since DXB-07: also owns the lives/lose flow — starts each run with 3 lives, polls `Ball.getMissCount()` every frame to decrement them, and once they reach zero freezes the loop (mirroring the win flow via a sibling `lost` flag) and shows a "GAME OVER" message with the same restart-on-Space mechanic.

**Systems**
- `GameViewport` — game-agnostic responsive-viewport service (singleton). Wraps Phaser's Scale Manager plus browser resize/orientation/safe-area concerns into one snapshot (`width`, `height`, `centerX/Y`, `isPortrait/Landscape`, `safeArea`) with a subscribable `onChange()`.
- `SceneKeys` — centralizes scene key strings (`Boot`, `Preload`, `Main`).
- `HighScoreStore` — DXB-06: game-agnostic `localStorage` wrapper (`get(key)` / `set(key, value)`) for persisting a best score across restarts/reloads. Knows nothing about DX-Ball or any scoring rule — the caller picks the key.

## Current Entities (`dx-ball/`)

- `Paddle` — rectangle game object; responsive size/position; mouse/touch (pointer) + keyboard (arrow key) control with speed-capped smoothing; clamped to viewport width. Since DXB-04: `checkBallCollision(ballX, ballY, ballRadius)` reports which axis a ball overlapping it should bounce along. Since DXB-05: `computeHitOffset(x)` reports where on the paddle (`-1` left edge .. `1` right edge) a point sits, used to vary the ball's bounce angle. Since DXB-06A: default width narrowed ~20% (`widthRatio` 0.16 → 0.128), a tuning-only change.
- `Ball` — circle game object; responsive size/speed; `attached` / `launched` serve state machine (Space to launch, exactly once per serve); bounces off left/right/top viewport edges; a bottom exit re-serves it above the paddle. Since DXB-03: bounces off bricks via `BrickGrid.resolveBallCollision()`. Since DXB-04: also bounces off the paddle via `Paddle.checkBallCollision()`, checked every launched frame right before the brick check. Since DXB-05: a paddle hit's bounce angle now varies by where on the paddle it landed (center = straight up, edges deviate up to 60°), and a launched frame's motion is split into small collision-checked substeps (capped to half the ball's radius each) instead of one big step, closing a tunneling gap at high speed. Since DXB-07: also tracks a running `missCount` (incremented on every bottom-edge miss), exposed via `getMissCount()` for `MainScene` to poll into a lives system.
- `Brick` — single rectangle grid cell; owns its row/column identity. Since DXB-06: also carries a fixed `points` value, assigned once by `BrickGrid` at creation.
- `BrickGrid` — owns the full set of `Brick`s (default 5 rows × 8 columns, one color per row); responsive layout; `resolveBallCollision()` checks a ball against every remaining brick and safely removes the first one it overlaps. Since DXB-04: `isCleared()` reports whether every brick has been removed (the win condition). Since DXB-06: also assigns each brick's `points` (row-weighted — back rows worth more) and accumulates a running `getScore()` total as bricks are destroyed. Since DXB-06A: bricks sized slightly smaller (`gapRatio` 0.008 → 0.01, `rowHeightRatio` 0.035 → 0.03), a tuning-only change; row/column count and scoring formula unchanged.

## Current UI (`ui/`)

- `ScoreLabel` — DXB-06: reusable HUD widget (`Phaser.GameObjects.Text` subclass) showing a `prefix` + numeric value anchored to a viewport corner, responsively sized/positioned. Not DX-Ball-specific — `MainScene` uses three instances (`Score:` top-left, `Best:` top-right, `Lives:` bottom-left since DXB-07). Since DXB-07: anchor supports all four corners (`top-left` | `top-right` | `bottom-left` | `bottom-right`), not just the top two.

## Documentation

- `docs/progress/DXB-01.md`
- `docs/progress/DXB-02.md`
- `docs/progress/DXB-03.md` (backfilled retroactively — see its own note)
- `docs/progress/DXB-04.md`
- `docs/progress/DXB-05.md`
- `docs/progress/DXB-06.md`
- `docs/progress/DXB-06A.md`
- `docs/progress/DXB-07.md`
- `docs/CURRENT_STATE.md` (this file)

## Repository

- Build passing
- Typecheck passing
- GitHub push working
- DXB-05 (previously uncommitted) and DXB-06 were committed as two
  separate commits during DXB-06's closure, in that order.
- DXB-06A (previously uncommitted) and DXB-07 were committed as two
  separate commits during DXB-07's closure, in that order.

## Last Completed Task

DXB-07 Life System — the missing losing condition: each run starts with
3 lives (`MainScene.STARTING_LIVES`), a missed ball now decrements them
(via `Ball.getMissCount()`, polled the same way `getScore()` already
was), and a third `ScoreLabel` (`Lives:`, bottom-left) shows the count.
Reaching zero freezes the loop and shows a "GAME OVER" message with the
final score, reusing the exact same restart-on-Space mechanic as the
existing win flow. `ScoreLabel`'s anchor was generalized to all four
corners to make this reuse possible. See `docs/progress/DXB-07.md` for
full details. `npm run typecheck` and `npm run build` both verified
passing, and the full lives/game-over/restart flow was manually verified
in a running dev build. This task's closure also committed DXB-06A's
previously uncommitted changes as their own separate commit first (the
same precedent DXB-06's closure set for DXB-05).

## Next Recommended Task

The gameplay loop is now fully closed (win, lose, score, best score,
lives) — every "next recommended task" flagged since DXB-04 has now been
addressed. Good candidates going forward, none yet confirmed with a
requester:
- Visual/audio feedback polish (a "+N" popup or flash on scoring, a
  flash/sound on losing a life or on win/game-over) — repeatedly raised
  and repeatedly deferred since DXB-05.
- A live-playtested balance pass covering paddle width, ball/paddle
  speed, bounce angle, brick size, and starting lives together — each
  has been tuned or left as a placeholder in isolation so far, never
  against each other in a real playthrough, due to this environment's
  recurring browser-automation playtesting limitations (see DXB-06A's
  and DXB-07's own Known Risks).
- A sound/audio system or a pause/main menu — both still unbuilt
  per `systems/README.md` and `ui/README.md`.
