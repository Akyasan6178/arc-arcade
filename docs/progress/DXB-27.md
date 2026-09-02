# DXB-27 Tutorial & Paddle Redesign Pass

## TASK
Completely redesign the two weakest player-experience surfaces: How To
and paddle cosmetics. Incremental polish of DXB-25 / DXB-26 was
rejected. This pass replaces both presentations.

No changes to game modes, levels, achievements, themes, stats,
leaderboards, unlock requirements, powerups, or drop rates.

## STATUS
Completed. `npm run typecheck` and `npm run build` both pass (see
Requirements Verification).

## BEFORE / AFTER — TUTORIAL

### Before (DXB-26, rejected)

- Three-column board: left text, center icon/vignette, right text.
- Reading dominated. Large empty side cards.
- Brick page showed four static icons.
- Powerup page showed icon rows.
- Modes and progression were labeled cards, not behavior.

### After (DXB-27)

- Full-width live stage. Caption is one short line.
- Page 1 **Controls**: paddle auto-sweeps, ball launches, bounces off
  walls and paddle, re-serves on miss.
- Page 2 **Bricks**: four simultaneous mini-playfields.
  - Normal destroyed on one hit.
  - Cracked takes a first hit then a second.
  - Metal is hit repeatedly and stays.
  - Bonus is destroyed and drops a falling capsule the paddle catches.
- Page 3 **Powerups**: capsule falls, paddle collects, effect plays
  (widen, Fire Ball glow, Laser bolts) in a loop.
- Page 4 **Modes**: Classic bricks clear and levels advance; Time
  Attack clock and bar drain; Endless ball speeds up with a ramp bar.
- Page 5 **Progression**: live Garage paddle preview, opening lock,
  filling achievement card, cycling theme palettes.
- Visible **Previous / Next / Back**. Optional arrows still work.
  Portrait stacks brick / progression cards 2×2 and modes in a column.

## BEFORE / AFTER — PADDLES

### Before (rejected)

- Color variants with glow / outline emphasis.
- Pistons, waves, core, and pulse bands were too small to read as
  identity during play or in Garage.

### After

| Skin | Motif | Identity (motion) |
| --- | --- | --- |
| Titan | plates | Three pumping pistons with traveling caps |
| Neon | glow | Organic hull, swaying antennae, upward expanding signal waves |
| Reactor | core | Large core, spinning blades, three orbiting energy beads |
| Pulse | pulse | One energy slug traveling left → right with a trail |

A gameplay screenshot should reveal the equipped paddle from silhouette
and motion, not from fill color.

Garage preview is larger, drifts, and names the motion
(`Moving pistons`, `Rising signal waves`, …).

## VISUAL DESIGN DECISIONS

- **Watch, don't read.** The failed three-column layout taught by
  paragraphs. V3 teaches by looping miniature play.
- **Motion over palette.** Color remains a support cue. The recognizable
  feature is moving geometry that extends beyond the collision bar.
- **Shared drawer stays.** `paddleCosmetic.ts` still paints gameplay and
  Garage from the same tokens. No new skin ids. Collision is unchanged.
- **TutorialStage is a `ui/` widget.** Same shape as the old board:
  scene owns navigation; the widget owns the showcase. The board file
  was removed rather than kept as a failed layout.
- **Product version is `0.<DXB-task>.0`.** This pass is `DX-Ball v0.27.0`.

## FILES CREATED

- `src/ui/TutorialStage.ts` — full-width live how-to stage.
- `docs/progress/DXB-27.md` — this file.

## FILES MODIFIED

- `TutorialScene.ts` — hosts TutorialStage; Previous / Next / Back remain.
- `paddleCosmetic.ts` — Robot / Alien / Reactor / Pulse redrawn.
- `Paddle.ts` — comment only; collision unchanged.
- `Skins.ts` — `getPaddleMotionHint()`.
- `CollectionPreview.ts` / `GarageScene.ts` — larger drifting paddle + hint.
- `Version.ts` — `v0.27.0`.
- `ReleaseNotes.ts` — v0.27.0 card.
- `CreditsScene.ts` — version comment.
- `ui/README.md`.
- `docs/CURRENT_STATE.md`.

## FILES REMOVED

- `src/ui/TutorialBoard.ts` — the failed left / center / right layout.

## ARCHITECTURAL DECISIONS

- **Showcases are not MainScene.** They reuse `drawPaddleCosmetic`,
  brick recipes, and powerup icons without touching score, lives,
  drop tables, or mode rules.
- **Paddle motion is overlay-only.** The rectangle is still the
  collision body. Pistons / waves / orbits / slug do not change hitbox.
- **Unlock tables are untouched.** Same eight paddles, same gates.

## REQUIREMENTS VERIFICATION

`npm run typecheck` and `npm run build` both pass with no errors.

Restrictions held: no new game modes, levels, achievements, themes,
stats, leaderboards, unlock requirements, powerups, or drop rates.

## KNOWN RISKS

- Tutorial showcases and paddle cosmetics remain Phaser Graphics, not
  authored sprites.
- Browser-automation remains a weak stand-in for real-time feel
  (standing note since DXB-06A).

## DEFERRED IDEAS

- Sticky Paddle, still deferred at DXB-09.
- Real music files in the named manifest keys.
- A "+N" score popup.
- Wiring `OnlineLeaderboardAdapter` to a real host.

## NEXT RECOMMENDED TASK
Ship / host the release candidate.
