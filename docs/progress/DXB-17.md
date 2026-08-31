# DXB-17 Stats & Leaderboards

## TASK
Create long-term progress tracking and local leaderboards: persistent
lifetime statistics, a dedicated statistics screen reachable from
Theme Select and Mode Select, per-mode Top 10 boards, personal bests,
and a progress summary. All data stays in localStorage.

## STATUS
Completed. `npm run typecheck` and `npm run build` both pass (see
Requirements Verification).

## SCOPE
Confirmed by the task itself, with no remaining open product decisions:

1. **Statistics are counters on the existing progress blob** — unlock
   gates already read lifetime score, powerup catches, metal hits,
   Fire Ball destroys, Multi Ball activations, and Time Attack best.
   DXB-17 adds games played, overall / Classic / Endless bests, bricks
   destroyed, and play time to the same `dx-ball-progress` JSON so a
   refresh cannot desync "I have 250 Fire Ball kills" from achievements.
2. **Leaderboards are a sibling store** — Top 10 Classic / Time Attack /
   Endless scores live under `dx-ball-leaderboards`. A malformed board
   cannot wipe unlocks. Local only: no accounts, cloud, or online
   services.
3. **Statistics is a scene** — ThemeSelect / ModeSelect open it with
   `S`. Esc from a catalog returns to the hub (leaderboard mode lists
   return to the boards picker first); Esc from the hub returns to the
   caller.
4. **No new gameplay** — score, lives, levels, powerups, modes, themes,
   unlocks, and audio keep their existing call sites. `MainScene`
   records events the same "owning scene polls a getter" way it already
   polls score and DXB-16 hits.

## FILES CREATED
- `src/entities/dx-ball/Leaderboards.ts` — Top 10 per mode, load/save,
  submit, display rows.
- `src/ui/StatsList.ts` — reusable read-only label/value list.
- `src/scenes/StatsScene.ts` — hub + lifetime stats / personal bests /
  leaderboards / progress summary.
- `docs/progress/DXB-17.md` — this file.

## FILES MODIFIED
- `src/entities/dx-ball/Progress.ts` — new counters, `recordModeScore`,
  play-time / games / bricks helpers, lifetime / bests / summary rows.
  Seeds overall highest from the existing `HighScoreStore` key.
- `src/scenes/MainScene.ts` — records the new counters live; flushes
  play time and submits the run on end-of-run and shutdown.
- `src/scenes/ThemeSelectScene.ts` / `ModeSelectScene.ts` — `S` opens
  `StatsScene`.
- `src/systems/SceneKeys.ts` / `src/main.ts` / `src/scenes/BootScene.ts`
  — register `StatsScene`.
- `src/ui/README.md` / `src/systems/README.md` — document the widget
  and scene key.
- `docs/CURRENT_STATE.md` — see below.

## ARCHITECTURAL DECISIONS
- **Stats vocabulary stays in `Progress.ts`.** Unlocks are derived from
  those counters; a second blob would let "lifetime score" and
  "Laboratory unlocked" diverge after a refresh.
- **Leaderboards use their own key.** Rank lists are not unlock input,
  so they should not share a JSON object with achievements.
- **Play time counts only live frames.** Paused, won, lost, timed-out,
  and level-clear waiting time are excluded. The scene flushes at least
  every 5s and again on shutdown so a mid-run refresh still persists.
- **Games played increment on run start** (`create()`), including
  restart. Leaving via pause still counts as a started run.
- **A run is submitted once.** Win / game-over / time-up submit
  immediately so a refresh on the end card keeps the entry; shutdown
  is a fallback for pause-leave / restart. Scores of 0 are ignored.
- **No new gameplay.** Drop chance, durations, Multi Ball rules, audio
  cues, the 5-level campaign, themes, and unlock thresholds are
  untouched.

## REQUIREMENTS VERIFICATION
`npm run typecheck` and `npm run build` both pass with no errors.

Verified by construction / code review:

- **Statistics update correctly** — games played, lifetime score,
  highest / Time Attack / Endless scores, bricks destroyed, metal hits,
  powerups, Fire Ball kills, Multi Ball activations, and play time each
  have a dedicated record path from `MainScene`.
- **Leaderboards update correctly** — `submitScore` inserts into that
  mode's Top 10, sorted descending, capped at 10.
- **Data persists after refresh** — `dx-ball-progress` and
  `dx-ball-leaderboards` JSON in localStorage; play time flushes live
  and on shutdown.
- **Existing systems continue working** — no score, lives, level,
  powerup-effect, mode, theme-palette, unlock-gate, or audio call site
  was replaced.
- **Typecheck passes** / **Build passes**: `npm run typecheck` and
  `npm run build` both pass with no errors.

Restrictions held: no online services, accounts, cloud save, currency,
or market purchases.

## KNOWN RISKS
- **Games played counts every `create()`**, including an immediate
  pause-leave with no bricks broken. That matches "runs started".
- **This environment's browser-automation tab remains unreliable for
  real-time, input-driven verification** (the same finding every
  closure since DXB-06A). Stats navigation was checked by construction
  and typecheck/build.
- **Classic / Endless personal bests start at 0 for pre-DXB-17
  players.** Overall highest is seeded from the existing Best HUD key;
  per-mode history was never stored.

## NEXT RECOMMENDED TASK
- **A live-playtested balance pass** covering the 7-type mix, the
  5-level campaign, Time Attack's 90s clock, Endless's ramp, and
  DXB-16's unlock thresholds.
- **Visual/audio polish** — catch flash, crack-hit cue, "+N" popup,
  still deferred since DXB-05.
- **Background music**, explicitly deferred by DXB-10.
- Sticky Paddle, still deferred at DXB-09's own scoping.
