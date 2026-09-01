# DXB-23 Game Feel, Visual Depth & Presentation Pass

## TASK
Polish DX-Ball from a functional release candidate into a clearer
arcade experience: weighted powerup rarity, Extra Life as a special
reward, tighter Multi Ball grouping, richer brick and paddle visuals,
Classic level previews, Tutorial / Credits / version, and menu
hierarchy. No currency, purchases, online systems, cloud saves, or
new game modes.

## STATUS
Completed. `npm run typecheck` and `npm run build` both pass (see
Requirements Verification).

## SCOPE
Confirmed by the task itself:

1. **Weighted drop table** — replace the uniform 7-type draw.
2. **Extra Life rebalance** — very rare special reward.
3. **Multi Ball** — tighter split so extras stay grouped.
4. **Brick visual pass** — normal / cracked / metal / bonus. Mechanics
   unchanged.
5. **Paddle cosmetics** — unique silhouettes, not color-only.
6. **Classic level browser** — name, number, miniature layout.
7. **Tutorial + Credits** from the Hub.
8. **Visible version** — Hub and Credits.
9. **Menu presentation** — Hub / Garage / Statistics / Achievements /
   Theme Select / Mode Select hierarchy.

## FINAL DROP TABLE

Weights sum to 100. `BrickGrid` still rolls the existing 15% drop
chance (bonus bricks still always drop). `PowerupManager` only picks
the type.

| Type | Weight | Share | Rarity | Role |
| --- | ---: | ---: | --- | --- |
| Extra Life | 3 | 3% | Very Rare | Special reward |
| Fire Ball | 8 | 8% | Rare | Strong pierce |
| Multi Ball | 14 | 14% | Uncommon | Extra scoring pressure |
| Small Paddle | 15 | 15% | Common | Negative width |
| Fast Ball | 17 | 17% | Common | Negative speed |
| Widen Paddle | 19 | 19% | Common | Positive width |
| Slow Ball | 24 | 24% | Common | Positive speed |

No two types share a weight. Stronger effects are rarer.

### Extra Life expected rate

At 15% drop chance × 3% Extra Life ≈ **0.45% of destroyed bricks**.
A 40-brick level 1 is ~0.18 Extra Lives if every brick dies. A full
Classic clear is a handful of Extra Lives at most, not a climb to 15.
Bonus bricks still always drop, but they use the same weighted table.

Fire Ball duration stays **7s** (DXB-21). Rarity is the additional
lever for "still too powerful."

## MULTI BALL

| Knob | DXB-21 | DXB-23 |
| --- | --- | --- |
| Split | ±10° | **±5°** |
| Cap | 3 | Unchanged |
| Spend-on-miss | extras spend | Unchanged |

Extras stay in a tight cone so they remain readable as a group.

## VISUAL UPGRADE SUMMARY

### Bricks (overlay only; collision / hits / drops unchanged)

- **Normal** — 3D bevel: top sheen, left catch-light, right/bottom shade.
- **Cracked** — hairline fissure while healthy; damaged state opens a
  split, extra branches, and a chipped corner.
- **Metal** — steel plate, brushed bands, four rivets, specular streak,
  thick rim. Immediately reads as metal, not a row-color brick.
- **Bonus** — gold frame plus a faceted gem pip.

### Paddles (collision rectangle hidden; overlay is the body)

Shared drawer `paddleCosmetic.ts` is used in gameplay and Garage.

| Skin | Motif | Silhouette |
| --- | --- | --- |
| Classic | flat | Beveled bar |
| Carbon | bands | Chevron weave + end bolts |
| Neon | glow | Alien hull + traveling energy waves + antenna nubs |
| Reactor | core | Active circular core + pulse ring + side vents |
| Crystal | crystal | Faceted prism + traveling shard light |
| Titan | plates | Robot chassis + moving side pistons |
| Pulse | pulse | Channel with a traveling energy slug |
| Obsidian | shard | Jagged outline + inner shard |

### Menus

