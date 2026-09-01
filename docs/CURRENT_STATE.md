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
- ✅ DXB-15 Theme & Visual Identity System
- ✅ DXB-16 Unlockables & Achievements
- ✅ DXB-17 Stats & Leaderboards
- ✅ DXB-18 Garage & Collection Hub
- ✅ DXB-18A UI Navigation Refactor
- ✅ DXB-19 Content Expansion
- ✅ DXB-20 Release Candidate
- ✅ DXB-21 Balance Pass
- ✅ DXB-22 Audio & Cosmetic Pass
- ✅ DXB-23 Game Feel, Visual Depth & Presentation Pass

## Technology Stack

- Phaser 4
- TypeScript
- Vite

## Current Architecture

```
src/
  scenes/     BootScene -> PreloadScene -> HubScene
              Play: ThemeSelectScene -> ModeSelectScene -> (Classic: LevelSelectScene) -> MainScene
              (GarageScene, StatsScene, AchievementsScene, SettingsScene,
              TutorialScene, CreditsScene are Hub side screens)
  systems/    GameViewport, SceneKeys, HighScoreStore, AudioManager, ThemeStore, JsonStore
  entities/   dx-ball/ (Paddle, Ball, Brick, BrickType, BrickGrid, levels, GameMode, Theme, Progress, Leaderboards, Skins, Powerup, PowerupManager, PowerupDropTable, paddleCosmetic, Version, audioCues)
  ui/         ScoreLabel, ActiveEffectsLabel, ArcadeBackground, ModeLabel, SelectMenu, PauseOverlay, ResultOverlay, ProgressList, StatsList, CollectionPreview, CatchFlash, TextButton, TabBar, LevelBrowser, menuLayout
  assets/     dx-ball/audio-manifest.ts (empty real-asset list; SFX and theme music use synthesized fallbacks)
```

