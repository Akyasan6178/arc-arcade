# DXB-18A UI Navigation Refactor

## TASK
Replace hidden keyboard-only navigation shortcuts with a proper
menu-driven interface: a visible Hub (Play / Garage / Statistics /
Achievements / Settings), tabbed Garage and Statistics, a dedicated
Achievements screen, and visible Back controls so every screen is
reachable without G / S / U. Those keys may remain as optional
shortcuts.

## STATUS
Completed. `npm run typecheck` and `npm run build` both pass (see
Requirements Verification).

## SCOPE
Confirmed by the task itself, with no remaining open product decisions:

1. **Hub is the new root after Preload** — Play still runs the existing
   ThemeSelect → ModeSelect → Main path. Garage / Statistics /
   Achievements / Settings are Hub destinations with visible buttons.
   G / S / U stay bound on Hub, ThemeSelect, and ModeSelect as optional
   shortcuts; they are no longer required to reach any screen.
2. **Tabs replace nested hubs** — Garage shows Themes / Paddles / Balls
   as a `TabBar`. Statistics shows Lifetime Stats / Leaderboards /
   Progress. Personal bests stay on Lifetime Stats. Collection percents
   stay in the Garage subtitle. Leaderboard mode lists still drill into
   a Top 10; Back from a board returns to the mode list first.
3. **Achievements is its own scene** — the DXB-16 catalog that lived
   inside Unlockables. Theme / paddle / ball catalogs stay in Garage.
   Settings only surfaces the existing `AudioManager` mute flag.
4. **No new gameplay** — score, lives, levels, powerups, modes, themes,
   unlocks, achievements, stats, leaderboards, and audio keep their
   existing call sites. No coins, market, or new content.

## FILES CREATED
- `src/scenes/HubScene.ts` — visible Play / Garage / Statistics /
  Achievements / Settings menu.
- `src/scenes/AchievementsScene.ts` — dedicated achievement list.
- `src/scenes/SettingsScene.ts` — visible Sound On/Off toggle.
- `src/scenes/menuNavigation.ts` — shared return-to routing and optional
  G / S / U bindings.
- `src/ui/TextButton.ts` — reusable tappable label.
- `src/ui/TabBar.ts` — reusable horizontal tab strip.
- `docs/progress/DXB-18A.md` — this file.

## FILES MODIFIED
- `src/scenes/GarageScene.ts` — Themes / Paddles / Balls tabs, Back,
  Favorite, collection % in the subtitle.
- `src/scenes/StatsScene.ts` — Lifetime Stats / Leaderboards / Progress
  tabs plus a Back button.
- `src/scenes/ThemeSelectScene.ts` / `ModeSelectScene.ts` — visible Back;
  G / S / U remain optional.
- `src/scenes/PreloadScene.ts` / `BootScene.ts` / `src/main.ts` /
  `src/systems/SceneKeys.ts` — Hub is the post-preload root;
  Achievements and Settings are registered; Unlockables is retired.
- `src/ui/README.md` / `src/systems/README.md` — document the widgets
  and scene keys.
- `docs/CURRENT_STATE.md` — see below.

## FILES REMOVED
- `src/scenes/UnlockablesScene.ts` — theme / paddle / ball catalogs live
  in Garage; achievements live in `AchievementsScene`.

## ARCHITECTURAL DECISIONS
- **Hub sits in front of ThemeSelect, not instead of it.** Play still
  asks for a theme and a mode. The Hub only makes Garage / Stats /
  Achievements / Settings first-class destinations.
- **Tabs are a `ui/` widget.** Garage and Statistics share `TabBar` the
  same way ModeSelect and pause share `SelectMenu`. Left / Right change
  tabs; Up / Down stay with the list below.
- **Back is a `TextButton`, Esc stays optional.** Every non-Hub menu
  screen has a visible Back control so mobile does not need a keyboard.
- **Unlockables is retired, not emptied.** Duplicate theme / paddle /
  ball lists would fight Garage. Achievements keep the same
  `getAchievementRows()` data.
- **Settings does not add preferences.** It only exposes
  `AudioManager.toggle()`, which M already did globally.
- **No new gameplay.** Drop chance, durations, Multi Ball rules, audio
  cues, the 5-level campaign, modes, and unlock thresholds are
  untouched.

## REQUIREMENTS VERIFICATION
`npm run typecheck` and `npm run build` both pass with no errors.

Verified by construction / code review:

- **Main Hub works** — Preload starts Hub; Play / Garage / Statistics /
  Achievements / Settings are visible `SelectMenu` rows.
- **No hidden screen requires keyboard shortcuts** — Hub buttons, tabs,
  Back, Favorite, and Sound are tappable. ThemeSelect / ModeSelect also
  have visible Back.
- **Optional G / S / U still work** — bound on Hub, ThemeSelect, and
  ModeSelect via `bindOptionalMenuShortcuts`.
- **Garage tabs work** — Themes / Paddles / Balls switch catalogs
  without a nested hub; equip / preview / favorite persist as before.
- **Statistics tabs work** — Lifetime Stats (with personal bests),
  Leaderboards, and Progress; mode Top 10 still drills in.
- **Achievements is a dedicated screen** — Hub (or U) opens the list.
- **Existing systems remain unchanged** — no score, lives, level,
  powerup-effect, mode, theme-palette, unlock-gate, or audio call site
  was replaced.
- **Typecheck passes** / **Build passes**: `npm run typecheck` and
  `npm run build` both pass with no errors.

Restrictions held: no new gameplay mechanics, content, coins, market,
themes, or levels.

## KNOWN RISKS
- **This environment's browser-automation tab remains unreliable for
  real-time, input-driven verification** (the same finding every
  closure since DXB-06A). Hub / tab / Back navigation was checked by
  construction and typecheck/build.
- **Pause still returns to Mode Selection**, not the Hub. That is the
  existing DXB-13A path; leaving a run still lands on the mode picker.
- **Unlock thresholds were not playtested.** Navigation only displays
  them.

## NEXT RECOMMENDED TASK
- **A live-playtested balance pass** covering the 7-type mix, the
  5-level campaign, Time Attack's 90s clock, Endless's ramp, and
  DXB-16's unlock thresholds.
- **Visual/audio polish** — catch flash, crack-hit cue, "+N" popup,
  still deferred since DXB-05.
- **Background music**, explicitly deferred by DXB-10.
- Sticky Paddle, still deferred at DXB-09's own scoping.
