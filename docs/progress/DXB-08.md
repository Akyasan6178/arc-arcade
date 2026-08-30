# DXB-08 Level System

## TASK
Implement a level system for DX-Ball: instead of a single brick grid
whose clearing always wins, a fixed sequence of levels with progressively
harder layouts and ball speed, score/lives carried across the sequence,
and a HUD indicator of the current level.

## STATUS
Completed

## SCOPE
"Level System" left several genuine open decisions (what actually
changes between levels, how many levels and what happens after the last
one, whether score/lives carry over, whether there's a transition
screen, whether the level number is shown) the same way DXB-04/05/06/07
confirmed scope before implementing an ambiguously named task. Confirmed
with the requester up front:

1. **Both layout and difficulty change per level** — hand-defined brick
   layouts (row/column counts, spacing, points-per-row) *and* a ball
   speed ramp, not just one or the other.
2. **A small fixed set of levels (3), not endless/procedural** — clearing
   the last one shows the existing "YOU WIN" screen, just now reporting
   how many levels were cleared.
3. **Score and lives carry over between levels** — only the brick layout
   resets on a level transition; a full `scene.restart()` is still the
   only thing that resets score/lives back to their starting values.
4. **A brief "LEVEL CLEARED" transition message**, reusing the existing
   centered-message pattern, gated on a Space press (mirroring the
   win/game-over restart prompts) rather than an instant/silent swap.
5. **A fourth HUD label** shows the current level number, in the one
   remaining free corner (bottom-right).

## FILES CREATED
- `src/entities/dx-ball/levels.ts` — the fixed level sequence: a
  `LevelConfig` interface (`brickGrid?: BrickGridConfig`,
  `ball?: BallConfig`) and a `LEVELS` array of 3 entries. Level 1 is
  empty overrides (exactly DXB-06A's already-tuned defaults, so it is
  unchanged pixel-for-pixel). Levels 2-3 progressively add rows/columns,
  tighten spacing, raise `basePointsPerRow`, and raise `Ball`'s
  `speedRatio`.

## FILES MODIFIED
- `src/entities/dx-ball/BrickGrid.ts` — added `loadLevel(config,
  viewportWidth, viewportHeight)`, which replaces every tracked brick
  with a fresh grid built from a new config *without* touching the
  running `score`. The constructor now just calls `loadLevel()` once
  instead of duplicating its brick-building logic. `config` lost its
  `readonly` modifier (mutated on every `loadLevel()` call) and `bricks`
  changed from a reassigned array to an in-place-mutated one (`length = 0`
  + `push(...)`) so the same array reference — and the same `BrickGrid`
  instance, with its accumulated `score` — survives across levels.
- `src/scenes/MainScene.ts` — the scene now owns the level sequence:
  - `currentLevelIndex` (0-based, reset to 0 each `create()`) tracks
    which `LEVELS` entry is in play.
  - The initial `BrickGrid`/`Ball` are constructed from `LEVELS[0]`'s
    config instead of each entity's bare defaults.
  - A fourth `ScoreLabel` (`Level: `, bottom-right — the last free
    corner) shows `currentLevelIndex + 1`.
  - `update()`'s `isCleared()` branch now calls the new
    `handleLevelCleared()` instead of always calling `handleWin()`
    directly.
  - `handleLevelCleared()` defers to `handleWin()` on the last level;
    otherwise it freezes play via a new `transitioning` flag (a sibling
    to `won`/`lost` in `update()`'s top guard) and shows a "LEVEL N
    CLEARED / Get ready for Level N+1 / Press Space to continue" message.
  - `advanceToNextLevel()` (the one-shot Space handler) increments
    `currentLevelIndex`, calls `brickGrid.loadLevel()` with the next
    level's brick config (preserving score), destroys the old `ball` and
    constructs a fresh one with the next level's speed config (re-serving
    it above the paddle), resets `lastMissCount` to 0 (a fresh `Ball`'s
    own `missCount` starts at 0 too), and updates the level label.
  - `handleWin()`'s message now reports how many levels were cleared
    (`All ${LEVELS.length} levels cleared — Score: ...`), since "win" now
    implies "cleared every level", not just "cleared the one grid".
  - `handleViewportChange()` also resizes the new level label and
    repositions/rescales the level-transition message while it's shown,
    the same way it already does for the win/game-over messages.

