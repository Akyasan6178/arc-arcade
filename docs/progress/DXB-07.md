# DXB-07 Life System

## TASK
Implement the missing losing condition for DX-Ball: a limited number of
lives per run, lost one at a time on each missed ball, ending the run in
a "GAME OVER" state (with restart) once they reach zero — the standing
recommendation flagged by DXB-04, DXB-05, DXB-06, and DXB-06A alike.

## STATUS
Completed

## SCOPE
Unlike DXB-04/05/06 (whose task names were ambiguous enough to need
scope confirmed with the requester up front), "Life System" combined
with `CURRENT_STATE.md`'s own already-detailed recommendation left one
real open decision: the starting lives count. `STARTING_LIVES = 3` was
chosen as the standard, well-established default for this exact genre
(Breakout/Arkanoid/DX-Ball) rather than blocking on a question for it —
documented as a placeholder tuning value below, consistent with every
other ratio/config value flagged the same way since DXB-01.

Explicitly decided, not asked about, since the architecture made them
unambiguous:
- **Lives HUD reuses `ScoreLabel`**, not a new widget — `ui/README.md`
  and `ScoreLabel.ts`'s own doc comment already named "a lives counter"
  as its next intended reuse.
- **Lives display as plain text (`Lives: 3`), not heart icons** — no
  asset pipeline exists yet (`src/assets/` is still empty per its own
  README), so icons would have required out-of-scope asset-loading work.
- **A miss decrements lives but still re-serves the ball** (unchanged
  behavior) **unless that miss brings lives to zero**, in which case the
  run ends instead — the smallest change that turns "missed ball" into
  "lost life" without altering the existing serve/miss mechanics DXB-02
  already built.

## FILES MODIFIED
- `src/entities/dx-ball/Ball.ts` — added a `missCount` counter,
  incremented in `returnToPaddle()` (the sole caller, itself only
  triggered by a bottom-edge exit), and a `getMissCount()` query —
  mirrors `BrickGrid.getScore()`'s "running counter + getter" shape
  exactly. No other change to serve/miss behavior.
- `src/ui/ScoreLabel.ts` — extended `ScoreLabelAnchor` from two corners
  (`top-left` | `top-right`) to all four, adding `bottom-left` and
  `bottom-right`. `computePosition()`/a new `computeOrigin()` derive
  x/y and text origin from whichever corner is requested, generalizing
  what was previously two special-cased branches.
- `src/scenes/MainScene.ts` — the scene now owns the lives count itself
  (the same "owning scene polls a getter" pattern already used for
  score/win):
  - `STARTING_LIVES` (3) resets `lives` each `create()`, alongside a
    `lastMissCount` counter.
  - A third `ScoreLabel` (`Lives: `, `bottom-left`) joins the existing
    Score/Best pair.
  - `updateLives()`, called every frame right after `updateScore()`,
    diffs `ball.getMissCount()` against `lastMissCount` and decrements
    `lives` by the difference (clamped at 0), updating the label.
  - `update()` now also checks `this.lives <= 0` (after the existing
    `isCleared()` win check) and calls the new `handleGameOver()`.
  - `handleGameOver()` mirrors `handleWin()` exactly: sets a new `lost`
    flag (checked in the same early-return guard at the top of
    `update()`, alongside `won`), shows a message, and arms the same
    one-shot `keydown-SPACE` restart listener.
  - `createWinText()`/a would-be `createGameOverText()` were unified
    into one `createCenteredMessage(width, height, message)` helper,
    since the two messages were otherwise identical layout with
    different text — avoiding copy-pasted layout code.
  - `handleViewportChange()` now also resizes the lives label and
    repositions/rescales the game-over text, the same way it already
    does for every other HUD element and the win text.
- `src/ui/README.md` — noted DXB-07's bottom-anchor addition and that
  DX-Ball's lives counter is the reuse case this file's own text had
  already anticipated.

## ARCHITECTURAL DECISIONS
- **A miss is counted via a polled counter, not an event/callback.**
  `Ball` still has zero knowledge of lives, game-over, or `MainScene` —
  it only exposes "how many times have I been missed so far", the exact
  same shape as `BrickGrid.getScore()`. `MainScene` diffs that counter
  against its own last-seen value every frame, exactly how it already
  diffs the score against the best score. This was chosen deliberately
  over adding an `onMiss` callback/event bus, since the project has
  established "owning scene polls a getter" as its one collision/state
  pattern (`isCleared()`, `getScore()`) and a life system fits it exactly
  as well as scoring already did.
- **`lost` is a sibling flag to `won`, not a merged "game over" enum.**
  Both freeze `update()` via the same guard and both show a centered
  message with a restart prompt, but keeping them separate booleans (as
  opposed to a single `'playing' | 'won' | 'lost'` state) avoided
  touching the already-working, already-shipped `won`/`winText` code
  path at all — this task only ever adds alongside it, never edits its
  existing logic beyond the guard clause and the shared text-layout
  helper.
- **`ScoreLabelAnchor` gained two corners instead of a new widget.**
  `ui/README.md` explicitly named a lives counter as `ScoreLabel`'s next
  reuse case; the only reason it couldn't be reused as-is was that both
  top corners are already taken by Score/Best. Generalizing the existing
  two-branch corner logic to four corners (via `computeOrigin()`) kept
  the widget itself just as generic as before — it still has no opinion
  on "score" vs. "lives" as concepts, only "a prefix + number pinned to
  a corner."
