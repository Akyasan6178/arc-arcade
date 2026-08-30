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
- ✅ DXB-08 Level System
- ✅ DXB-09 Powerup System
- ✅ DXB-10 Audio System
- ✅ DXB-11 Advanced Brick System
- ✅ DXB-12 Advanced Powerups
- ✅ DXB-13 Visual Refresh
- ✅ DXB-14 Game Modes
- ✅ DXB-13A Quality of Life

## Technology Stack

- Phaser 4
- TypeScript
- Vite

## Current Architecture

```
src/
  scenes/     BootScene -> PreloadScene -> ModeSelectScene -> MainScene
  systems/    GameViewport, SceneKeys, HighScoreStore, AudioManager
  entities/   dx-ball/ (Paddle, Ball, Brick, BrickType, BrickGrid, levels, GameMode, Powerup, PowerupManager, audioCues)
  ui/         ScoreLabel, ActiveEffectsLabel, ArcadeBackground, ModeLabel, SelectMenu, PauseOverlay
  assets/     dx-ball/audio-manifest.ts (empty real-asset list; SFX use synthesized fallback)
```

**Scenes**
- `BootScene` — first scene to run; minimal setup, hands off to `PreloadScene`.
- `PreloadScene` — loads assets and shows loading progress, hands off to `ModeSelectScene` (since DXB-14; previously went straight to `MainScene`). Since DXB-10: also loops over `DX_BALL_AUDIO_MANIFEST` calling `this.load.audio()` for each entry (currently zero, so a no-op today).
- `ModeSelectScene` — DXB-14: pre-run Classic / Time Attack / Endless picker. Owns an `ArcadeBackground`, a title, and a `SelectMenu`; starts `MainScene` with `{ mode }`. No gameplay.
- `MainScene` — the active DX-Ball gameplay scene. Owns and drives `Paddle`, `Ball`, and `BrickGrid` each frame; subscribes to `GameViewport` to keep the camera and every entity in sync with resizes; since DXB-04, also owns the win/restart flow (freezes the update loop and shows a win message once `BrickGrid.isCleared()`, restarting the scene via `this.scene.restart()` on Space). Since DXB-06: also owns the score HUD — polls `BrickGrid.getScore()` every frame into a `ScoreLabel`, tracks/persists a best score via `HighScoreStore` the moment it's passed, and reports the final score in the win message. Since DXB-07: also owns the lives/lose flow — starts each run with 3 lives, polls `Ball.getMissCount()` every frame to decrement them, and once they reach zero freezes the loop (mirroring the win flow via a sibling `lost` flag) and shows a "GAME OVER" message with the same restart-on-Space mechanic. Since DXB-08: also owns the level sequence (`entities/dx-ball/levels.ts`) — `isCleared()` now advances to the next level (`BrickGrid.loadLevel()` + a fresh `Ball`, both preserving score/lives) behind a "LEVEL CLEARED" transition message, and only calls `handleWin()` once the last level is cleared. Since DXB-09: also owns a `PowerupManager` for the run — every frame it drains `BrickGrid`'s queued powerup spawns into it, advances it, and dispatches any caught capsule's effect (`extra-life` bumps lives directly; `widen-paddle`/`slow-ball` delegate to `Paddle`/`Ball`); a level transition clears any still-falling capsules. Since DXB-10: plays the four scene-owned audio cues (`life-lost`, `level-complete`, `game-over`, `victory`) at the same code paths that already detect those events, and wires the `M` key to `AudioManager.toggle()` as a global mute (a keybinding, not a HUD control). Since DXB-12: owns a `balls[]` instead of a single `ball` so Multi Ball can coexist with lives/levels (extras spend on miss; lives still only decrement when the last ball is gone); `applyPowerupEffect()` also dispatches Fire Ball / Fast Ball / Small Paddle / Multi Ball; an `ActiveEffectsLabel` at top-center lists every active effect and its remaining duration. Since DXB-13: also owns an `ArcadeBackground` behind the playfield (created first, resized with the viewport); HUD corner colors and overlay messages share one typeface/stroke language. Since DXB-14: `init({ mode })` selects Classic / Time Attack / Endless; Classic is the unchanged loop; Time Attack adds a 90s countdown that ends in TIME'S UP (levels wrap); Endless wraps `LEVELS` and ramps ball speed; a `ModeLabel` shows the active mode; Space on an end screen restarts the same mode. Since DXB-13A: ESC opens a `PauseOverlay` (Resume / Restart Run / Return To Mode Selection) from every gameplay state and freezes the update loop while it is open; the campaign is 5 levels and the HUD shows `Level X / 5`. Gameplay ownership of score / lives / powerups / audio is unchanged.

