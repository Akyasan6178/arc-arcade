# DXB-20 Release Candidate

## TASK
Prepare DX-Ball for a public release candidate: polish, stability,
accessibility, UX, and release readiness only. No new gameplay
systems, content, themes, powerups, or achievements.

## STATUS
Completed. `npm run typecheck` and `npm run build` both pass (see
Requirements Verification).

## SCOPE
Confirmed by the task itself, with no remaining open product decisions:

1. **UX / navigation consistency** — Hub, Theme Select, Mode Select,
   Garage, Statistics, Achievements, Settings, Pause, Victory, and
   Game Over share one chrome language (title, subtitle, Back, hint
   placement, typeface, stroke). Hints are pointer-first.
2. **Mobile usability** — tap-to-continue on result cards, a visible
   Pause control during a run, lists that shrink instead of clipping
   the Back row, shorter Statistics tabs, safe-area insets on HUD
   corners and menu chrome.
3. **Accessibility** — minimum font sizes, word wrap on overlays,
   brighter locked/muted menu colors on Space / Laboratory / Retro /
   Frozen / Inferno so text stays legible against each backdrop.
4. **Gameplay values reviewed, not rewritten** — Fire Ball duration,
   Multi Ball cap, drop chance, Endless ramp, and Time Attack clock
   stay as authored. Wrapping modes no longer show a campaign
   denominator (`Level 11 / 10`); Classic still shows `Level X / 10`.
5. **Save compatibility** — same keys, same migration. High-frequency
   progress writes coalesce to one persist per frame and flush on
   pagehide / scene shutdown.
6. **No new content** — no levels, themes, skins, achievements,
   powerups, modes, or online systems.

## FILES CREATED
- `src/ui/menuLayout.ts` — shared menu chrome tokens and helpers.
- `docs/progress/DXB-20.md` — this file.

## FILES MODIFIED
- `src/scenes/HubScene.ts` / `ThemeSelectScene.ts` / `ModeSelectScene.ts`
  / `GarageScene.ts` / `StatsScene.ts` / `AchievementsScene.ts` /
  `SettingsScene.ts` — shared chrome, pointer-first hints, consistent
  Back buttons.
- `src/scenes/MainScene.ts` — visible Pause, tap-to-continue results,
  HUD safe-area insets, wrapping-mode level label, Endless multiplier
  skip, coalesced progress flush on shutdown.
- `src/ui/SelectMenu.ts` / `ProgressList.ts` / `StatsList.ts` — fit
  row height so lists do not clip the Back/hint row.
- `src/ui/ResultOverlay.ts` — tap-to-continue, hint line, word wrap.
- `src/ui/PauseOverlay.ts` — pointer-first hint; Leave Run still
  returns to Mode Select.
- `src/ui/ScoreLabel.ts` / `ActiveEffectsLabel.ts` / `ModeLabel.ts` /
  `TextButton.ts` / `TabBar.ts` — min font sizes, HUD insets.
- `src/ui/CollectionPreview.ts` — skip redraw when the preview is
  unchanged.
- `src/entities/dx-ball/Theme.ts` — brighter muted/locked menu colors.
- `src/entities/dx-ball/Progress.ts` — coalesced localStorage writes;
  removed unused `recordTimeAttackScore` / `getCollectionCompletionRows`.
- `src/ui/README.md` — document `menuLayout` and DXB-20 widget notes.
- `docs/CURRENT_STATE.md` — see below.

## ARCHITECTURAL DECISIONS
- **Chrome is a `ui/` helper, not a new scene.** `menuLayout.ts` is the
  same shape as `SelectMenu` / `TextButton`: tokens plus small factory
  helpers. Scenes still own their options and destinations.
- **Pause still returns to Mode Select.** That is the play pipeline
  (Theme → Mode → Run). Leave Run is shorter copy; destination is
  unchanged. Hub remains the session root via Back from Theme Select.
- **Tap-to-continue is an overlay callback**, not a new input system.
  Space still restarts / continues. The visible Pause button is a
  `TextButton` (same widget as Back) so mobile does not need Esc.
- **Balance values stay.** Fire Ball 10s, Multi Ball cap 3, drop chance
  0.15 (uniform 7-type pool), Endless `+0.4%/s` cap 2×, Time Attack 90s
  are the authored DXB-09/12/14 numbers. They were reviewed; none were
  clearly broken enough to retune without live playtest.