## ARCHITECTURAL DECISIONS
- **Level data lives in `entities/dx-ball/`, not `systems/`.** A level's
  brick layout and ball speed are DX-Ball-specific gameplay rules, and
  `systems/`'s own rule (restated at every prior closure) is that nothing
  there should know a specific game's rules. `levels.ts` sits alongside
  `Paddle.ts`/`Ball.ts`/`BrickGrid.ts` in the same per-game subfolder,
  and — like every other config in this codebase — is just plain data
  (`LevelConfig[]`) that `MainScene` reads; neither `BrickGrid` nor
  `Ball` know this file exists.
- **A level transition mutates the existing `BrickGrid`/replaces `Ball`,
  rather than tearing down and rebuilding the whole scene.** `BrickGrid`
  already owned brick removal and the running score; the natural
  extension for "same run, new layout" was to let it reload its own
  bricks in place (`loadLevel()`) rather than construct a second
  `BrickGrid` and manually thread the old score into it. `Ball`, by
  contrast, has no state worth preserving across a level boundary (it
  always starts a level `attached` above the paddle, same as a fresh
  serve) and its speed is baked into its own config at construction time
  — so replacing it outright (destroy + `new Ball(...)`) was simpler than
  adding a "change my config" mutator method that would only ever be
  called once, at level-start, for one field.
- **`transitioning` is a third sibling flag to `won`/`lost`, not a merged
  state enum.** Exactly the same reasoning DXB-07's closure gave for
  adding `lost` alongside `won`: keeping them as separate booleans (all
  checked in one `if` at the top of `update()`) meant this task only
  ever added code, never touched the already-working win/game-over
  branches beyond that one guard line and the shared message-layout/
  resize helpers.
- **Clearing a level only ever means "advance" or "win", decided by one
  `currentLevelIndex >= LEVELS.length - 1` check in `handleLevelCleared()`
  — `handleWin()` itself is unaware levels exist**, beyond reading
  `LEVELS.length` for its own message text. This keeps the "is this the
  last level" branch in exactly one place.
- **Score/lives carrying over was implemented by *not resetting* them,
  not by threading them through a "level start" parameter.**
  `advanceToNextLevel()` never touches `this.lives`, `this.bestScore`, or
  calls anything that would reset `brickGrid`'s `score` — the absence of
  a reset *is* the "carries over" behavior, the same way DXB-06 already
  established that only a full restart (a brand-new `BrickGrid`) zeroes
  the score.
- **Every level (including the first) is now driven through `LEVELS`,
  not a hardcoded call site plus overrides for levels 2+.** Level 1's
  entry is empty overrides (`{}`), so `BrickGrid`/`Ball`'s own
  `DEFAULT_CONFIG` still fully determines its values — but `create()`
  reads it from `LEVELS[0]` the same way `advanceToNextLevel()` reads
  every later level, rather than special-casing "the first level is
  whatever the constructor defaults to" as a separate code path.