- **A miss still re-serves the ball exactly as before, right up until
  the life it costs is the last one.** `Ball.returnToPaddle()` is
  unchanged — it always re-homes the ball and re-arms Space. `MainScene`
  is the only thing that decides whether "another life" or "game over"
  follows a miss, by checking `lives <= 0` *after* `updateLives()` in the
  same frame. If lives hit zero, `update()`'s guard freezes the *next*
  frame's `paddle.update()`/`ball.update()` calls — so the ball has
  already been quietly re-armed above the paddle by the time the freeze
  takes effect, exactly mirroring how a win freezes mid-flight without
  needing the ball's own state cleaned up first.

## REQUIREMENTS VERIFICATION
Manually verified in a running dev build (Chrome DevTools Protocol
automation), using a temporary debug hook exposing the `Phaser.Game`
instance on `window` (added, used, then fully reverted before this
change set was finalized — `git diff --stat src/main.ts` confirms zero
diff, the same discipline DXB-06A's own closure documented):
- Fresh load shows `Score: 0` / `Best: 0` (top corners) and `Lives: 3`
  (bottom-left) — all three `ScoreLabel` instances render correctly at
  their anchored corners.
- Real gameplay (left running in the background) organically reached
  `Score: 300` / `Best: 300` before this check, confirming the existing
  score/best flow still works unchanged.
- Forcing `scene.lives = 1` then a real miss (ball driven past the
  paddle via direct, deterministic `ball.update(16)` calls rather than
  relying on this environment's throttled/unfocused `requestAnimationFrame`
  timing — the same reliability issue DXB-06A's closure documented)
  drove `missCount` to 1, and the scene's own real update loop then
  picked it up on its own: `lives` dropped to 0 and `lost` became `true`
  without any further intervention.
- The resulting screen showed `GAME OVER / Score: 300 / Press Space to
  try again` centered, alongside `Lives: 0`, with the ball and paddle
  frozen in place.
- Pressing Space restarted the scene: fresh brick grid, `Score: 0`,
  `Lives: 3` (reset), and `Best: 300` (correctly persisted, unlike the
  per-run state).

`npm run typecheck` and `npm run build` both pass with no errors (the
shell tool again required the `all` permission this session — see Known
Risks, a continuation of the same environment finding from DXB-06A).

## KNOWN RISKS
- **`STARTING_LIVES` (3) is a placeholder tuning value, not playtested**
  — consistent with every other ratio/config value flagged the same way
  since DXB-01, and explicitly not blocked on a scope question per this
  task's own Scope section above. Combined with DXB-06A's still-
  unplaytested narrower paddle/smaller bricks, a future balance pass may
  want to tune lives count alongside paddle width/ball speed together
  rather than in isolation.
- **No visual/audio feedback for losing a life** (e.g. a flash, a sound,
  a brief pause before re-serving) — a miss re-serves exactly as
  instantly as it always did, just now also ticking the lives counter
  down. Raised as a possible future polish item, not selected here, the
  same way DXB-05/DXB-06 deferred hit-feedback polish.
- **This environment's browser-automation tab is still unreliable for
  real-time gameplay verification** (the same finding DXB-06A's closure
  documented in detail: unfocused/throttled `requestAnimationFrame`).
  This task's live verification worked around it by driving the ball
  deterministically via direct `update()` calls for the miss itself, but
  then relied on the *scene's own* real update loop (running in the
  background the whole session, apparently unthrottled enough to reach
  `Score: 300` organically) to prove `updateLives()`/`handleGameOver()`
  actually run for real, not just when manually invoked. Full realistic
  playtesting (e.g. "does 3 lives feel fair against the current
  paddle/ball speed") was not attempted, for the same reason DXB-06A
  couldn't attempt it.
- **The temporary `window.__debugGame` hook used for verification
  mirrors DXB-06A's own temporary debug hook** — same technique, same
  full revert before finalizing (confirmed via `git diff --stat
  src/main.ts` showing zero diff).
- **DXB-06A's own changes were still uncommitted in git when this task
  started** (the last commit on `main` was DXB-06, despite
  `CURRENT_STATE.md` already listing DXB-06A as the last completed
  task). Committed as its own separate `DXB-06A Balance Pass` commit as
  part of this task's closure, ahead of this task's own commit — the
  same precedent DXB-06's closure set for DXB-05.

## NEXT RECOMMENDED TASK
The gameplay loop is now fully closed (win, lose, score, best score,
lives) — every "next recommended task" since DXB-04 has now been
addressed. Good candidates going forward, none yet confirmed with a
requester:
- **Visual/audio feedback polish** — a "+N" popup or label flash on
  scoring, a flash/sound on losing a life, a sound on winning/losing.
  Repeatedly raised and repeatedly deferred since DXB-05.
- **A live-playtested balance pass** covering paddle width, ball/paddle
  speed, bounce angle, brick size, and now starting lives together —
  every one of these has been tuned or left as a placeholder in
  isolation so far (DXB-01 through DXB-07), never against each other in
  a real playthrough, due to this environment's recurring browser-
  automation playtesting limitations.
- **A sound/audio system** (`systems/` still lists it as an unbuilt
  example) or a pause/main menu (`ui/` still has no menu component).