**Systems**
- `GameViewport` — game-agnostic responsive-viewport service (singleton). Wraps Phaser's Scale Manager plus browser resize/orientation/safe-area concerns into one snapshot (`width`, `height`, `centerX/Y`, `isPortrait/Landscape`, `safeArea`) with a subscribable `onChange()`.
- `SceneKeys` — centralizes scene key strings (`Boot`, `Preload`, `ModeSelect`, `Main`).
- `HighScoreStore` — DXB-06: game-agnostic `localStorage` wrapper (`get(key)` / `set(key, value)`) for persisting a best score across restarts/reloads. Knows nothing about DX-Ball or any scoring rule — the caller picks the key.
- `AudioManager` — DXB-10: game-agnostic audio singleton (`AudioManager.init(game)` once in `main.ts`, `AudioManager.get()` from anywhere). `play(key, fallback)` prefers a Phaser-cached audio asset under `key` if one exists, otherwise synthesizes `fallback` (`ToneSpec`) via the Web Audio API. A global `enabled` flag (`isEnabled()` / `setEnabled()` / `toggle()`, persisted under `arc-arcade-audio-enabled`) gates every call; every operation is defensive and never throws. Knows nothing about DX-Ball's specific cues — those live in `entities/dx-ball/audioCues.ts`. The two-path split plus an `AudioManifestEntry.category: 'sfx' | 'music'` field is the seam a future music system would reuse; no music is implemented.

## Current Entities (`dx-ball/`)

