# DXB-24 Fun Factor Update

## TASK
Increase DX-Ball gameplay satisfaction and player excitement: Laser
Paddle, stronger brick-hit feedback, celebration FX for strong
powerups, richer Classic level cards, better end-of-run summaries, and
an online-ready leaderboard architecture. No currency, purchases, cloud
saves, accounts, or live online services.

## STATUS
Completed. `npm run typecheck` and `npm run build` both pass (see
Requirements Verification).

## SCOPE
Confirmed by the task itself:

1. **Laser Paddle** — rare timed powerup, 10s, paddle fires bolts.
2. **Brick impact pass** — type-specific hit FX.
3. **Powerup celebration FX** — Fire Ball, Multi Ball, Laser Paddle,
   Extra Life.
4. **Level cards** — mini layout + brick-type icons + difficulty.
5. **End-of-run summary** — Classic / Endless / Time Attack.
6. **Leaderboard architecture** — local layer + future online seam.
   No gameplay changes; no backend.

## LASER PADDLE DESIGN NOTES

Laser Paddle is an 8th `PowerupType` (`laser-paddle`, letter `Z`) on
the existing DXB-09/12 pipeline: `BrickGrid` still only queues a spawn
point; `PowerupDropTable` picks the type; `PowerupManager` still does
not know what the effect does; `MainScene.applyPowerupEffect()`
dispatches.

| Knob | Value | Why |
| --- | --- | --- |
| Duration | **10s** | Task-specified. Refresh-on-recatch, same as widen/fire. |
| Rarity | **6%** (rare) | Stronger than commons, rarer than Fire Ball's 8%. Extra Life stays the 3% special. |
| Fire rate | 280ms volley | Two bolts from the paddle ends (Arkanoid-style). |
| Bolt travel | 1.45 viewport-heights/s | Fast enough to feel like a laser, readable on the field. |
| Destructible bricks | 1 hit (cracked still 2) | Same as a ball, not a second Fire Ball. |
| Metal | **3 laser hits** to destroy | "May damage" metal without matching Fire Ball's one-shot pierce. Normal balls still bounce forever. Fire Ball still one-shots. |
| Score / drops | Unchanged | Metal still `awardsScore: false` and `powerupDrop: 'never'`. |
| HUD | `LASER Ns` | `ActiveEffectsLabel`, same as FIRE / WIDE. |
| Audio | `laser-fire` + existing `brick-break` / `brick-hit` | New cue only for the muzzle; hits reuse the brick vocabulary. |

The timed effect lives on `Paddle` (`applyLaserEffect` / remaining-ms /
queued muzzle points). `MainScene` owns the live `LaserBolt[]` the same
way it owns Multi Ball extras — `PowerupManager` still never holds a
projectile or a `Ball`. Level advance clears falling capsules **and**
bolts.

Weights still unique, still sum to 100:

| Type | Weight | Rarity |
| --- | ---: | --- |
| Extra Life | 3 | Very Rare |
| Laser Paddle | 6 | Rare |
| Fire Ball | 8 | Rare |
| Multi Ball | 13 | Uncommon |
| Small Paddle | 14 | Common |
| Fast Ball | 16 | Common |
| Widen Paddle | 18 | Common |
| Slow Ball | 22 | Common |

## IMPACT FX NOTES

`BrickGrid.finishContact()` now plays type-specific visuals via
`BrickImpactFx.ts` on every ball or laser contact. Collision, score,
and drop policy are unchanged.

- **Normal** — brighter white flash plus a small chip burst.
- **Cracked** — expansion lines; opening the damaged state adds a gold
  puncture flash on top of the existing split overlay.
- **Metal** — silver/gold sparks and a rim flash. Surviving hits also
  play the new `brick-hit` cue so metal is no longer a silent bounce.
- **Bonus** — gold gem starburst.

Laser chips on metal also scorch the steel overlay so remaining hits
are readable. Fire Ball pierce still force-destroys (including metal).

## POWERUP CELEBRATION

Catching Extra Life, Fire Ball, Multi Ball, or Laser Paddle still
plays `powerup-collect`, then adds:

- a longer `CatchFlash` (`celebrate: true`)
- `powerup-celebrate` fanfare
- a `PowerupCelebrate` label + ring at the paddle

Widen / Slow / Fast / Small keep the existing short flash only.

## LEVEL CARDS