**Scenes**
- `BootScene` — first scene to run; minimal setup, hands off to `PreloadScene`.
- `PreloadScene` — loads assets and shows loading progress, hands off to `HubScene` (since DXB-18A; previously `ThemeSelectScene` since DXB-15, and `ModeSelectScene` since DXB-14). Since DXB-10: also loops over `DX_BALL_AUDIO_MANIFEST` calling `this.load.audio()` for each entry (currently zero, so a no-op today).
- `HubScene` — DXB-18A: visible main menu (Play / Garage / Tutorial / Statistics / Achievements / Credits / Settings). Owns an `ArcadeBackground`, a title, and a `SelectMenu`. Play starts `ThemeSelectScene`. Optional G / S / U shortcuts still open Garage / Stats / Achievements. No gameplay. Since DXB-20: shared menu chrome from `menuLayout.ts`. Since DXB-23: Tutorial / Credits rows, accent rule, and `DX-Ball v1.0.0` in the subtitle.
- `ThemeSelectScene` — DXB-15: pre-run Neon Arcade / Space / Laboratory picker with a live backdrop preview. Persists the choice via `ThemeStore`. Owns an `ArcadeBackground`, a title, a `SelectMenu`, and (since DXB-18A) a visible Back button to the Hub; starts `ModeSelectScene`. No gameplay. Since DXB-16: Space and Laboratory are locked until their unlock gates are met (preview still works; confirm does not). Since DXB-19: Retro Grid / Frozen Core / Inferno join the same list (six themes); the menu is compacted so every option stays on-screen. Optional G / S / U shortcuts still open Garage / Stats / Achievements.
- `ModeSelectScene` — DXB-14: pre-run Classic / Time Attack / Endless picker. Paints the saved theme; Esc and a visible Back button (DXB-18A) return to ThemeSelect. Owns an `ArcadeBackground`, a title, and a `SelectMenu`. Time Attack / Endless start `MainScene` with `{ mode }`. Since DXB-23: Classic starts `LevelSelectScene` so campaign layouts can be inspected first. No gameplay. Optional G / S / U shortcuts still open Garage / Stats / Achievements.
- `LevelSelectScene` — DXB-23: Classic campaign browser. Miniature brick-map thumbnails, level number, and name for all 10 campaign entries. Confirm starts `MainScene` with `{ mode: 'classic', startLevelIndex }`. Esc / Back return to Mode Select. No gameplay.
- `TutorialScene` — DXB-23: Hub how-to (Paddle / Bricks / Powerups / Modes / Unlocks tabs). Esc / Back return to the Hub. No gameplay.
- `CreditsScene` — DXB-23: title, `DX-Ball v1.0.0`, and development credits. Esc / Back return to the Hub. No gameplay.
- `AchievementsScene` — DXB-18A: dedicated achievements list (the catalog that lived inside Unlockables in DXB-16). Locked / unlocked / percent rows; no equip. Visible Back and Esc return to the Hub (or ThemeSelect / ModeSelect). No gameplay.
- `StatsScene` — DXB-17: statistics screen. Since DXB-18A: visible tabs for Lifetime Stats (includes personal bests) / Leaderboards / Progress, plus a Back button. Leaderboards still open a per-mode Top 10; Back from a board returns to the mode list first. Esc still works. No gameplay.
- `GarageScene` — DXB-18: collection / customization hub with a live preview of the highlighted theme + paddle + ball. Since DXB-18A: visible Themes / Paddles / Balls tabs, a Back button, and a Favorite button so catalogs are usable without a nested hub or keyboard. Space / tap equips an unlocked cosmetic; F still toggles that catalog's single favorite. Collection percents show in the subtitle. No gameplay. Since DXB-22: the preview animates paddle / ball cosmetics and theme atmosphere.
- `SettingsScene` — DXB-18A: dedicated settings screen that surfaces the existing `AudioManager` mute flag as a visible Sound On/Off toggle. M still toggles globally (SFX and theme music). Visible Back and Esc return to the Hub. No gameplay.
- `MainScene` — the active DX-Ball gameplay scene. Owns and drives `Paddle`, `Ball`, and `BrickGrid` each frame; subscribes to `GameViewport` to keep the camera and every entity in sync with resizes; since DXB-04, also owns the win/restart flow (freezes the update loop and shows a win message once `BrickGrid.isCleared()`, restarting the scene via `this.scene.restart()` on Space). Since DXB-06: also owns the score HUD — polls `BrickGrid.getScore()` every frame into a `ScoreLabel`, tracks/persists a best score via `HighScoreStore` the moment it's passed, and reports the final score in the win message. Since DXB-07: also owns the lives/lose flow — starts each run with 3 lives, polls `Ball.getMissCount()` every frame to decrement them, and once they reach zero freezes the loop (mirroring the win flow via a sibling `lost` flag) and shows a "GAME OVER" message with the same restart-on-Space mechanic. Since DXB-08: also owns the level sequence (`entities/dx-ball/levels.ts`) — `isCleared()` now advances to the next level (`BrickGrid.loadLevel()` + a fresh `Ball`, both preserving score/lives) behind a "LEVEL CLEARED" transition message, and only calls `handleWin()` once the last level is cleared. Since DXB-09: also owns a `PowerupManager` for the run — every frame it drains `BrickGrid`'s queued powerup spawns into it, advances it, and dispatches any caught capsule's effect (`extra-life` bumps lives directly; `widen-paddle`/`slow-ball` delegate to `Paddle`/`Ball`); a level transition clears any still-falling capsules. Since DXB-10: plays the four scene-owned audio cues (`life-lost`, `level-complete`, `game-over`, `victory`) at the same code paths that already detect those events, and wires the `M` key to `AudioManager.toggle()` as a global mute (a keybinding, not a HUD control). Since DXB-12: owns a `balls[]` instead of a single `ball` so Multi Ball can coexist with lives/levels (extras spend on miss; lives still only decrement when the last ball is gone); `applyPowerupEffect()` also dispatches Fire Ball / Fast Ball / Small Paddle / Multi Ball; an `ActiveEffectsLabel` at top-center lists every active effect and its remaining duration. Since DXB-13: also owns an `ArcadeBackground` behind the playfield (created first, resized with the viewport); HUD corner colors and overlay messages share one typeface/stroke language. Since DXB-14: `init({ mode })` selects Classic / Time Attack / Endless; Classic is the unchanged loop; Time Attack adds a 90s countdown that ends in TIME'S UP (levels wrap); Endless wraps `LEVELS` and ramps ball speed; a `ModeLabel` shows the active mode; Space on an end screen restarts the same mode. Since DXB-13A: ESC opens a `PauseOverlay` (Resume / Restart Run / Leave Run) from every gameplay state and freezes the update loop while it is open; the campaign is 10 levels (since DXB-19; levels 1–5 unchanged) and the HUD shows `Level X / 10` in Classic. Since DXB-15: reads the persisted theme and applies it to the backdrop, HUD, brick palette, powerup palette, pause card, and a `ResultOverlay` for victory / game over / time-up / level-clear. Since DXB-16: records lifetime unlock stats (score deltas, powerup catches, metal hits, Fire Ball destroys, Multi Ball activations, Classic completion / perfect run, Time Attack best, Endless level) and applies the equipped paddle / ball skins. Since DXB-17: the same recording path also counts games played, bricks destroyed, per-mode personal bests, overall highest, and live play time, and submits a finished run to that mode's local Top 10. Since DXB-20: a visible Pause button, tap-to-continue on result cards, HUD safe-area insets, and wrapping modes that show `Level N` without a campaign denominator. Since DXB-21: Fire Ball lasts 7s (was 10s), Multi Ball extras split ±10° (was ±20°), Time Attack applies a 1.15× speed fold (timer still 90s), and Endless ramps at +0.15%/s (cap still 2×). Since DXB-22: starts the theme music bed, flashes a short color overlay on powerup catch, and result cards use a kicker / reward hierarchy (Endless shows a run summary; Time Attack shows TIME'S UP as a complete screen). Since DXB-23: Classic may start at a browsed `startLevelIndex`; Multi Ball extras split ±5°; drop rarity lives in `PowerupDropTable.ts`. Gameplay ownership of score / lives / powerups / audio cues is unchanged.

