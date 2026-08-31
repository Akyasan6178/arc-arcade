# DXB-18 Garage & Collection Hub

## TASK
Create a permanent collection and customization hub for all unlocked
content: a Garage screen reachable from Theme Select and Mode Select,
theme / paddle / ball catalogs with preview, locked / unlocked state,
unlock requirement, and equip, collection completion percents, one
favorite per cosmetic type, a live preview of the highlighted combo,
and persistence of equipped plus favorite selections.

## STATUS
Completed. `npm run typecheck` and `npm run build` both pass (see
Requirements Verification).

## SCOPE
Confirmed by the task itself, with no remaining open product decisions:

1. **Garage is a scene, not a gameplay system** — score, lives, levels,
   powerups, modes, themes, unlocks, achievements, stats, leaderboards,
   and audio keep their existing call sites. ThemeSelect / ModeSelect
   open Garage with `G`. Esc from a catalog returns to the hub; Esc
   from the hub returns to the caller.
2. **Unlock tables are reused** — Garage reads the same theme / paddle /
   ball rows as Unlockables. Gates stay derived from lifetime stats.
   No currency, shop, or microtransactions.
3. **Preview is visual only** — highlighting a row paints the theme
   backdrop and a paddle / ball stage. Locked items preview but cannot
   be equipped or favorited. Equipping still uses the existing save
   helpers so `MainScene` keeps applying skins the same way.
4. **Favorites are a sibling blob** — one favorite theme, paddle, and
   ball live under `dx-ball-favorites`. Equipped cosmetics stay on the
   existing theme / paddle / ball keys. A malformed favorite cannot
   wipe unlocks.

## FILES CREATED
- `src/scenes/GarageScene.ts` — hub + theme / paddle / ball catalogs +
  collection percents + live preview.
- `src/ui/CollectionPreview.ts` — reusable themed paddle / ball stage.
- `docs/progress/DXB-18.md` — this file.

## FILES MODIFIED
- `src/entities/dx-ball/Progress.ts` — favorites load/save/toggle,
  collection completion percents, `favorite` on cosmetic rows.
- `src/ui/ProgressList.ts` — `onHighlight`, `initialIndex`,
  `getSelectedId()`, FAVORITE badge next to EQUIPPED.
- `src/scenes/ThemeSelectScene.ts` / `ModeSelectScene.ts` — `G` opens
  `GarageScene`.
- `src/systems/SceneKeys.ts` / `src/main.ts` / `src/scenes/BootScene.ts`
  — register `GarageScene`.
- `src/ui/README.md` / `src/systems/README.md` — document the widget
  and scene key.
- `docs/CURRENT_STATE.md` — see below.

## ARCHITECTURAL DECISIONS
- **Garage sits beside Unlockables, not inside it.** Unlockables stays
  the achievements catalog. Garage is the collection / customization
  hub with a live preview the unlockables list never had.
- **Favorites are independent of equipped.** Equipping a skin for play
  does not change the favorite, and F on a highlighted unlocked row
  toggles that catalog's single favorite.
- **Collection % excludes achievements.** Theme / paddle / ball percents
  plus a cosmetics-only total live in `getCollectionCompletion()`.
  StatsScene's progress summary still counts achievements.
- **The preview widget does not import unlock tables.** `GarageScene`
  passes visual tokens, matching how `MainScene` applies skins without
  `Paddle` / `Ball` knowing unlocks exist.
- **No new gameplay.** Drop chance, durations, Multi Ball rules, audio
  cues, the 5-level campaign, modes, and unlock thresholds are
  untouched.

## REQUIREMENTS VERIFICATION
`npm run typecheck` and `npm run build` both pass with no errors.

Verified by construction / code review:

- **Garage screen works** — ThemeSelect / ModeSelect open it with `G`;
  Esc returns through the hub to the caller.
- **Themes can be previewed** — highlighting a theme row applies its
  backdrop and the preview stage; locked themes still preview.
- **Paddle skins can be previewed** — highlighting a paddle row redraws
  the stage paddle using that skin's tokens.
- **Ball skins can be previewed** — highlighting a ball row redraws the
  stage ball using that skin's tokens.
- **Equip system works** — Space / Enter / click on an unlocked row
  writes the existing theme / paddle / ball keys; locked rows do not
  confirm. `MainScene` still reads those keys.
- **Collection percentages work** — hub descriptions and the Collection
  catalog show theme / paddle / ball / total percents from the same
  unlock rows.
- **Existing unlock system continues working** — gates, achievements,
  and UnlockablesScene are unchanged aside from showing a FAVORITE
  badge on cosmetic rows.
- **Existing gameplay remains unchanged** — no score, lives, level,
  powerup-effect, mode, theme-palette, or audio call site was replaced.
- **Typecheck passes** / **Build passes**: `npm run typecheck` and
  `npm run build` both pass with no errors.

Restrictions held: no currency, coins, purchases, microtransactions,
or online systems.

## KNOWN RISKS
- **Favorites persist only while still unlocked.** A stored favorite
  that fails the gate (corrupt / future lock change) is treated as
  unset, same as an invalid equipped skin falling back to Classic.
- **This environment's browser-automation tab remains unreliable for
  real-time, input-driven verification** (the same finding every
  closure since DXB-06A). Garage navigation was checked by construction
  and typecheck/build.
- **Unlock thresholds were not playtested.** Garage only displays them.

## NEXT RECOMMENDED TASK
- **A live-playtested balance pass** covering the 7-type mix, the
  5-level campaign, Time Attack's 90s clock, Endless's ramp, and
  DXB-16's unlock thresholds.
- **Visual/audio polish** — catch flash, crack-hit cue, "+N" popup,
  still deferred since DXB-05.
- **Background music**, explicitly deferred by DXB-10.
- Sticky Paddle, still deferred at DXB-09's own scoping.
