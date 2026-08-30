# DXB-13A Quality of Life

## TASK
Improve DX-Ball usability and replayability: a global ESC pause/menu
overlay (Resume / Restart Run / Return To Mode Selection), expand the
campaign from 3 levels to 5, keep score / lives / high score carrying
across the sequence, and show `Level X / 5` on the HUD.

## STATUS
Completed. `npm run typecheck` and `npm run build` both pass (see
Requirements Verification).

## SCOPE
Confirmed by the task itself, with no remaining open product decisions:

1. **ESC is a pause overlay, not an instant mode-select** — from every
   gameplay state (in play, level-clear, win, game-over, time-up). A
   second ESC or Resume closes it. Restart Run and Return To Mode
   Selection are menu actions. No new powerups, themes, market, or
   leaderboard.
2. **Campaign grows to 5 by appending two layouts** — levels 1-3 stay
   as authored. Level 4 is metal-heavy corridors. Level 5 mixes every
   current brick type. Classic still wins on the last entry; Time
   Attack / Endless still wrap `LEVELS`.
3. **Score, lives, and high score are unchanged** — the same
   `BrickGrid.loadLevel()` carry-forward and `HighScoreStore` path.
4. **HUD is `Level X / 5`** — the existing bottom-right `ScoreLabel`
   gains an optional suffix rather than a new widget.

## FILES CREATED
- `src/ui/PauseOverlay.ts` — reusable dim + title + `SelectMenu`
  overlay. Not DX-Ball-specific.
- `docs/progress/DXB-13A.md` — this file.

## FILES MODIFIED
- `src/ui/SelectMenu.ts` — `destroy()` unbinds Space / Enter / arrows
  so a closed overlay cannot steal input; configurable `depth`; empty
  descriptions stay hidden.
- `src/ui/ScoreLabel.ts` — `setValue(value, suffix?)` for `Level 1 / 5`.
- `src/entities/dx-ball/levels.ts` — levels 4 (metal-heavy) and 5
  (mixed N/C/M/B). Levels 1-3 unchanged.
- `src/scenes/MainScene.ts` — global ESC toggle; pause freezes the
  update loop (including Time Attack / Endless ramp); Space
  continue/restart is unbound while the menu is open and restored on
  Resume; HUD shows `Level X / 5`.
- `src/ui/README.md` — documents the overlay, `destroy()`, and suffix.
- `docs/CURRENT_STATE.md` — see below.

## ARCHITECTURAL DECISIONS
- **Pause is a `ui/` overlay, not a new scene.** `MainScene` still owns
  the run. Opening the menu sets a `paused` flag and skips `update()`
  before the timer / entities tick, so gameplay, Time Attack, and
  Endless speed all freeze without a second scene or a physics pause
  API.
- **`SelectMenu` is reused.** DXB-14 already built the option list;
  the overlay only adds a dimmer and a title. `destroy()` was the
  missing seam so Space cannot both confirm Resume and continue a
  level-clear in the same keydown.
- **ESC no longer jumps to mode select.** DXB-14's end-screen Esc
  shortcut is now "open the menu"; Return To Mode Selection is the
  explicit action. Space on an end screen still restarts when the
  menu is closed.
- **Two new `LEVELS` entries, same data shape.** No new brick types
  and no new powerups. `isCleared()` still ignores leftover metal, so
  level 4 is clearable despite the heavier cages.
- **Suffix on `ScoreLabel`, not a fifth HUD class.** Score / Best /
  Lives keep calling `setValue(n)`.

## REQUIREMENTS VERIFICATION
`npm run typecheck` and `npm run build` both pass with no errors.

Verified by construction / code review (and a browser pass of the
pause overlay plus the `Level 1 / 5` HUD):

- **ESC works from all gameplay states** — one scene-scoped
  `keydown-ESC` listener; `togglePauseMenu()` does not care about
  `won` / `lost` / `timedOut` / `transitioning`.
- **Resume works** — closes the overlay, restores Space continue /
  restart if those states are still active, gameplay resumes.
- **Restart works** — `scene.restart({ mode })`, same as an end-screen
  Space replay.
- **Return to mode selection works** — `scene.start(ModeSelect)`.
- **Campaign contains 5 levels** — `LEVELS.length === 5`; Classic
  wins on index 4; HUD suffix is ` / 5`.
- **Existing systems continue working** — score, lives, high score,
  powerups, and audio call sites were not replaced.
- **Typecheck passes** / **Build passes**: `npm run typecheck` and
  `npm run build` both pass with no errors.

## KNOWN RISKS
- **Levels 4-5 are placeholder layouts**, not playtested — the same
  standing note since DXB-06A. Metal density on level 4 and mix on
  level 5 are reasoned, not measured.
- **This environment's browser-automation tab remains unreliable for
  real-time, input-driven verification** (the same finding every
  closure since DXB-06A). The pause overlay and `Level 1 / 5` HUD
  were checked in the running preview; clearing through level 5 was
  verified by construction.
- **Endless / Time Attack can display `Level 6 / 5` after a wrap.**
  The denominator is the campaign length; the numerator keeps
  incrementing as DXB-14 already did.

## NEXT RECOMMENDED TASK
- **A live-playtested balance pass** covering the 7-type mix, the new
  5-level campaign, Time Attack's 90s clock, and Endless's ramp.
- **Visual/audio polish** — catch flash, crack-hit cue, "+N" popup,
  still deferred since DXB-05.
- **Background music**, explicitly deferred by DXB-10.
- Sticky Paddle, still deferred at DXB-09's own scoping.