- `Paddle` — rectangle game object; responsive size/position; mouse/touch (pointer) + keyboard (arrow key) control with speed-capped smoothing; clamped to viewport width. Since DXB-04: `checkBallCollision(ballX, ballY, ballRadius)` reports which axis a ball overlapping it should bounce along. Since DXB-05: `computeHitOffset(x)` reports where on the paddle (`-1` left edge .. `1` right edge) a point sits, used to vary the ball's bounce angle. Since DXB-06A: default width narrowed ~20% (`widthRatio` 0.16 → 0.128), a tuning-only change. Since DXB-09: `applyWidenBoost(durationMs)` applies a temporary `1.5x` width multiplier that the paddle counts down and reverts itself every frame. Since DXB-12: `applyShrinkEffect(durationMs)` applies a temporary `0.65x` width (Small Paddle), mutually exclusive with widen; getters expose remaining ms for the effects HUD.
- `Ball` — circle game object; responsive size/speed; `attached` / `launched` serve state machine (Space to launch, exactly once per serve); bounces off left/right/top viewport edges; a bottom exit re-serves it above the paddle. Since DXB-03: bounces off bricks via `BrickGrid.resolveBallCollision()`. Since DXB-04: also bounces off the paddle via `Paddle.checkBallCollision()`, checked every launched frame right before the brick check. Since DXB-05: a paddle hit's bounce angle now varies by where on the paddle it landed (center = straight up, edges deviate up to 60°), and a launched frame's motion is split into small collision-checked substeps (capped to half the ball's radius each) instead of one big step, closing a tunneling gap at high speed. Since DXB-07: also tracks a running `missCount` (incremented on every bottom-edge miss), exposed via `getMissCount()` for `MainScene` to poll into a lives system. Since DXB-09: `applySlowEffect(durationMs)` applies a temporary `0.6x` speed multiplier, folded into launch/resize speed and ticked/reverted every frame regardless of serve state. Since DXB-10: `resolvePaddleCollision()` plays `'paddle-hit'` on the rising edge of paddle overlap (so a single contact spanning several substeps does not replay the cue). Since DXB-11: also applies the separation vector `BrickGrid.resolveBallCollision()` now returns, so a brick that survives the hit (metal, cracked first hit) cannot be re-overlapped on the next substep; the ball still does not know brick types exist. Since DXB-12: `applyFireEffect()` (timed pierce — the ball asks the grid `{ pierce: true }` and tints orange); `applyFastEffect()` (`1.45x`, mutually exclusive with slow); extra-ball miss behavior for Multi Ball (`becomeExtra()` / `setMissBehavior('spend')` marks a bottom-edge exit spent instead of re-serving). Since DXB-13: Fire Ball also shows a gold stroke and a larger translucent glow circle; pierce behavior is unchanged. Since DXB-14: `setProgressionMultiplier()` folds an extra speed scale into launch/resize/travel (Endless); slow/fast still apply on top; the ball still does not know modes exist.
- `Brick` — single rectangle grid cell; owns its row/column identity. Since DXB-06: also carries a fixed `points` value, assigned once by `BrickGrid` at creation. Since DXB-11: also carries `brickType` plus remaining hit-points and type-driven appearance (`takeHit()` / healthy-vs-cracked fill and stroke); metal/bonus override the row color. Collision, scoring, and drops still live in `BrickGrid`. Since DXB-12: `takeHit({ fire: true })` destroys in one hit, including metal — only `BrickGrid` passes that flag. Since DXB-13: a sibling `Graphics` overlay draws type-specific detail (clean bevel, crack lines, metallic bands, gold bonus pip) without changing the collision rectangle.
- `BrickType.ts` — DXB-11: reusable brick-type vocabulary (`normal` | `cracked` | `metal` | `bonus`), a `BRICK_TYPE_SPECS` data table (hit count, score, drop policy, fill/stroke), and the compact layout parser (`N`/`C`/`M`/`B`/`.`). Kept out of `BrickGrid` the same way `levels.ts` keeps level data out of the grid.
- `BrickGrid` — owns the full set of `Brick`s (default 5 rows × 8 columns, one color per row); responsive layout; `resolveBallCollision()` checks a ball against every remaining brick and safely removes the first one it overlaps. Since DXB-04: `isCleared()` reports whether every brick has been removed (the win condition). Since DXB-06: also assigns each brick's `points` (row-weighted — back rows worth more) and accumulates a running `getScore()` total as bricks are destroyed. Since DXB-06A: bricks sized slightly smaller (`gapRatio` 0.008 → 0.01, `rowHeightRatio` 0.035 → 0.03), a tuning-only change; row/column count and scoring formula unchanged. Since DXB-08: `loadLevel(config, viewportWidth, viewportHeight)` replaces every brick with a fresh grid built from a new config *without* resetting `score`, letting a level transition carry the running score forward on the same instance. Since DXB-09: also rolls a `powerupDropChance` (default 0.15) whenever it removes a brick, queuing that brick's position for `consumePendingPowerupSpawns()` to report — the grid itself has no idea what a "powerup" is beyond a spawn point. Since DXB-10: `resolveBallCollision()` plays `'brick-break'` the instant it removes a brick. Since DXB-11: the same overlap loop now asks `Brick.takeHit()` before removing, so metal and a cracked first hit bounce without being destroyed; score and `'brick-break'` still fire only on actual destruction; bonus always queues a drop; `isCleared()` ignores remaining metal; an optional `layout` of row-strings selects types per cell (omitted → all normal). Since DXB-12: optional `{ pierce: true }` force-destroys the overlapped brick (including metal) and returns `null` so a Fire Ball continues through instead of bouncing; drop policy for metal is still `'never'`.
- `levels.ts` — DXB-08: DX-Ball's fixed level sequence, a plain `LevelConfig[]` (`LEVELS`) of partial `BrickGrid`/`Ball` config overrides, read only by `MainScene`. Since DXB-11: levels 2-3 also carry compact `layout` strings (level 2 adds cracked; level 3 adds cracked, metal, and bonus). Level 1 stays all-normal (no `layout`). Since DXB-14: Time Attack and Endless wrap this same array; Classic still wins after the last entry. Since DXB-13A: 5 entries — levels 1-3 unchanged, level 4 is metal-heavy corridors, level 5 mixes every current brick type.
- `GameMode.ts` — DXB-14: DX-Ball's mode vocabulary (`classic` | `time-attack` | `endless`), HUD labels, Time Attack's 90s duration, and Endless's gradual speed-ramp constants. Read by `ModeSelectScene` / `MainScene` only — same "data file, owning scene drives it" shape as `levels.ts`.
- `Powerup` — DXB-09: a single falling capsule; a `Container` holding a colored rounded-rect background plus a one-letter label, one fixed color+letter pair per `PowerupType`. Purely visual/motion — all "what happens when caught" logic lives in `PowerupManager`. Since DXB-12: the union and visual map also include `fire-ball` (`F`), `multi-ball` (`M`), `small-paddle` (`N`), `fast-ball` (`T`) alongside the original `W`/`S`/`L`. Since DXB-13: positives use a green family and negatives a red/orange family; letters are unchanged.
- `PowerupManager` — DXB-09: owns every currently-falling `Powerup` for one run. `spawn(x, y)` picks a random configured type; `update()` advances each capsule and checks it against the paddle (caught → queued, no penalty either way if missed) or the bottom edge (removed); `consumeCaughtPowerups()` drains the caught queue for `MainScene` to react to. Deliberately never holds a `Ball` reference (which is replaced, not mutated, on every level transition) or touches lives/score directly. Since DXB-10: `spawn()` plays `'powerup-spawn'` and a catch plays `'powerup-collect'`. Since DXB-12: the default spawn pool is the full 7-type roster (positives and negatives share the existing drop pipeline); this manager still does not know what any type does.
- `audioCues.ts` — DXB-10: DX-Ball's own 8-event sound-effect vocabulary (`DxBallSfxKey` + synthesized `ToneSpec` per key) and the single `playDxBallSfx(key)` helper every entity/scene uses. Kept out of `AudioManager` the same way `levels.ts` keeps level data out of `BrickGrid`.

## Current UI (`ui/`)

- `ScoreLabel` — DXB-06: reusable HUD widget (`Phaser.GameObjects.Text` subclass) showing a `prefix` + numeric value anchored to a viewport corner, responsively sized/positioned. Not DX-Ball-specific — `MainScene` uses four instances (`Score:` top-left, `Best:` top-right, `Lives:` bottom-left since DXB-07, `Level` bottom-right since DXB-08). Since DXB-07: anchor supports all four corners (`top-left` | `top-right` | `bottom-left` | `bottom-right`), not just the top two. Since DXB-13: bold typeface, dark stroke, drop shadow, and per-stat colors (Score white, Best gold, Lives mint, Level cyan). Since DXB-13A: optional suffix so the level label can show `Level 1 / 5`.
- `ActiveEffectsLabel` — DXB-12: reusable top-center HUD listing active effects and remaining duration (or a count suffix for untimed effects such as Multi Ball). Hidden when empty. Not DX-Ball-specific — `MainScene` decides which effects to show. Since DXB-13: same typeface / stroke / shadow as `ScoreLabel`, amber text.
- `ArcadeBackground` — DXB-13: reusable lightweight arcade backdrop (`Graphics`): navy gradient bands, a faint grid, static dots, and a vignette. Redrawn only on resize. Not DX-Ball-specific.
- `ModeLabel` — DXB-14: reusable top-center HUD showing a mode name and optional detail (Time Attack uses it for the clock). Same typeface/stroke as `ScoreLabel`. Not DX-Ball-specific.
- `SelectMenu` — DXB-14: reusable vertical option list (arrow keys, Space / Enter, click). `ModeSelectScene` is the first caller. Since DXB-13A: `destroy()` unbinds keys; configurable `depth`. Not DX-Ball-specific.
- `PauseOverlay` — DXB-13A: reusable pause/menu overlay (dim + title + `SelectMenu`). `MainScene` opens it on ESC. Not DX-Ball-specific.

## Documentation

- `docs/progress/DXB-01.md`
- `docs/progress/DXB-02.md`
- `docs/progress/DXB-03.md` (backfilled retroactively — see its own note)
- `docs/progress/DXB-04.md`
- `docs/progress/DXB-05.md`
- `docs/progress/DXB-06.md`
- `docs/progress/DXB-06A.md`
- `docs/progress/DXB-07.md`
- `docs/progress/DXB-08.md`
- `docs/progress/DXB-09.md`
- `docs/progress/DXB-10.md`
- `docs/progress/DXB-11.md`
- `docs/progress/DXB-12.md`
- `docs/progress/DXB-13.md`
- `docs/progress/DXB-14.md`
- `docs/progress/DXB-13A.md`
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

DXB-13A Quality of Life — ESC opens a pause overlay (Resume / Restart
Run / Return To Mode Selection) from every gameplay state; the
campaign is 5 levels (level 4 metal-heavy, level 5 mixed types); the
HUD shows `Level X / 5`; score, lives, and high score still carry
across the sequence. See `docs/progress/DXB-13A.md` for full details.
`npm run typecheck` and `npm run build` both verified passing.

## Next Recommended Task

The core gameplay loop now spans a 5-level campaign plus the expanded
powerup roster, audio, advanced brick types, a visual refresh, three
game modes, and a pause menu (win, lose, score, best score, lives,
levels, powerups, SFX, brick types, readable presentation, Classic /
Time Attack / Endless, ESC overlay). Good candidates going forward,
none yet confirmed with a requester:
- A live-playtested balance pass covering the new 7-type mix (drop
  chance, durations, widen/small/slow/fast multipliers) together with
  the brick-type layouts, all 5 levels' ball speed, paddle width/speed,
  starting lives, DXB-10's 8 synthesized cues, Time Attack's 90s clock,
  and Endless's speed ramp — the standing recommendation since
  DXB-06A/DXB-07/DXB-08, still using manual verification this session
  (see DXB-13A's own Known Risks).
- Visual feedback polish (a "+N" popup or flash on scoring, a flash on
  losing a life, catching a powerup, win/game-over, or a level
  transition; a crack-hit cue) — type/HUD/background presentation is
  now in; the rest of this polish item has been deferred since DXB-05.
- Background music, explicitly deferred by DXB-10's own Restrictions —
  `AudioManager`'s real-asset path and `AudioManifestEntry.category` are
  already shaped for it.
- A visible mute toggle on the pause overlay.
- Sticky Paddle, still deferred at DXB-09's own scoping.
