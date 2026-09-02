# DXB-28 Online Leaderboard Preparation

## TASK
Prepare DX-Ball for future online score sharing and global
leaderboards without shipping a production online service. This pass
adds a reusable score-submission model, a pluggable leaderboard
service, a local player-name setting, a shareable run summary, and an
Online (Coming Soon) placeholder. No accounts, authentication, cloud
saves, purchases, currency, matchmaking, friends, or new gameplay.

## STATUS
Completed. `npm run typecheck` and `npm run build` both pass (see
Requirements Verification).

## SCOPE
Confirmed by the task itself:

1. **Score submission model** — every leaderboard entry carries player
   name, score, mode, highest level reached, date, and version.
2. **Leaderboard service layer** — local Top 10 keeps working; online
   is an unwired adapter. No real backend.
3. **Player profile name** — stored locally, editable in Settings,
   default `Player`, used on future leaderboard entries.
4. **Shareable run summary** — Score, Mode, Highest Level Reached,
   Active Theme, and Date on the end-of-run card.
5. **Leaderboard screen** — Local and Online (Coming Soon) tabs. Online
   states Coming Soon and does not fabricate ranks.
6. **Release-readiness review** — Statistics, Leaderboards, and Run
   Summary use the same labels.

## LEADERBOARD ARCHITECTURE

```
MainScene.submitRunIfNeeded()
  -> Leaderboards.submitScore(submission)
       -> LeaderboardService fills player name / date / version
       -> LeaderboardAdapter.submit(entry)

StatsScene Local tab
  -> Leaderboards.getLeaderboardRows(mode)
       -> LocalLeaderboardAdapter.list(mode)

StatsScene Online tab
  -> Leaderboards.getOnlineComingSoonRows()
       -> placeholder copy only; adapter is not queried for fake scores
```

- `LeaderboardEntry` is the reusable model. Local JSON and a future
  HTTP payload should use these same fields.
- `LeaderboardService` is the only gameplay-facing owner. MainScene
  never imports an adapter.
- `LocalLeaderboardAdapter` still owns `dx-ball-leaderboards` (Top 10
  per mode, scores of 0 ignored, sort by score then date).
- `OnlineLeaderboardAdapter` remains a typed no-op (`accepted: false`,
  empty lists). `setLeaderboardAdapter()` is the future switch.
- Old saves that only stored `{ score, recordedAt }` still load. Missing
  name becomes `Player`; missing level / version / mode are filled from
  the board key or left empty.

## FUTURE BACKEND INTEGRATION NOTES

Do **not** treat this as a live service.

When a real host exists:

1. Implement fetch/post **inside** `OnlineLeaderboardAdapter`. Do not
   add networking to MainScene, StatsScene, or `Leaderboards.ts`.
2. POST the `LeaderboardEntry` fields as-is (playerName, score, mode,
   highestLevelReached, recordedAt, version). Do not invent a second
   score shape.
3. Opt in with `setLeaderboardAdapter(new OnlineLeaderboardAdapter())`.
   Keep `LocalLeaderboardAdapter` as the offline fallback.
4. Authentication, if added later, belongs at the transport layer
   (headers / tokens). The entry model is not an account record.
5. The Statistics Online tab should then call `adapter.list()` instead
   of `getOnlineComingSoonRows()`. Until that day the tab must keep
   saying Coming Soon so an empty live board is not mistaken for ranks.

Out of scope until that later task: accounts, cloud saves, friends,
matchmaking, and any public network call.

## PLAYER PROFILE DESIGN

- Local only. Key: `dx-ball-player-profile`.
- Default display name: `Player`.
- Max length: 16 characters, trimmed, empty input snaps back to
  `Player`.
- Editable in Settings under PROFILE (sibling of AUDIO).
- The name is copied onto a leaderboard entry at submit time. Changing
  the setting later does not rewrite old rows.
- This is not an account, login, cloud identity, or save slot.

## TERMINOLOGY

Statistics, Leaderboards, and Run Summary now share:

| Label | Meaning |
| --- | --- |
| Score | This run's points |
| Highest Score | Best points across modes (lifetime) |
| Highest Classic / Time Attack / Endless Score | Per-mode personal best |
| Mode | Classic / Time Attack / Endless |
| Highest Level Reached | Furthest stage in that run |
| Active Theme | Theme used for the run |
| Date | Calendar day of the finish |
| Version | Product version stamped on the entry |
| Player Name | Local display name |
| Local | On-device Top 10 |
| Coming Soon | Online boards are not live |

Lifetime Stats no longer repeats the per-mode highs that Personal
Bests already lists.

## FILES CREATED

- `src/entities/dx-ball/PlayerProfile.ts`
- `src/ui/ProfilePanel.ts`
- `src/ui/NamePrompt.ts`
- `docs/progress/DXB-28.md` — this file.

## FILES MODIFIED

- `LeaderboardAdapter.ts` / `Leaderboards.ts` — full entry model,
  service fill-in, Coming Soon rows.
- `RunSummary.ts` — shareable format on the result card.
- `MainScene.ts` — submits the full entry; passes theme + highest
  level into the summary.
- `StatsScene.ts` — Local / Online (Coming Soon) tabs.
- `SettingsScene.ts` — player-name setting.
- `Progress.ts` — shared Highest Score wording.
- `TabBar.ts` / `menuLayout.ts` / `ResultOverlay.ts`.
- `Version.ts` / `ReleaseNotes.ts` — `DX-Ball v0.28.0`.
- `ui/README.md` / `systems/README.md`.
- `docs/CURRENT_STATE.md`.

## ARCHITECTURAL DECISIONS

- **Keep the DXB-24 adapter seam.** A second service class would fork
  the public API MainScene already calls.
- **Player profile is a sibling store**, same reason leaderboards do
  not live on the progress blob: a bad name must not wipe unlocks.
- **Online tab does not call the online adapter.** An empty list would
  look like a live board with no scores. The placeholder is explicit.
- **Name editing uses a DOM overlay.** Phaser has no text field;
  `window.prompt` is worse on mobile. This is still local-only.

## REQUIREMENTS VERIFICATION

`npm run typecheck` and `npm run build` both pass with no errors.

Restrictions held: no real online backend, accounts, networking,
cloud storage, matchmaking, friends list, purchases, currency, or
new gameplay.

## KNOWN RISKS

- Browser-automation remains a weak stand-in for real-time play
  (standing note since DXB-06A). End-of-run copy was checked by
  construction and by exercising a short lose path where possible.
- `OnlineLeaderboardAdapter` must never be selected by accident; the
  default factory still returns local.

## DEFERRED IDEAS

- Wiring `OnlineLeaderboardAdapter` to a real host.
- Sticky Paddle, still deferred at DXB-09.
- Real music files in the named manifest keys.
- A "+N" score popup.

## NEXT RECOMMENDED TASK
Ship / host the release candidate. Online leaderboards remain
architecture-only until a later backend task.
