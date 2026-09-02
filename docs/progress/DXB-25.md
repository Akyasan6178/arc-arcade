# DXB-25 Player Experience Pass

## TASK
Improve DX-Ball game feel, progression balance, presentation quality,
and overall player experience from playtesting feedback. Refinement
and quality only — no new game modes, themes, achievements, currencies,
online systems, or cloud saves.

## STATUS
Completed. `npm run typecheck` and `npm run build` both pass (see
Requirements Verification).

## PLAYER-FEEDBACK RESOLUTIONS

| # | Feedback | Resolution |
| --- | --- | --- |
| 1 | Fire Ball still too powerful | Duration **7s → 5s**. Pierce / metal rules unchanged. |
| 2 | Laser Paddle dramatically too powerful | Duration **10s → 5s**. Weight **6% → 4%** (Very Rare). |
| 3 | Extra Life still too impactful | Weight **3% → 2%**, rarity **Extremely Rare**. |
| 4 | Powerups need weighted rarity by strength | Final table below. Unique weights, sum 100. |
| 5 | Time Attack should start each level clean | Timed effects reset on wrap. Score remains. |
| 6 | Paddle cosmetics not alive enough | Stronger silhouettes: pistons, signal waves, rotating core, traveling bands. |
| 7 | Tutorial presentation weak | Visual three-column board (example center, notes sides). |
| 8 | Credits presentation weak | Card layout with Powered By / Created By / version. |
| 9 | Achievement completion hard to notice | Gold border, glow, ribbon, ✓ COMPLETE badge. |
| 10 | UI too text-heavy | Cards, icons, color coding, shorter Hub copy. |
| 11 | Version information inaccurate | Product version **DX-Ball v0.25.0**. |
| 12 | Obvious creator attribution | Hub hint + Credits cards: Akif Yasan / Marka Mutfağı. |

## FINAL DROP TABLE

`BrickGrid` still rolls the existing 15% drop chance (bonus bricks
still always drop). `PowerupManager` only picks the type via
`PowerupDropTable.ts`. Weights are unique and sum to 100.

| Type | Weight | Share | Rarity |
| --- | ---: | ---: | --- |
| Extra Life | 2 | 2% | Extremely Rare |
| Laser Paddle | 4 | 4% | Very Rare |
| Fire Ball | 8 | 8% | Rare |
| Multi Ball | 13 | 13% | Uncommon |
| Small Paddle | 16 | 16% | Common |
| Fast Ball | 17 | 17% | Common |
| Widen Paddle | 19 | 19% | Common |
| Slow Ball | 21 | 21% | Common |

### Extra Life expected rate

At 15% drop chance × 2% Extra Life ≈ **0.30% of destroyed bricks**.
A 40-brick level 1 is ~0.12 Extra Lives if every brick dies. Extra
Life remains a special reward, not a climb.

## FINAL RARITY TABLE

| Rarity | Types | Role |
| --- | --- | --- |
| Extremely Rare | Extra Life | Special reward. Must stay scarce. |
| Very Rare | Laser Paddle | Exciting, not a default weapon. |
| Rare | Fire Ball | Strong pierce, short 5s window. |
| Uncommon | Multi Ball | Extra scoring pressure. |
| Common | Widen, Slow, Fast, Small | Everyday table. |

Durations (unchanged unless noted):

| Type | Duration |
| --- | --- |
| Fire Ball | **5s** (was 7s) |
| Laser Paddle | **5s** (was 10s) |
| Widen / Slow | 8s |
| Fast Ball | 10s |
| Small Paddle | 15s |
| Extra Life / Multi Ball | Instant |

## VERSIONING SCHEME

**DX-Ball product version is `0.<DXB-task>.0`.**

This pass is DXB-25, so Hub / Credits show `DX-Ball v0.25.0`.

- DXB-23 introduced `v1.0.0` as release-candidate chrome. That did not
  match the numbered polish history (DXB-21 through DXB-24) and read as
  a finished 1.0 while passes were still landing.
- `package.json` stays `0.1.0` — that file versions the Arc Arcade
  foundation, not the DX-Ball product string.
- `Version.ts` remains the single product/attribution source
  (`GAME_TITLE`, `GAME_VERSION`, `CREATOR_NAME`, `STUDIO_NAME`).

## TIME ATTACK CLEAN RESET

On `advanceToNextLevel()` when `mode === 'time-attack'`:

- Paddle timed effects clear (`widen` / `small` / `laser`)
- Falling capsules already clear (all modes)
- Laser bolts already clear (all modes)
- Serve ball is already replaced, so Fire / Slow / Fast do not carry
- Score, lives, and mode flow are unchanged

Classic still carries paddle-timed effects across campaign stages.

## FILES CREATED

- `src/ui/TutorialBoard.ts` — visual how-to board.
- `docs/progress/DXB-25.md` — this file.

## FILES MODIFIED

- `PowerupDropTable.ts` / `PowerupManager.ts` — final weights + rarity.
- `MainScene.ts` — Fire/Laser 5s; Time Attack timed-effect reset.
- `Paddle.ts` / `Ball.ts` — `clearTimedEffects()`.
- `paddleCosmetic.ts` — stronger robot / alien / reactor / pulse identity.
- `Version.ts` — `v0.25.0` plus creator / studio constants.
- `AudioManager.ts` — persisted music / SFX volume on existing buses.
- `SettingsScene.ts` — mute card + music / SFX meters.
- `TutorialScene.ts` / `CreditsScene.ts` / `HubScene.ts` /
  `AchievementsScene.ts` / `LevelSelectScene.ts` — presentation pass.
- `ProgressList.ts` / `LevelBrowser.ts` / `TutorialBoard.ts`.
- `ui/README.md` / `systems/README.md`.
- `docs/CURRENT_STATE.md`.

## ARCHITECTURAL DECISIONS

- **Duration stays in `POWERUP_DURATION_MS`.** Same seam as DXB-21.
- **Rarity stays in `PowerupDropTable.ts`.** BrickGrid still only
  decides whether a capsule drops.
- **Time Attack reset is scene-owned.** Paddle/Ball expose clear
  methods; they still do not know modes exist.
- **Volume is not a new audio system.** User 0..1 multiplies the
  existing SFX bus and music bus. Mute is still `enabled`.
- **Version stays a DX-Ball constant**, not `package.json`.
- **TutorialBoard is a `ui/` widget**, same shape as LevelBrowser.

## REQUIREMENTS VERIFICATION

`npm run typecheck` and `npm run build` both pass with no errors.

Restrictions held: no new game modes, themes, achievements, currencies,
online leaderboard backend, store, purchases, accounts, or cloud saves.
No new gameplay mechanics beyond duration / rarity / Time Attack reset.

## KNOWN RISKS

- Drop weights and 5s Fire/Laser are reasoned from playtest notes, not
  a second live session in this environment (standing note since
  DXB-06A). Browser-automation remains unreliable for real-time feel.
- Synthesized cosmetics and tutorial drawings are Phaser Graphics, not
  authored sprites.
- Music volume 100% is still the DXB-22 internal bus (beds sit under
  SFX). User 50% is half of that mix.

## DEFERRED IDEAS

- Sticky Paddle, still deferred at DXB-09.
- Real music files in the named manifest keys.
- Visible mute toggle on the pause overlay.
- A "+N" score popup.
- Wiring `OnlineLeaderboardAdapter` to a real host.
- Per-level unlock gates on the Classic browser.
- Currency, purchases, online leaderboards, accounts, cloud saves.

## NEXT RECOMMENDED TASK
Ship / host the release candidate. Remaining work is optional polish
or a future online adapter — not blockers for this pass.