- Hub shows `MAIN MENU  ·  DX-Ball v1.0.0`, an accent rule, and
  Tutorial / Credits rows.
- Theme Select uses the accent rule and clearer locked-preview hint.
- Mode Select: Classic opens the level browser. Time Attack / Endless
  still start immediately.
- Statistics subtitle names the local boards. Garage collection
  percent subtitle is unchanged.

## NEW SCREENS

- **Level Select** — Classic-only. 10 named campaign layouts as
  tappable thumbnails. Confirm starts Classic at that index. Restart
  Run returns to the same start index. Time Attack / Endless skip it.
- **Tutorial** — Hub. Tabs: Paddle / Bricks / Powerups / Modes / Unlocks.
- **Credits** — Hub. Title, `DX-Ball v1.0.0`, development credits.

Level names (layouts unchanged): Opening Volley, First Cracks, Mixed
Field, Steel Corridors, Type Mix, Precision, Fracture, Metal Maze,
Bonus Hunt, Finale.

## FILES CREATED

- `src/entities/dx-ball/Version.ts`
- `src/entities/dx-ball/PowerupDropTable.ts`
- `src/entities/dx-ball/paddleCosmetic.ts`
- `src/ui/LevelBrowser.ts`
- `src/scenes/LevelSelectScene.ts`
- `src/scenes/TutorialScene.ts`
- `src/scenes/CreditsScene.ts`
- `docs/progress/DXB-23.md` — this file.

## FILES MODIFIED

- `PowerupManager.ts` — weighted pick.
- `MainScene.ts` — ±5° Multi Ball; Classic `startLevelIndex`.
- `Paddle.ts` / `CollectionPreview.ts` — shared cosmetic drawer.
- `Brick.ts` — richer type recipes.
- `levels.ts` — display names + preview models.
- `GameMode.ts` — Classic description.
- `HubScene.ts` / `ThemeSelectScene.ts` / `ModeSelectScene.ts` /
  `StatsScene.ts` / `CreditsScene.ts` — hierarchy / routing.
- `SceneKeys.ts` / `main.ts` / `menuLayout.ts` / READMEs.
- `docs/CURRENT_STATE.md`.

## ARCHITECTURAL DECISIONS

- **Weights live beside types, not in BrickGrid.** DXB-09's split
  remains: the grid queues a spawn point; the manager picks a type.
- **Level Select is Classic-only.** Wrapping modes still start from
  Mode Select so Time Attack / Endless do not pretend to be a campaign
  picker.
- **Paddle cosmetics stay tokens.** No new skin ids. The drawer is
  shared so Garage matches gameplay.
- **Version is a DX-Ball constant**, not `package.json` (that file
  versions the arcade foundation).

## REQUIREMENTS VERIFICATION

`npm run typecheck` and `npm run build` both pass with no errors.

Restrictions held: no new game modes, currency, purchases, online
leaderboards, accounts, or cloud saves. Brick / powerup *effects* are
unchanged aside from drop weights and Multi Ball split.

## KNOWN RISKS

- Drop weights and ±5° Multi Ball are reasoned from playtest notes,
  not a second live session in this environment. Browser-automation
  remain unreliable for real-time feel (standing note since DXB-06A).
- Starting Classic at a late level still counts as the same run for
  achievements (Classic complete / perfect run). That is intentional
  inspect-then-play, not a new unlock gate.
- Synthesized cosmetics are Phaser Graphics, not authored sprites.

## DEFERRED IDEAS

- Sticky Paddle, still deferred at DXB-09.
- Real music files in the named manifest keys.
- A "+N" popup or crack-hit cue.
- Visible mute toggle on the pause overlay.
- Per-level unlock gates on the Classic browser (every layout is
  browsable now).
- Fire Ball metal rules — still one-hit destroy; rarity is the lever.
- Currency, purchases, online leaderboards, accounts, cloud saves.

## NEXT RECOMMENDED TASK
Ship / host the release candidate. Remaining work is optional polish
(real music files, pause mute toggle), not blockers for this pass.
