# DXB-14 Game Modes

## TASK
Increase DX-Ball replayability through multiple game modes: Classic
(unchanged current loop), Time Attack (90-second highest-score run),
Endless (infinite level wrap + gradual ball-speed ramp), a pre-run
mode selection screen, and a HUD indicator of the active mode.

## STATUS
Completed. `npm run typecheck` and `npm run build` both pass (see
Requirements Verification).

## SCOPE
Confirmed by the task itself, with no remaining open product decisions:

1. **Classic is the pre-DXB-14 loop** — same levels, win-on-last-level,
   lives, score, powerups, and audio. Nothing in that path is rewritten.
2. **Time Attack is a 90s clock on the existing systems** — highest
   score wins; the run ends when the timer hits 0 (plus the existing
   lives game-over). Levels wrap after the last `LEVELS` entry so the
   full clock can keep scoring. No new scoring rule.
3. **Endless is infinite progression on the same `LEVELS`** — wrap the
   existing three layouts, keep score accumulating, and gradually raise
   a progression speed fold on every live ball. Lives still end the run.
4. **Mode select is a new scene, not an overlay on gameplay** —
   `PreloadScene` hands off to `ModeSelectScene`; `MainScene` starts
   only after a mode is chosen. Themes, market, and leaderboard stay
   out of scope.

## FILES CREATED
- `src/entities/dx-ball/GameMode.ts` — mode ids, labels, Time Attack
  duration, Endless ramp constants, and the small format/compute
  helpers. Kept out of `MainScene` the same way `levels.ts` keeps
  level data out of the grid.
- `src/scenes/ModeSelectScene.ts` — pre-run picker. Arcade backdrop +
  title + `SelectMenu`; starts `MainScene` with `{ mode }`.
- `src/ui/SelectMenu.ts` — reusable vertical option list (arrows,
  Space / Enter, click). Not DX-Ball-specific.
- `src/ui/ModeLabel.ts` — reusable top-center HUD (`label` + optional
  `detail`). Not DX-Ball-specific.
- `docs/progress/DXB-14.md` — this file.

## FILES MODIFIED
- `src/systems/SceneKeys.ts` — adds `ModeSelect`.
- `src/main.ts` — registers `ModeSelectScene` in the Boot -> Preload
  -> ModeSelect -> Main pipeline.
- `src/scenes/PreloadScene.ts` / `src/scenes/BootScene.ts` — Preload
  now starts ModeSelect; comments updated.
- `src/scenes/MainScene.ts` — `init({ mode })`; Time Attack countdown
  and TIME'S UP; Endless wrap + speed ramp; Classic still wins on the
  last level; `ModeLabel` on the HUD; Space replays the same mode,
  Esc returns to mode select.
- `src/entities/dx-ball/Ball.ts` — `setProgressionMultiplier()` /
  `getProgressionMultiplier()`, folded into travel speed, launch,
  resize, and Multi-Ball extras. The ball still does not know modes.
- `src/ui/README.md` / `src/systems/README.md` — document the new
  widgets and scene key.
- `docs/CURRENT_STATE.md` — see below.

## ARCHITECTURAL DECISIONS
- **Modes are data + a few scene branches, not a new gameplay system.**
  Score, lives, powerups, and audio keep their existing call sites.
  `MainScene` is still the only place that decides "what does this
  run do when a level clears / time runs out".
- **Mode vocabulary lives next to `levels.ts`.** `GameMode.ts` is
  DX-Ball-specific and game-agnostic systems stay clean. `Ball` only
  gained a nameless progression fold, matching how it already owns
  slow/fast without knowing those are powerups.
- **Mode select is a scene.** `ui/` still has no pause/main-menu
  screen; a dedicated `ModeSelectScene` matches Boot/Preload/Main
  and keeps `MainScene.create()` as "a run is starting".
- **Time Attack and Endless wrap `LEVELS`.** Classic is the only
  mode that calls `handleWin()` on the last entry. Wrapping preserves
  the existing layouts while making "highest score wins" / "infinite
  progression" actually use the clock / the run.
- **HUD is a new `ModeLabel`, not a fifth corner `ScoreLabel`.**
  Corners were already taken; the mode line sits at top-center and
  `ActiveEffectsLabel` is shifted slightly down so they stack.
- **No new audio cues.** Time's-up reuses `game-over` so the DXB-10
  8-event vocabulary is unchanged.

## REQUIREMENTS VERIFICATION
`npm run typecheck` and `npm run build` both pass with no errors.

Verified by construction / code review (and a browser pass of the
mode-select screen plus each mode's HUD):

- **Classic mode works** — last-level clear still calls `handleWin()`;
  score / lives / levels / powerups / audio paths are unchanged.
- **Time Attack works** — 90s countdown on the mode HUD; `handleTimeUp()`
  freezes the run at 0 and reports score; lives game-over still works;
  levels wrap instead of winning early.
- **Endless works** — `LEVELS` wrap; `setProgressionMultiplier()` ramps
  from play time (capped at 2×); score keeps accumulating on the same
  `BrickGrid`.
- **Mode selection works** — Preload -> ModeSelect; arrows / Space /
  Enter / click start `MainScene` with `{ mode }`.
- **Existing systems continue working** — no score, lives, powerup-
  effect, or audio call site was replaced.
- **Typecheck passes** / **Build passes**: `npm run typecheck` and
  `npm run build` both pass with no errors.

## KNOWN RISKS
- **Time Attack duration and the Endless ramp are placeholder
  values**, not playtested — the same standing note since DXB-06A.
  90 seconds and `+0.4%/s` (cap 2×) are reasoned defaults.
- **This environment's browser-automation tab remains unreliable for
  real-time, input-driven verification** (the same finding every
  closure since DXB-06A has documented). Mode select and the mode HUD
  were checked in the running Vite app; a full Time Attack / Endless
  clear was verified by construction.
- **Wrapping Time Attack / Endless means "YOU WIN" is Classic-only.**
  That is intentional (highest score / infinite progression) but it
  is a behavior difference from Classic on the same layouts.

## NEXT RECOMMENDED TASK
- **A live-playtested balance pass** covering the 7-type mix, brick
  layouts, and now also Time Attack's 90s clock and Endless's ramp.
- **A pause/main menu** — `SelectMenu` is the first reusable menu
  widget; a pause overlay could reuse it.
- **Visual/audio polish** — catch flash, crack-hit cue, "+N" popup,
  still deferred since DXB-05.
- **Background music**, explicitly deferred by DXB-10.
- Sticky Paddle, still deferred at DXB-09's own scoping.