- **Save writes coalesce; schema does not change.** Counters still
  update in memory immediately. Disk writes batch per animation frame
  and flush on hide/shutdown so a refresh still keeps progress.

## SAVE COMPATIBILITY
No new keys. `dx-ball-progress` still migrates `classicCompletions`
from `classicCompleted`. Equipped theme / paddle / ball, favorites,
achievements, statistics, and `dx-ball-leaderboards` are unchanged.
Unknown stored ids still fall back to Classic / Neon Arcade.

## GAMEPLAY BALANCE REVIEW
| Value | Current | Decision |
| --- | --- | --- |
| Fire Ball duration | 10s | Keep — long enough to pierce a metal corridor, not a full level. |
| Multi Ball | Top up to 3; extras spend on miss | Keep — frequency is 1/7 of a 15% drop (~2% of destroys). |
| Powerup drop chance | 0.15, uniform 7-type pool | Keep — bonus bricks still always drop. |
| Endless speed ramp | +0.4%/s, cap 2× (~250s) | Keep — gradual; extras still inherit the fold. |
| Time Attack | 90s, levels wrap | Keep — highest-score mode, not a campaign clear. |
| Starting lives | 3 | Keep. |

## REQUIREMENTS VERIFICATION
`npm run typecheck` and `npm run build` both pass with no errors.

Verified by construction / code review (and a browser pass of Hub →
side screens → Theme Select → Mode Select where the preview tab
allowed it):

- **UI is consistent** — shared `menuLayout` tokens; Back / hint /
  title / subtitle match across Hub and every side screen.
- **Mobile usability improves** — result cards accept a tap; Pause is
  visible; lists fit above the Back row; Statistics tabs are short
  (`Stats` / `Boards` / `Progress`); HUD corners honor safe-area.
- **Accessibility improves** — min font sizes; overlay wrap; muted
  menu colors brightened on the darker themes.
- **Save system remains compatible** — additive write coalescing only;
  no schema change or wipe.
- **Existing gameplay remains unchanged** — score / lives / powerup
  effect / audio call sites were not replaced. Durations and drop
  chance were not retuned.
- **Existing unlockables remain unchanged** — gates and catalogs
  untouched aside from display chrome.
- **Existing achievements remain unchanged** — same seven rows.
- **Existing stats remain unchanged** — same counters and boards.
- **Typecheck passes** / **Build passes**: `npm run typecheck` and
  `npm run build` both pass with no errors.

Restrictions held: no new content, levels, themes, skins, achievements,
powerups, game modes, or online systems.

## KNOWN ISSUES
- **This environment's browser-automation tab remains unreliable for
  real-time, input-driven verification** (the same finding every
  closure since DXB-06A). Menu chrome and tap-to-continue were checked
  by construction plus a Hub / Garage / Theme Select visual pass where
  the preview tab allowed it. A full Classic clear, Time Attack clock,
  and Endless ramp were not live-playtested this session.
- **Pause still returns to Mode Select, not the Hub.** Intentional:
  leaving a run stays on the play pipeline. Back from Mode Select
  still reaches Theme Select, then Hub.
- **Unlock thresholds and the 10-level campaign were not playtested.**
  Standing note since DXB-06A / DXB-16 / DXB-19.
- **Safe-area insets are 0 unless the host browser reports
  `env(safe-area-inset-*)`.** `viewport-fit=cover` is already set;
  desktop preview will not show a notch offset.
- **Coalesced progress writes can lose at most one animation frame of
  counters if the tab is killed without `pagehide`.** Same class of
  risk as the existing 5s play-time flush.

## DEFERRED IDEAS
- A live-playtested balance pass covering the 7-type mix, the 10-level
  campaign, Time Attack's 90s clock, Endless's ramp, and DXB-16/DXB-19
  unlock thresholds — still the standing recommendation since DXB-06A.
- Visual/audio polish — catch flash, crack-hit cue, "+N" popup, still
  deferred since DXB-05.
- Background music, explicitly deferred by DXB-10. `AudioManager`'s
  real-asset path and `AudioManifestEntry.category` remain the seam.
- A visible mute toggle on the pause overlay.
- Sticky Paddle, still deferred at DXB-09's own scoping.
- Pause returning to the Hub as a fourth menu action.
- Online accounts, cloud save, or online leaderboards.

## NEXT RECOMMENDED TASK
Ship / host the release candidate. Remaining product work is optional
polish (balance playtest, catch flash, music), not blockers for this
candidate's own acceptance criteria.
