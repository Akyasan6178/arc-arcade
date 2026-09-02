# DXB-26 UI & Presentation Correction Pass

## TASK
Correct player-experience requirements that were requested previously
but were missed, misinterpreted, or implemented inadequately. This pass
exists because DXB-25 presentation did not satisfy actual player
testing. No new powerups, brick types, themes, levels, modes, currency,
purchases, accounts, or online systems.

## STATUS
Completed. `npm run typecheck` and `npm run build` both pass (see
Requirements Verification).

## PLAYER-VERIFIED RESOLUTIONS

| # | Problem | Resolution |
| --- | --- | --- |
| 1 | How To too text-heavy | Five-page visual board: live vignette center, short labels sides, visible Previous / Next / Back. |
| 2 | Credits oversized | One compact card. |
| 3 | Creator name | **Haydar Talha Akyasan** |
| 4 | Pause had no audio | Pause overlay hosts Music / SFX on-off plus volume meters. |
| 5 | Classic started from any level | Level Browser is preview-only. **Start Campaign** always launches Level 1. |
| 6 | Time Attack inherited leftover time | Each level starts with a fresh `TIME_ATTACK_DURATION_MS` (90s). |
| 7 | UI too text-heavy | Card menus, badges, pips, icons; shorter Hub / Theme / Mode copy. |
| 8 | No player-facing changelog | Hub **What's New** → compact milestone cards. |
| 9 | Developer/debug menus | SelectMenu / TabBar no longer use `> title <` prefixes. |

## CLASSIC CAMPAIGN FLOW

`LevelSelectScene` is a **LEVEL BROWSER · PREVIEW**.

- All 10 campaign cards remain tappable for inspection (layout thumbnail, difficulty pips, brick-type chips).
- Card confirm / Space / Enter do **not** start a run (`LevelBrowser` `previewOnly`).
- Visible **Start Campaign** always starts `MainScene` with `{ mode: 'classic' }`.
- `MainScene.init` forces `startLevelIndex = 0` so Restart Run also returns to Level 1.
- Campaign progression is unchanged: 1 → 2 → … → 10 → Victory.

## TIME ATTACK TIMER (FINAL)

Configured duration stays `TIME_ATTACK_DURATION_MS` (**90 seconds**).

That duration is now **per level**, not per run:

1. A Time Attack level begins → clock is `90.0s`, falling capsules are empty, laser bolts are empty, paddle timed effects are cleared, serve ball is fresh (so Fire / Slow / Fast do not carry).
2. Score, lives, and run statistics continue.
3. While the LEVEL CLEARED card is up, the clock **does not tick** (avoids TIME'S UP on the overlay).
4. Continue → next layout loads → clock is written back to `TIME_ATTACK_DURATION_MS`.
5. TIME'S UP still ends the run if a single level is not cleared in 90s.

Classic still carries paddle-timed effects across campaign stages.

## PAUSE AUDIO

`AudioPanel` is shared by Pause and Settings. It reads/writes the
existing `AudioManager` buses:

- Music On / Off (`musicEnabled`)
- SFX On / Off (`sfxEnabled`)
- Music Volume
- SFX Volume

Global mute (`enabled`, M key, `arc-arcade-audio-enabled`) still gates
both and still persists. Music/SFX flags persist under sibling keys.
Changes in Pause and Settings stay synchronized because they share one
manager.

## VERSIONING

**DX-Ball product version is `0.<DXB-task>.0`.**

This pass is DXB-26, so Hub / Credits / What's New show `DX-Ball v0.26.0`.

`package.json` stays `0.1.0` (arcade foundation).

## FILES CREATED

- `src/ui/AudioPanel.ts`
- `src/scenes/ReleaseNotesScene.ts`
- `src/entities/dx-ball/ReleaseNotes.ts`
- `docs/progress/DXB-26.md` — this file.

## FILES MODIFIED

- `Version.ts` — `v0.26.0`, creator Haydar Talha Akyasan.
- `AudioManager.ts` — independent music / SFX enable flags.
- `GameMode.ts` — Classic / Time Attack copy; per-level timer documented.
- `SceneKeys.ts` / `main.ts` — `ReleaseNotes`.
- `MainScene.ts` — Classic always Level 1; Time Attack timer reset.
- `LevelBrowser.ts` / `LevelSelectScene.ts` — preview-only + Start Campaign.
- `PauseOverlay.ts` / `SettingsScene.ts` — AudioPanel.
- `TutorialBoard.ts` / `TutorialScene.ts` — five visual pages.
- `CreditsScene.ts` — compact card.
- `HubScene.ts` — What's New, card rows, version subtitle.
- `SelectMenu.ts` / `TabBar.ts` / `ProgressList.ts` — card chrome.
- Theme / Mode / Stats / Achievements presentation.
- `Powerup.ts` — exported `drawPowerupIcon` for the How To board.
- `ui/README.md` / `systems/README.md`.
- `docs/CURRENT_STATE.md`.

## ARCHITECTURAL DECISIONS

- **Preview vs start is a LevelBrowser flag**, not a second grid widget.
- **Timer reset is scene-owned.** `GameMode.ts` still only names the duration.
- **AudioPanel is a `ui/` widget.** Pause and Settings do not grow a second audio system.
- **What's New copy lives in `ReleaseNotes.ts`**, same data-file shape as `Version.ts`.
- **Product version stays a DX-Ball constant**, not `package.json`.

## REQUIREMENTS VERIFICATION

`npm run typecheck` and `npm run build` both pass with no errors.

Restrictions held: no new game modes, themes, achievements, currencies,
online leaderboard backend, store, purchases, accounts, or cloud saves.
Gameplay systems other than Classic start index and Time Attack timer
reset are unchanged.

## KNOWN RISKS

- Tutorial vignettes are Phaser Graphics, not authored sprites.
- Browser-automation remains a weak stand-in for real-time feel
  (standing note since DXB-06A).
- Music volume 100% is still the DXB-22 internal bus.

## DEFERRED IDEAS

- Sticky Paddle, still deferred at DXB-09.
- Real music files in the named manifest keys.
- A "+N" score popup.
- Wiring `OnlineLeaderboardAdapter` to a real host.
- Currency, purchases, online leaderboards, accounts, cloud saves.

## NEXT RECOMMENDED TASK
Ship / host the release candidate.
