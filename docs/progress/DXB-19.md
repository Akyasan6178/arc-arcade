# DXB-19 Content Expansion

## TASK
Expand the amount of meaningful content available through the existing
campaign, achievement, unlockable, theme, Garage, statistics and
leaderboard systems: Classic 5 → 10 levels, three new themes, four new
paddles, four new balls. Content only — no new systems, currency,
purchases, powerup mechanics, brick mechanics, or game modes.

## STATUS
Completed. `npm run typecheck` and `npm run build` both pass (see
Requirements Verification).

## SCOPE
Confirmed by the task itself, with no remaining open product decisions:

1. **Classic campaign appends levels 6–10** — levels 1–5 stay as
   authored. Score and lives still carry on the same `BrickGrid`.
   Classic still wins on the last `LEVELS` entry (now index 9). HUD
   already uses `LEVELS.length`, so it shows `Level X / 10`.
2. **Three new themes, four new paddles, four new balls** — palettes
   and cosmetic tokens only. Gameplay size, collision, speed, and
   effects are unchanged. Garage lists are derived from the same
   unlock-row helpers, so new rows appear automatically and collection
   percents are counted, not hardcoded.
3. **Unlocks stay derived from lifetime stats** — Retro Grid needs two
   Classic clears (`classicCompletions`, seeded from the existing
   `classicCompleted` flag on old saves). Existing gates are not
   weakened. Nova gates on all seven existing achievements.
4. **No new gameplay** — no currency, shops, new powerups, new brick
   types, new modes, cloud save, or online leaderboards.

## NEW CONTENT

### Classic levels (appended; 1–5 unchanged)

| Level | Layout intent | Brick mix | Notes |
| --- | --- | --- | --- |
| 1 | Default 5×8 field | All normal | Unchanged from DXB-06A |
| 2 | 6×8 ramp | Normal + cracked | Unchanged from DXB-11 |
| 3 | 7×9 ramp | N / C / M / B | Unchanged from DXB-11 |
| 4 | Metal corridors | N / C / M | Unchanged from DXB-13A |
| 5 | Mixed field | N / C / M / B | Unchanged from DXB-13A |
| 6 | Precision | Sparse normal + holes | Every required brick is open; no metal cages |
| 7 | Cracked-heavy | Mostly cracked, some N | Open lanes so two-hit bricks stay reachable |
| 8 | Metal obstacle maze | N + M with bounce lanes | Metal never fully encloses a required brick; `isCleared()` still ignores leftover metal |
| 9 | Bonus risk/reward | Bonus clusters near metal | Guaranteed-drop bricks plus safer N/B groups |
| 10 | Finale | Every current type | Metal as obstacles only; Classic victory fires after this clear |

Ball speed continues the existing ramp (0.90 → 0.98). Time Attack and
Endless still wrap the same `LEVELS` array.

### Themes (6 total)

| Theme | Unlock | Visual identity |
| --- | --- | --- |
| Neon Arcade | Default | Unchanged magenta/cyan cabinet |
| Space | Complete Classic Mode | Unchanged void / nebula |
| Laboratory | 25,000 lifetime score | Unchanged teal / hazard amber |
| Retro Grid | Complete Classic Mode **twice** | Phosphor-green CRT, amber scanlines, chunky pixels |
| Frozen Core | Reach Level 25 in Endless | Ice-blue glaciers, frost shards, pale aurora |
| Inferno | Destroy 1,000 bricks during Fire Ball | Magma vents, ember sparks, furnace glow |

Each new theme owns its own backdrop motif, HUD palette, brick palette,
powerup palette, and overlay/menu styling. Gameplay is unchanged.

### Paddles (8 total)

| Paddle | Unlock | Motif |
| --- | --- | --- |
| Classic | Default | Flat white (unchanged) |
| Carbon | Collect 100 powerups | Dark bands (unchanged) |
| Neon | 15,000 Time Attack | Magenta glow (unchanged) |
| Reactor | 250 Fire Ball destroys | Teal/gold core (unchanged) |
| Crystal | Collect 500 powerups | Ice-blue facets |
| Titan | Hit 1,000 Metal Bricks | Bronze armor plates |
| Pulse | 30,000 Time Attack | Dark body, cyan concentric rings |
| Obsidian | Complete Classic without losing a life | Near-black shard / violet edge |

### Balls (8 total)

| Ball | Unlock | Look |
| --- | --- | --- |
| Classic | Default | Gold, no glow (unchanged) |
| Plasma | Multi Ball 50 times | Violet / cyan glow (unchanged) |
| Inferno | 500 Fire Ball destroys | Orange fire glow (unchanged) |
| Quantum | Endless Level 20 | Cyan / lavender glow (unchanged) |
| Ice Core | Endless Level 30 | Pale cyan, frost glow, white inner core |
| Dark Matter | Multi Ball 150 times | Near-black, magenta rim, violet core |
| Solar | 1,500 Fire Ball destroys | Gold fill, orange bloom, white-hot core |
| Nova | Complete all achievements | Pink/magenta bloom, bright inner spark |

## FILES CREATED
- `docs/progress/DXB-19.md` — this file.

## FILES MODIFIED
- `src/entities/dx-ball/levels.ts` — levels 6–10 appended; 1–5 untouched.
- `src/entities/dx-ball/Theme.ts` — Retro Grid / Frozen Core / Inferno
  palettes; `ThemeId` union expanded.
- `src/ui/ArcadeBackground.ts` — retro / frozen / inferno backdrop motifs.
- `src/entities/dx-ball/Skins.ts` — four paddle tokens, four ball tokens
  (optional inner core on the new balls).