## REQUIREMENTS VERIFICATION
Manually verified in a running dev build (Chrome DevTools Protocol
automation), using a temporary debug hook exposing the `Phaser.Game`
instance on `window` (added, used, then fully reverted before this
change set was finalized — `git diff --stat src/main.ts` confirmed zero
diff, the same discipline every prior task's closure since DXB-06A has
documented):
- Fresh load shows all four labels at their anchored corners: `Score: 0`
  (top-left), `Best: 0` (top-right), `Lives: 3` (bottom-left), `Level: 1`
  (bottom-right), with a 5×8 brick grid (level 1's — unchanged from
  DXB-06A's defaults).
- Force-clearing level 1's bricks (destroying them directly, then
  calling `scene.update()` once — the same deterministic-driving
  technique DXB-06A/DXB-07's closures used to work around this
  environment's unreliable real-time `requestAnimationFrame` timing)
  correctly set `transitioning = true` and showed `"LEVEL 1 CLEARED / Get
  ready for Level 2 / Press Space to continue"`, confirming
  `handleLevelCleared()`.
- Calling `advanceToNextLevel()` directly (bypassing the actual Space
  keypress, which this environment's CDP restrictions and unfocused-tab
  issues make unreliable to simulate — same limitation as every prior
  task) produced a 6-row (48-brick) grid, `Ball`'s config `speedRatio`
  `0.68` (level 2's value), the score preserved at a manually-set `250`,
  and the `Level: 2` label — confirming layout swap, speed ramp, score
  carry-over, and the HUD update all together.
- Repeating that for level 3 produced a 7×9 (63-brick) grid and
  `speedRatio` `0.76`; clearing level 3 set `won = true` (not another
  transition) with the message `"YOU WIN\nAll 3 levels cleared — Score:
  250\nPress Space to play again"`, confirming the last-level branch in
  `handleLevelCleared()` and the updated win message.
- Calling `scene.scene.restart()` from that won state reset
  `currentLevelIndex` to `0`, `score` to `0`, `lives` to `3`, and rebuilt
  a fresh 5×8 (40-brick) grid/`Level: 1` label, while `bestScore`
  correctly stayed at the persisted `250` — confirming a full restart
  resets exactly the same things DXB-07 already established (score,
  lives, per-run state) and nothing more, i.e. the level sequence
  restarts too but the best score does not.

`npm run typecheck` and `npm run build` both pass with no errors.

## KNOWN RISKS
- **None of the 3 levels' layout/speed values were live-playtested** —
  each is a reasoned, requested-direction difficulty bump (more
  rows/columns, tighter spacing, higher points, faster ball), verified
  only by `typecheck`/`build`/deterministic state inspection, not by
  actually playing through them. This is a continuation of the same
  "placeholder, not playtested" risk flagged in every prior task's Known
  Risks, now extended to 3 levels' worth of values instead of 1.
- **This environment's browser-automation tab is still unreliable for
  real-time, input-driven verification** (the same finding every closure
  since DXB-06A has documented: an unfocused/throttled
  `requestAnimationFrame` loop, and CDP `Input.*` methods being denied
  outright in this tool). Every check above drove state directly
  (destroying bricks, calling `handleLevelCleared()`/
  `advanceToNextLevel()` as plain method calls) rather than through an
  actual played-out level or a real Space keypress. The Space-press →
  `advanceToNextLevel()` wiring itself (the `once('keydown-SPACE', ...)`
  listener registration) was code-reviewed but not exercised via a real
  keyboard event in this session, the same gap DXB-04/06/07's own win/
  game-over restart listeners have had since their own closures.
- **3 levels is a placeholder count, not a requested-and-confirmed
  final number** — chosen as "a small fixed set" per the confirmed
  scope, but nothing about the architecture (a plain `LevelConfig[]`)
  makes adding a 4th/5th level anything more than appending another
  entry; this was a starting count, not a hard ceiling.
- **No visual/audio feedback for a level transition beyond the text
  message** (e.g. a fade, a sound, a brief pause before the message
  appears) — continuing the same "no sound/audio system exists yet"
  and "no tween/flash feedback" gaps flagged since DXB-05/DXB-06/DXB-07.
- **The temporary `window.__debugGame` hook used for verification
  mirrors every prior task's own temporary debug hook** — same
  technique, same full revert before finalizing (confirmed via `git diff
  --stat src/main.ts` showing zero diff).

## NEXT RECOMMENDED TASK
The core gameplay loop now spans a full level sequence (win, lose,
score, best score, lives, levels) — every "next recommended task" since
DXB-04 has now been addressed, including the level system itself. Good
candidates going forward, none yet confirmed with a requester:
- **A live-playtested balance pass** covering all 3 levels' layouts/ball
  speed together with paddle width/speed and starting lives — the
  standing recommendation since DXB-06A/DXB-07, now with 3 levels' worth
  of values to tune instead of 1, still blocked on this environment's
  recurring browser-automation playtesting limitations.
- **Visual/audio feedback polish** — a "+N" popup or label flash on
  scoring, a flash/sound on losing a life, a sound/fade on a level
  transition or win/game-over. Repeatedly raised and repeatedly deferred
  since DXB-05.
- **A sound/audio system** (`systems/` still lists it as an unbuilt
  example) or a pause/main menu (`ui/` still has no menu component).
