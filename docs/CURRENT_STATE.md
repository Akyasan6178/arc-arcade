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
- `MainScene` — the active DX-Ball gameplay scene. Owns and drives `Paddle`, `Ball`, and `BrickGrid` each frame; subscribes to `GameViewport` to keep the camera and every entity in sync with resizes; since DXB-04, also owns the win/restart flow (freezes the update loop and shows a win message once `BrickGrid.isCleared()`, restarting the scene via `this.scene.restart()` on Space). Since DXB-06: also owns the score HUD — polls `BrickGrid.getScore()` every frame into a `ScoreLabel`, tracks/persists a best score via `HighScoreStore` the moment it's passed, and reports the final score in the win message.

**Systems**
- `GameViewport` — game-agnostic responsive-viewport service (singleton). Wraps Phaser's Scale Manager plus browser resize/orientation/safe-area concerns into one snapshot (`width`, `height`, `centerX/Y`, `isPortrait/Landscape`, `safeArea`) with a subscribable `onChange()`.
- `SceneKeys` — centralizes scene key strings (`Boot`, `Preload`, `Main`).
- `HighScoreStore` — DXB-06: game-agnostic `localStorage` wrapper (`get(key)` / `set(key, value)`) for persisting a best score across restarts/reloads. Knows nothing about DX-Ball or any scoring rule — the caller picks the key.

## Current Entities (`dx-ball/`)

- `Paddle` — rectangle game object; responsive size/position; mouse/touch (pointer) + keyboard (arrow key) control with speed-capped smoothing; clamped to viewport width. Since DXB-04: `checkBallCollision(ballX, ballY, ballRadius)` reports which axis a ball overlapping it should bounce along. Since DXB-05: `computeHitOffset(x)` reports where on the paddle (`-1` left edge .. `1` right edge) a point sits, used to vary the ball's bounce angle.
- `Ball` — circle game object; responsive size/speed; `attached` / `launched` serve state machine (Space to launch, exactly once per serve); bounces off left/right/top viewport edges; a bottom exit re-serves it above the paddle. Since DXB-03: bounces off bricks via `BrickGrid.resolveBallCollision()`. Since DXB-04: also bounces off the paddle via `Paddle.checkBallCollision()`, checked every launched frame right before the brick check. Since DXB-05: a paddle hit's bounce angle now varies by where on the paddle it landed (center = straight up, edges deviate up to 60°), and a launched frame's motion is split into small collision-checked substeps (capped to half the ball's radius each) instead of one big step, closing a tunneling gap at high speed.
- `Brick` — single rectangle grid cell; owns its row/column identity. Since DXB-06: also carries a fixed `points` value, assigned once by `BrickGrid` at creation.
- `BrickGrid` — owns the full set of `Brick`s (default 5 rows × 8 columns, one color per row); responsive layout; `resolveBallCollision()` checks a ball against every remaining brick and safely removes the first one it overlaps. Since DXB-04: `isCleared()` reports whether every brick has been removed (the win condition). Since DXB-06: also assigns each brick's `points` (row-weighted — back rows worth more) and accumulates a running `getScore()` total as bricks are destroyed.

## Current UI (`ui/`)

- `ScoreLabel` — DXB-06: reusable HUD widget (`Phaser.GameObjects.Text` subclass) showing a `prefix` + numeric value anchored to a viewport corner, responsively sized/positioned. Not DX-Ball-specific — `MainScene` uses two instances (`Score:` top-left, `Best:` top-right).

## Documentation

- `docs/progress/DXB-01.md`
- `docs/progress/DXB-02.md`
- `docs/progress/DXB-03.md` (backfilled retroactively — see its own note)
- `docs/progress/DXB-04.md`
- `docs/progress/DXB-05.md`
- `docs/progress/DXB-06.md`
- `docs/CURRENT_STATE.md` (this file)

## Repository

- Build passing
- Typecheck passing
- GitHub push working
- DXB-05 (previously uncommitted) and DXB-06 were committed as two
  separate commits during DXB-06's closure, in that order.

## Last Completed Task

DXB-06 Score System — row-weighted points per brick (back rows worth
more), a live "Score"/"Best" HUD (`ui/ScoreLabel`), a best score
persisted across restarts (`systems/HighScoreStore`), and the final score
now shown in the win message. See `docs/progress/DXB-06.md` for full
details. `npm run typecheck` and `npm run build` both verified passing,
and the score HUD was manually verified in a running dev build.

## Next Recommended Task

A lives/game-over system — there is still no losing condition (a missed
ball simply re-serves indefinitely), flagged as the natural next step by
DXB-04, DXB-05, and DXB-06 alike. Visual scoring feedback (a "+N" popup
or brief label flash on hit) is a smaller, optional polish item that
could accompany it or come later.