- `src/entities/dx-ball/Paddle.ts` — crystal / plates / pulse / shard motifs.
- `src/entities/dx-ball/Ball.ts` — optional inner-core overlay (visual only;
  Fire Ball still overrides while active).
- `src/entities/dx-ball/Progress.ts` — `classicCompletions` + safe
  migration; new theme / paddle / ball gates and catalog rows.
- `src/ui/CollectionPreview.ts` — matching paddle motifs and ball cores
  for Garage preview.
- `src/scenes/ThemeSelectScene.ts` — compacted list so six themes stay
  on-screen; still Hub → Theme Select, no new navigation.
- `src/scenes/GarageScene.ts` — denser catalog rows so eight paddles /
  balls fit above the existing preview.
- `src/scenes/MainScene.ts` — campaign-length comment; HUD already
  reads `LEVELS.length`.
- `src/ui/ScoreLabel.ts` / `src/ui/README.md` — suffix example `Level X / 10`.
- `docs/CURRENT_STATE.md` — see below.

## ARCHITECTURAL DECISIONS
- **Content tables, not new systems.** Levels still live in `levels.ts`,
  palettes in `Theme.ts`, cosmetics in `Skins.ts`, gates in `Progress.ts`.
  `MainScene` still owns the run; Garage still consumes unlock rows.
- **`classicCompletions` is additive.** Old saves with
  `classicCompleted: true` and no count seed to 1 (one clear, Retro Grid
  still locked). A second Classic victory unlocks it. The boolean is
  kept so Space and First Victory stay in sync.
- **Nova is derived from the existing seven achievements**, not a stored
  flag. Completing the achievement list unlocks the ball on the next
  read; a refresh cannot desync the two.
- **Metal still cannot lock a level.** Levels 8 and 10 use bounce lanes
  and holes; `BrickGrid.isCleared()` still ignores leftover metal.
- **Garage / Theme Select density is a layout fit, not a new menu.**
  Row height shrank so the extra rows stay on the existing Hub →
  Garage / Theme Select flow. No hidden keyboard-only path.
- **No new gameplay.** Drop chance, durations, Multi Ball rules, audio
  cues, modes, achievements, stats, and leaderboards keep their call
  sites. Existing equipped skins, favorites, and unlocks persist.

## SAVE COMPATIBILITY
`dx-ball-progress` gains `classicCompletions` (number). `normalizeStats`
seeds it from `classicCompleted` when the field is missing. Equipped
theme / paddle / ball keys, favorites, achievements, statistics, and
leaderboards are unchanged. An unknown stored skin id still falls back
to Classic. Invalid theme ids still fall back to Neon Arcade.

## REQUIREMENTS VERIFICATION
`npm run typecheck` and `npm run build` both pass with no errors.

Verified by construction / code review:

- **Classic contains 10 playable levels** — `LEVELS.length === 10`;
  Classic wins on index 9; HUD suffix is ` / ${LEVELS.length}`.
- **Level 10 triggers final victory** — `handleLevelCleared()` still
  calls `handleWin()` when Classic is on the last entry.
- **No level is impossible** — levels 6–10 keep open lanes; metal is
  ignored by `isCleared()`.
- **Six total themes / eight paddles / eight balls** — catalog row
  helpers list them all; Garage and Theme Select read those helpers.
- **New content is visually distinct** — unique backdrop motifs,
  paddle overlays, and ball fill/glow/core tokens.
- **Garage shows preview / locked / unlocked / equip / favorite /
  requirements** — same `ProgressList` + `CollectionPreview` path;
  collection % is `unlocked / total` from the row arrays.
- **Existing saves remain compatible** — additive `classicCompletions`
  seed; no wipe.
- **Existing achievements, modes, and gameplay continue working** —
  no score / lives / powerup-effect / audio call site was replaced.
- **Typecheck passes** / **Build passes**: `npm run typecheck` and
  `npm run build` both pass with no errors.

Restrictions held: no currency, coins, purchases, microtransactions,
online accounts, cloud save, online leaderboards, new powerup
mechanics, new brick mechanics, or new game modes.

## KNOWN RISKS
- **Levels 6–10 are authored layouts, not live-playtested** — the same
  standing note since DXB-06A. Reachability is reasoned from bounce
  lanes and `isCleared()` ignoring metal, not measured in a full clear.
- **This environment's browser-automation tab remains unreliable for
  real-time, input-driven verification** (the same finding every
  closure since DXB-06A). Theme Select six-row fit and Garage eight-row
  catalogs were checked by construction plus a visual pass of Hub →
  Garage / Theme Select where the preview tab allowed it.
- **Unlock thresholds were not playtested.** 2 Classic clears, Endless
  25 / 30, 1,000 / 1,500 Fire Ball bricks, 500 powerups, 1,000 metal
  hits, 30,000 Time Attack, 150 Multi Ball, and “all achievements”
  are the task's authored gates.
- **Endless / Time Attack can display `Level 11 / 10` after a wrap.**
  The denominator is campaign length; the numerator keeps incrementing
  as DXB-14 already did (previously `Level 6 / 5`).

## NEXT RECOMMENDED TASK
- **A live-playtested balance pass** covering the 7-type mix, the new
  10-level campaign, Time Attack's 90s clock, Endless's ramp, and
  DXB-16/DXB-19 unlock thresholds.
- **Visual/audio polish** — catch flash, crack-hit cue, "+N" popup,
  still deferred since DXB-05.
- **Background music**, explicitly deferred by DXB-10.
- Sticky Paddle, still deferred at DXB-09's own scoping.