`LevelPreviewModel` now carries `difficulty` (1–5) and `brickTypes`.
`LevelBrowser` still draws the miniature layout, then type icons
(normal / cracked / metal / bonus) and a star rating. Campaign
layouts are unchanged.

## END OF RUN

Classic victory, Endless completion, and Time Attack time-up share
`RunSummary.ts`. The card shows score, best, new overall / mode
records, local-board rank when the run made the Top 10, and unlock
progress (next locked catalog/achievement). Level-clear between
Classic stages is unchanged.

## FUTURE ONLINE LEADERBOARD NOTES

Do **not** treat this as a live service.

- `LeaderboardAdapter` is the persistence seam (`kind: 'local' | 'online'`).
- `LocalLeaderboardAdapter` owns the existing `dx-ball-leaderboards`
  JSON Top 10. Same key, same sort, same cap of 10.
- `OnlineLeaderboardAdapter` is a typed no-op: no fetch, no socket, no
  accounts, no cloud. `LeaderboardService.setAdapter()` is the future
  switch; gameplay never calls it.
- `submitScore` / `getLeaderboard` / `getLeaderboardRows` stay the
  public API. MainScene and StatsScene keep their call sites. Submit
  now returns `{ accepted, rank, isNewRecord }` for the result card.

A later online task would implement the adapter against a real host
and opt in via `setLeaderboardAdapter`. Until then every board is
local-only.

## FILES CREATED

- `src/entities/dx-ball/LaserBolt.ts`
- `src/entities/dx-ball/BrickImpactFx.ts`
- `src/entities/dx-ball/LeaderboardAdapter.ts`
- `src/entities/dx-ball/RunSummary.ts`
- `src/ui/PowerupCelebrate.ts`
- `docs/progress/DXB-24.md` — this file.

## FILES MODIFIED

- `Powerup.ts` / `PowerupDropTable.ts` / `PowerupManager.ts` / `Theme.ts`
  — Laser Paddle type, icon, weights, palettes.
- `Paddle.ts` — timed laser, dual muzzle, cannon overlay.
- `Brick.ts` / `BrickGrid.ts` — laser metal chips, projectile overlap,
  shared impact/score/drop path.
- `audioCues.ts` — `laser-fire`, `brick-hit`, `powerup-celebrate`.
- `MainScene.ts` — dispatch, HUD, bolts, celebration, run summary.
- `CatchFlash.ts` / `ResultOverlay.ts` / `LevelBrowser.ts` / `levels.ts`.
- `Leaderboards.ts` / `Progress.ts` — adapter facade, unlock hint, mode best.
- `TutorialScene.ts` / `ui/README.md` / `systems/README.md`.
- `docs/CURRENT_STATE.md`.

## ARCHITECTURAL DECISIONS

- **Laser is a paddle-timed effect plus scene-owned bolts.** Matches
  DXB-09 (entity owns the timer) and DXB-12 (scene owns extras that
  would go stale on a `Ball` replace).
- **Metal laser HP is separate from ball HP.** Normal balls still never
  destroy metal. Fire Ball still ignores both counters.
- **Impact FX are spawned at the contact site**, not a new particle
  system class. `BrickGrid` already owns the moment of hit.
- **Leaderboards stay in `entities/dx-ball`.** The seam is an adapter,
  not a `systems/` network client. `JsonStore` remains game-agnostic.

## REQUIREMENTS VERIFICATION

`npm run typecheck` and `npm run build` both pass with no errors.

Restrictions held: no currency, purchases, cloud save, accounts, store,
or online leaderboard backend. Gameplay scoring / lives / modes /
campaign layouts are unchanged aside from the new powerup and metal's
laser-only durability.

## KNOWN RISKS

- Laser fire rate, bolt speed, and 3-hit metal were not live-playtested
  in this environment (standing note since DXB-06A).
- Browser-automation remains unreliable for real-time feel.
- Synthesized impact / celebration FX are Phaser Graphics, not sprites.
- `OnlineLeaderboardAdapter` must never be selected by accident; the
  default factory always returns local.

## DEFERRED IDEAS

- Sticky Paddle, still deferred at DXB-09.
- Real music files in the named manifest keys.
- Visible mute toggle on the pause overlay.
- A "+N" score popup.
- Wiring `OnlineLeaderboardAdapter` to a real host.

## NEXT RECOMMENDED TASK
Ship / host the release candidate. Remaining work is optional polish
or a future online adapter implementation — not blockers for this pass.
