# DXB-16 Unlockables & Achievements

## TASK
Create long-term progression and replayability through unlockables and
achievements: persistent lifetime tracking, gated themes / paddle skins
/ ball skins, a seven-item achievement list, a dedicated unlockables
screen, and localStorage persistence across refreshes and restarts.

## STATUS
Completed. `npm run typecheck` and `npm run build` both pass (see
Requirements Verification).

## SCOPE
Confirmed by the task itself, with no remaining open product decisions:

1. **Progress is data + counters, not a gameplay system** — score,
   lives, levels, powerups, modes, themes, and audio keep their existing
   call sites. `MainScene` records events the same "owning scene polls
   a getter" way it already polls score and powerup spawns.
2. **Unlocks are derived from stats** — Neon Arcade / Classic paddle /
   Classic ball stay free. Space, Laboratory, the three paddle skins,
   the three ball skins, and the seven achievements gate on lifetime
   counters. No currency, shop, or microtransactions.
3. **Unlockables is a scene** — ThemeSelect / ModeSelect open it with
   `U`. Esc from a catalog returns to the hub; Esc from the hub returns
   to the caller. Equipping an unlocked theme or skin persists.
4. **Skins are visual tokens** — `Paddle` / `Ball` take fill / stroke /
   motif from the owning scene and never import unlock tables. Fire Ball
   still overrides the ball while active.

## FILES CREATED
- `src/systems/JsonStore.ts` — game-agnostic JSON localStorage wrapper.
- `src/entities/dx-ball/Progress.ts` — stats, unlock gates, achievements,
  load/save, selected paddle/ball skin ids.
- `src/entities/dx-ball/Skins.ts` — paddle / ball visual tokens.
- `src/ui/ProgressList.ts` — reusable locked / unlocked / percent list.
- `src/scenes/UnlockablesScene.ts` — catalog hub + detail lists.
- `docs/progress/DXB-16.md` — this file.

## FILES MODIFIED
- `src/systems/SceneKeys.ts` / `src/main.ts` / `src/scenes/BootScene.ts`
  — register `UnlockablesScene`.
- `src/scenes/ThemeSelectScene.ts` — locked themes, `U` to unlockables.
- `src/scenes/ModeSelectScene.ts` — `U` to unlockables; paints an
  unlocked theme.
- `src/scenes/MainScene.ts` — records lifetime events; applies skins.
- `src/entities/dx-ball/BrickGrid.ts` — queues `BrickHitEvent`s.
- `src/entities/dx-ball/Paddle.ts` / `Ball.ts` — `applySkin()`.
- `src/ui/SelectMenu.ts` — `locked` options cannot confirm.
- `src/ui/README.md` / `src/systems/README.md` — document the new
  widget, store, and scene key.
- `docs/CURRENT_STATE.md` — see below.

## ARCHITECTURAL DECISIONS
- **Progress vocabulary lives next to `Theme.ts`.** Lifetime counters
  and unlock tables are DX-Ball-specific; persistence is a game-agnostic
  `JsonStore` so `systems/` stays clean.
- **Unlock flags are not stored.** Completing Classic writes
  `classicCompleted: true`; Space is unlocked because that flag is true.
  A refresh cannot desync "I finished Classic" from "Space is locked".
- **BrickGrid still does not know achievements exist.** It queues typed
  hit events; `MainScene` decides metal hits vs Fire Ball destroys.
- **Default cosmetics stay equipped until something else is unlocked
  and chosen.** Classic paddle / Classic ball match the pre-DXB-16 look
  so existing play is preserved.
- **No new gameplay.** Drop chance, durations, Multi Ball rules, audio
  cues, the 5-level campaign, and the three modes are untouched.

## REQUIREMENTS VERIFICATION
`npm run typecheck` and `npm run build` both pass with no errors.

Verified by construction / code review:

- **Achievements track correctly** — Classic win, powerup catches,
  metal hits, Fire Ball destroys, Endless level, Time Attack best, and
  a no-life-loss Classic clear each write the matching counter.
- **Themes unlock correctly** — Neon Arcade is free; Space needs Classic
  complete; Laboratory needs 25,000 lifetime score. Locked rows preview
  but cannot be confirmed.
- **Paddle skins unlock correctly** — Carbon / Neon / Reactor gate on
  100 powerups, 15,000 Time Attack, and 250 Fire Ball destroys.
- **Ball skins unlock correctly** — Plasma / Inferno / Quantum gate on
  50 Multi Ball activations, 500 Fire Ball destroys, and Endless
  level 20.
- **Unlock progress persists** — `dx-ball-progress` JSON plus selected
  theme / paddle / ball ids in localStorage.
- **Unlock screen works** — Themes, Paddle Skins, Ball Skins, and
  Achievements lists show locked / unlocked / percent / equipped.
- **Existing systems continue working** — no score, lives, level,
  powerup-effect, mode, theme-palette, or audio call site was replaced.
- **Typecheck passes** / **Build passes**: `npm run typecheck` and
  `npm run build` both pass with no errors.

## KNOWN RISKS
- **Lifetime score is the sum of every run's points**, including
  unfinished runs, because deltas are recorded live. That matches
  "lifetime score" and survives a mid-run refresh.
- **This environment's browser-automation tab remains unreliable for
  real-time, input-driven verification** (the same finding every
  closure since DXB-06A). Unlockables navigation and theme locks were
  checked by construction and typecheck/build.
- **Unlock thresholds were not playtested.** 25,000 lifetime, 15,000 /
  20,000 Time Attack, 250 / 500 Fire Ball bricks, and Endless 20 are
  the task's authored gates.

## NEXT RECOMMENDED TASK
- **A live-playtested balance pass** covering the 7-type mix, the
  5-level campaign, Time Attack's 90s clock, Endless's ramp, and now
  the unlock thresholds.
- **Visual/audio polish** — catch flash, crack-hit cue, "+N" popup,
  still deferred since DXB-05.
- **Background music**, explicitly deferred by DXB-10.
- Sticky Paddle, still deferred at DXB-09's own scoping.