**Systems**
- `GameViewport` — game-agnostic responsive-viewport service (singleton). Wraps Phaser's Scale Manager plus browser resize/orientation/safe-area concerns into one snapshot (`width`, `height`, `centerX/Y`, `isPortrait/Landscape`, `safeArea`) with a subscribable `onChange()`.
- `SceneKeys` — centralizes scene key strings (`Boot`, `Preload`, `Hub`, `ThemeSelect`, `ModeSelect`, `LevelSelect`, `Tutorial`, `Credits`, `Achievements`, `Stats`, `Garage`, `Settings`, `Main`).
- `HighScoreStore` — DXB-06: game-agnostic `localStorage` wrapper (`get(key)` / `set(key, value)`) for persisting a best score across restarts/reloads. Knows nothing about DX-Ball or any scoring rule — the caller picks the key.
- `ThemeStore` — DXB-15: game-agnostic string `localStorage` wrapper for a selected theme id. Knows nothing about palettes — `entities/dx-ball/Theme.ts` owns those.
- `JsonStore` — DXB-16: game-agnostic JSON `localStorage` wrapper (`get<T>(key)` / `set(key, value)`). Knows nothing about achievements, leaderboards, or favorites — `entities/dx-ball/Progress.ts` and `Leaderboards.ts` own those.
- `AudioManager` — DXB-10: game-agnostic audio singleton (`AudioManager.init(game)` once in `main.ts`, `AudioManager.get()` from anywhere). `play(key, fallback)` prefers a Phaser-cached audio asset under `key` if one exists, otherwise synthesizes `fallback` (`ToneSpec`) via the Web Audio API. DXB-22 adds `playMusic(key, fallback)` on the same two-path seam (looped Phaser asset, else a synthesized `MusicLoopSpec`). SFX and music use separate internal volume buses; the global `enabled` flag (`isEnabled()` / `setEnabled()` / `toggle()`, persisted under `arc-arcade-audio-enabled`) still gates every call and stops music immediately. Every operation is defensive and never throws. Knows nothing about DX-Ball's specific cues — those live in `entities/dx-ball/audioCues.ts`.

## Current Entities (`dx-ball/`)

- `Paddle` — rectangle game object; responsive size/position; mouse/touch (pointer) + keyboard (arrow key) control with speed-capped smoothing; clamped to viewport width. Since DXB-04: `checkBallCollision(ballX, ballY, ballRadius)` reports which axis a ball overlapping it should bounce along. Since DXB-05: `computeHitOffset(x)` reports where on the paddle (`-1` left edge .. `1` right edge) a point sits, used to vary the ball's bounce angle. Since DXB-06A: default width narrowed ~20% (`widthRatio` 0.16 → 0.128), a tuning-only change. Since DXB-09: `applyWidenBoost(durationMs)` applies a temporary `1.5x` width multiplier that the paddle counts down and reverts itself every frame. Since DXB-12: `applyShrinkEffect(durationMs)` applies a temporary `0.65x` width (Small Paddle), mutually exclusive with widen; getters expose remaining ms for the effects HUD. Since DXB-16: `applySkin()` accepts cosmetic fill / stroke / motif tokens from the owning scene; size and collision are unchanged. Since DXB-19: crystal / plates / pulse / shard motifs join the existing flat / bands / glow / core set. Since DXB-22: those motifs animate with Phaser Graphics (shimmer, metal sweep, pulse rings, reactor glow, dark aura); collision is unchanged. Since DXB-23: each motif paints a unique silhouette (robot pistons, alien waves, reactor core, pulse slug) via `paddleCosmetic.ts`; the rectangle stays the collision body and is hidden.
- `Ball` — circle game object; responsive size/speed; `attached` / `launched` serve state machine (Space to launch, exactly once per serve); bounces off left/right/top viewport edges; a bottom exit re-serves it above the paddle. Since DXB-03: bounces off bricks via `BrickGrid.resolveBallCollision()`. Since DXB-04: also bounces off the paddle via `Paddle.checkBallCollision()`, checked every launched frame right before the brick check. Since DXB-05: a paddle hit's bounce angle now varies by where on the paddle it landed (center = straight up, edges deviate up to 60°), and a launched frame's motion is split into small collision-checked substeps (capped to half the ball's radius each) instead of one big step, closing a tunneling gap at high speed. Since DXB-07: also tracks a running `missCount` (incremented on every bottom-edge miss), exposed via `getMissCount()` for `MainScene` to poll into a lives system. Since DXB-09: `applySlowEffect(durationMs)` applies a temporary `0.6x` speed multiplier, folded into launch/resize speed and ticked/reverted every frame regardless of serve state. Since DXB-10: `resolvePaddleCollision()` plays `'paddle-hit'` on the rising edge of paddle overlap (so a single contact spanning several substeps does not replay the cue). Since DXB-11: also applies the separation vector `BrickGrid.resolveBallCollision()` now returns, so a brick that survives the hit (metal, cracked first hit) cannot be re-overlapped on the next substep; the ball still does not know brick types exist. Since DXB-12: `applyFireEffect()` (timed pierce — the ball asks the grid `{ pierce: true }` and tints orange); `applyFastEffect()` (`1.45x`, mutually exclusive with slow); extra-ball miss behavior for Multi Ball (`becomeExtra()` / `setMissBehavior('spend')` marks a bottom-edge exit spent instead of re-serving). Since DXB-13: Fire Ball also shows a gold stroke and a larger translucent glow circle; pierce behavior is unchanged. Since DXB-14: `setProgressionMultiplier()` folds an extra speed scale into launch/resize/travel (Endless); slow/fast still apply on top; the ball still does not know modes exist. Since DXB-16: `applySkin()` accepts cosmetic fill / stroke / idle glow; Fire Ball still overrides while active. Since DXB-19: optional inner-core overlay for later ball skins (hidden during Fire Ball). Since DXB-21: Time Attack also writes a constant 1.15× into that same progression fold; Fire duration is owned by the scene (7s), not the ball. Since DXB-22: idle skins animate glow / core / an energy shell from an `fx` token; Fire Ball still fully overrides appearance while active.
- `Brick` — single rectangle grid cell; owns its row/column identity. Since DXB-06: also carries a fixed `points` value, assigned once by `BrickGrid` at creation. Since DXB-11: also carries `brickType` plus remaining hit-points and type-driven appearance (`takeHit()` / healthy-vs-cracked fill and stroke); metal/bonus override the row color. Collision, scoring, and drops still live in `BrickGrid`. Since DXB-12: `takeHit({ fire: true })` destroys in one hit, including metal — only `BrickGrid` passes that flag. Since DXB-13: a sibling `Graphics` overlay draws type-specific detail (clean bevel, crack lines, metallic bands, gold bonus pip) without changing the collision rectangle. Since DXB-15: optional theme type visuals override fill/stroke only; `takeHit()` is unchanged. Since DXB-23: richer overlay recipes (3D bevel, split cracked damage, riveted steel, gem bonus); mechanics are unchanged.
- `BrickType.ts` — DXB-11: reusable brick-type vocabulary (`normal` | `cracked` | `metal` | `bonus`), a `BRICK_TYPE_SPECS` data table (hit count, score, drop policy, fill/stroke), and the compact layout parser (`N`/`C`/`M`/`B`/`.`). Kept out of `BrickGrid` the same way `levels.ts` keeps level data out of the grid.
- `BrickGrid` — owns the full set of `Brick`s (default 5 rows × 8 columns, one color per row); responsive layout; `resolveBallCollision()` checks a ball against every remaining brick and safely removes the first one it overlaps. Since DXB-04: `isCleared()` reports whether every brick has been removed (the win condition). Since DXB-06: also assigns each brick's `points` (row-weighted — back rows worth more) and accumulates a running `getScore()` total as bricks are destroyed. Since DXB-06A: bricks sized slightly smaller (`gapRatio` 0.008 → 0.01, `rowHeightRatio` 0.035 → 0.03), a tuning-only change; row/column count and scoring formula unchanged. Since DXB-08: `loadLevel(config, viewportWidth, viewportHeight)` replaces every brick with a fresh grid built from a new config *without* resetting `score`, letting a level transition carry the running score forward on the same instance. Since DXB-09: also rolls a `powerupDropChance` (default 0.15) whenever it removes a brick, queuing that brick's position for `consumePendingPowerupSpawns()` to report — the grid itself has no idea what a "powerup" is beyond a spawn point. Since DXB-10: `resolveBallCollision()` plays `'brick-break'` the instant it removes a brick. Since DXB-11: the same overlap loop now asks `Brick.takeHit()` before removing, so metal and a cracked first hit bounce without being destroyed; score and `'brick-break'` still fire only on actual destruction; bonus always queues a drop; `isCleared()` ignores remaining metal; an optional `layout` of row-strings selects types per cell (omitted → all normal). Since DXB-12: optional `{ pierce: true }` force-destroys the overlapped brick (including metal) and returns `null` so a Fire Ball continues through instead of bouncing; drop policy for metal is still `'never'`. Since DXB-15: optional `typeVisuals` plus themed `colors` from `MainScene`; collision/score/drop paths are unchanged. Since DXB-16: queues `BrickHitEvent`s (`consumePendingHits()`) so the owning scene can count metal hits and Fire Ball destroys; the grid still does not know achievements exist.
- `levels.ts` — DXB-08: DX-Ball's fixed level sequence, a plain `LevelConfig[]` (`LEVELS`) of partial `BrickGrid`/`Ball` config overrides, read only by `MainScene`. Since DXB-11: levels 2-3 also carry compact `layout` strings (level 2 adds cracked; level 3 adds cracked, metal, and bonus). Level 1 stays all-normal (no `layout`). Since DXB-14: Time Attack and Endless wrap this same array; Classic still wins after the last entry. Since DXB-13A: 5 entries — levels 1-3 unchanged, level 4 is metal-heavy corridors, level 5 mixes every current brick type. Since DXB-19: 10 entries — levels 1-5 unchanged, level 6 precision, level 7 cracked-heavy, level 8 metal maze, level 9 bonus risk/reward, level 10 mixed finale. Since DXB-23: each entry has a display `name` and `getLevelPreviewModel()` for Level Select thumbnails; layouts are unchanged.
- `GameMode.ts` — DXB-14: DX-Ball's mode vocabulary (`classic` | `time-attack` | `endless`), HUD labels, Time Attack's 90s duration, and Endless's gradual speed-ramp constants. Read by ModeSelect / MainScene / StatsScene / Leaderboards — same "data file, owning scene drives it" shape as `levels.ts`. Since DXB-21: Time Attack also names a 1.15× speed fold; Endless ramps at +0.15%/s (cap still 2×); duration stays 90s.
- `Theme.ts` — DXB-15: DX-Ball's visual-identity vocabulary (`neon-arcade` | `space` | `laboratory`, plus DXB-19 `retro-grid` | `frozen-core` | `inferno`), labels, backdrop/HUD/brick/powerup/overlay palettes, and load/save helpers. Read by ThemeSelect / ModeSelect / MainScene. `BrickGrid` / `Ball` / `Paddle` never import it. Since DXB-16: Space and Laboratory are gated by `Progress.ts`; this file still only names palettes. Since DXB-19: Retro Grid, Frozen Core, and Inferno palettes join the table.
- `Progress.ts` — DXB-16: lifetime stats, unlock gates (themes / paddle skins / ball skins), the seven achievements, and selected skin persistence. Unlocks are derived from stats. Read by ThemeSelect / Achievements / Garage / MainScene. Since DXB-17: the same blob also holds games played, overall / Classic / Endless bests, bricks destroyed, and play time; display rows feed `StatsScene`. Since DXB-18: one favorite theme / paddle / ball lives under a sibling `dx-ball-favorites` key; collection percents (themes / paddles / balls / total) feed `GarageScene`. Since DXB-19: six themes, eight paddles, eight balls; `classicCompletions` is seeded from `classicCompleted` on old saves so Retro Grid can gate on two Classic clears without wiping progress.
- `Leaderboards.ts` — DXB-17: local Top 10 scores per mode (`classic` / `time-attack` / `endless`). Separate `dx-ball-leaderboards` key. `MainScene` submits a run once; `StatsScene` reads the lists.
- `Skins.ts` — DXB-16: paddle / ball cosmetic tokens. `Paddle` / `Ball` never import it; the owning scene applies visuals. Since DXB-19: Crystal / Titan / Pulse / Obsidian paddles and Ice Core / Dark Matter / Solar / Nova balls. Since DXB-22: ball tokens also name an idle `fx` for animation; no new skin ids. Since DXB-23: paddle motifs still use these ids; unique silhouettes live in `paddleCosmetic.ts`.
- `Powerup` — DXB-09: a single falling capsule; a `Container` holding a colored rounded-rect background plus a one-letter label, one fixed color+letter pair per `PowerupType`. Purely visual/motion — all "what happens when caught" logic lives in `PowerupManager`. Since DXB-12: the union and visual map also include `fire-ball` (`F`), `multi-ball` (`M`), `small-paddle` (`N`), `fast-ball` (`T`) alongside the original `W`/`S`/`L`. Since DXB-13: positives use a green family and negatives a red/orange family; letters are unchanged. Since DXB-15: each type has a unique Graphics icon (heart, flame, spheres, expand, shrink, slow, fast); the letter is a small secondary cue; colors come from the active theme palette.
- `PowerupManager` — DXB-09: owns every currently-falling `Powerup` for one run. `spawn(x, y)` picks a random configured type; `update()` advances each capsule and checks it against the paddle (caught → queued, no penalty either way if missed) or the bottom edge (removed); `consumeCaughtPowerups()` drains the caught queue for `MainScene` to react to. Deliberately never holds a `Ball` reference (which is replaced, not mutated, on every level transition) or touches lives/score directly. Since DXB-10: `spawn()` plays `'powerup-spawn'` and a catch plays `'powerup-collect'`. Since DXB-12: the default spawn pool is the full 7-type roster (positives and negatives share the existing drop pipeline); this manager still does not know what any type does. Since DXB-15: optional theme `palette` is forwarded into each capsule; spawn/catch/audio are unchanged. Since DXB-23: type picking uses `PowerupDropTable.ts` (weighted; Extra Life 3%, Fire Ball 8%) instead of a uniform draw.
- `PowerupDropTable.ts` — DXB-23: integer weights and `pickWeightedPowerupType()`. BrickGrid still only decides whether a capsule drops.
- `paddleCosmetic.ts` — DXB-23: shared paddle-body drawing for gameplay and Garage. Collision stays on `Paddle`.
- `Version.ts` — DXB-23: `DX-Ball v1.0.0` for Hub / Credits.
- `audioCues.ts` — DXB-10: DX-Ball's own 8-event sound-effect vocabulary (`DxBallSfxKey` + synthesized `ToneSpec` per key) and the single `playDxBallSfx(key)` helper every entity/scene uses. DXB-22 also owns theme music keys / synthesized `MusicLoopSpec` beds and `playDxBallThemeMusic(themeId)`. Kept out of `AudioManager` the same way `levels.ts` keeps level data out of `BrickGrid`.

## Current UI (`ui/`)

- `ScoreLabel` — DXB-06: reusable HUD widget (`Phaser.GameObjects.Text` subclass) showing a `prefix` + numeric value anchored to a viewport corner, responsively sized/positioned. Not DX-Ball-specific — `MainScene` uses four instances (`Score:` top-left, `Best:` top-right, `Lives:` bottom-left since DXB-07, `Level` bottom-right since DXB-08). Since DXB-07: anchor supports all four corners (`top-left` | `top-right` | `bottom-left` | `bottom-right`), not just the top two. Since DXB-13: bold typeface, dark stroke, drop shadow, and per-stat colors (Score white, Best gold, Lives mint, Level cyan). Since DXB-13A: optional suffix so the level label can show `Level 1 / 5`. Since DXB-15: those per-stat colors come from the active theme. Since DXB-19: Classic HUD suffix is ` / 10` because `LEVELS.length` grew. Since DXB-20: optional safe-area insets; wrapping modes omit the campaign denominator.
- `PauseOverlay` — DXB-13A: reusable pause/menu overlay (dim + title + `SelectMenu`). `MainScene` opens it on ESC or a visible Pause button (DXB-20). Since DXB-15: framed panel, accent bar, themed menu. Not DX-Ball-specific.
- `ResultOverlay` — DXB-15: reusable end/transition card (dim + framed panel + title + body). `MainScene` uses it for victory, game over, time-up, and level-clear. Since DXB-20: tap-to-continue plus a hint line. Since DXB-22: kicker + reward line and theme-colored panel glow. Not DX-Ball-specific.
- `CatchFlash` — DXB-22: one-shot full-viewport color flash for collection feedback. Not DX-Ball-specific.
- `CollectionPreview` — DXB-18: live Garage preview. DXB-23 reuses `paddleCosmetic.ts` for paddle silhouettes.
- `TextButton` — DXB-18A: reusable tappable label. Visible Back / Favorite / Settings / Pause controls.
- `TabBar` — DXB-18A: reusable horizontal tab strip (tap or Left / Right). Garage and Statistics are the first callers.
- `menuLayout` — DXB-20: shared menu chrome tokens (title / subtitle / hint / Back placement). Hub and every side screen read these so spacing stays consistent. Since DXB-23: accent rule and version caption helpers.
- `LevelBrowser` — DXB-23: Classic campaign thumbnail grid. Not a gameplay system.

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
- `docs/progress/DXB-15.md`
- `docs/progress/DXB-16.md`
- `docs/progress/DXB-17.md`
- `docs/progress/DXB-18.md`
- `docs/progress/DXB-18A.md`
- `docs/progress/DXB-19.md`
- `docs/progress/DXB-20.md`
- `docs/progress/DXB-21.md`
- `docs/progress/DXB-22.md`
- `docs/progress/DXB-23.md`
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

DXB-23 Game Feel, Visual Depth & Presentation Pass. Weighted powerup
drops (Extra Life 3% very rare, Fire Ball 8% rare; no two types share a
weight). Multi Ball extras split ±5°. Brick overlays and paddle
silhouettes are more distinctive (mechanics unchanged). Classic opens a
level browser with named miniature layouts. Tutorial, Credits, and
`DX-Ball v1.0.0` are Hub-visible. No currency, purchases, online
systems, or new modes. See `docs/progress/DXB-23.md`. `npm run typecheck`
and `npm run build` both verified passing.

## Next Recommended Task

Ship / host the release candidate. Remaining optional polish:
- A visible mute toggle on the pause overlay.
- Sticky Paddle, still deferred at DXB-09's own scoping.
- Real music files dropped into the named manifest keys.
- A "+N" popup or crack-hit cue — collection flash is now in; those
  other feedback pops are still deferred since DXB-05.
