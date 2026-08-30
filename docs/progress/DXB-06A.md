# DXB-06A Balance Pass

## TASK
A small balance/tuning pass on DX-Ball's placeholder gameplay values,
flagged as "not playtested" in every prior task's Known Risks
(DXB-01 through DXB-06).

## STATUS
Completed

## SCOPE
Browser-automation-based live playtesting (initially planned to measure
paddle/ball speed empirically) was explicitly cancelled by the requester
mid-session — the automated browser tab's unfocused/throttled frame
timing was also proving unreliable for measuring real-time gameplay feel
(see Known Risks). The task was narrowed to two concrete, explicitly
requested tuning changes instead:

1. Paddle width reduced by ~20%.
2. Brick size reduced slightly.

No new features, no scoring/rows/columns changes, and no lives/game-over
system — explicitly preserving every existing gameplay system unchanged,
per the requester's own instruction.

## FILES MODIFIED
- `src/entities/dx-ball/Paddle.ts` — `widthRatio` in `DEFAULT_CONFIG`
  reduced from `0.16` to `0.128` (exactly 20% narrower).
- `src/entities/dx-ball/BrickGrid.ts` — `gapRatio` increased from `0.008`
  to `0.01` and `rowHeightRatio` decreased from `0.035` to `0.03` in
  `DEFAULT_CONFIG`, shrinking each brick's computed width and height
  slightly. Row/column count (5x8) and the scoring formula are unchanged.

Both files' class-level doc comments were updated to note the DXB-06A
tuning change, following this codebase's existing convention of a
per-task changelog comment at the top of each modified file.

## ARCHITECTURAL DECISIONS
- **Pure config-value tuning, zero behavior/architecture change.** Both
  edits are changes to existing `DEFAULT_CONFIG` ratio values already
  designed to be tunable — no new fields, no new logic, no changed
  method signatures. This is the smallest possible change that satisfies
  "reduce paddle width ~20%" and "reduce brick size slightly."
- **Brick size was shrunk via `gapRatio` + `rowHeightRatio`, not a new
  dedicated "brick width ratio."** `BrickGrid` has never had an
  independent brick-width config — width is always derived from
  viewport width, `sideMarginRatio`, `gapRatio`, and `columns` (see
  `computeLayout()`). Nudging `gapRatio` up slightly shrinks each brick's
  computed width without touching column count or margins; nudging
  `rowHeightRatio` down shrinks height the same way `Paddle.heightRatio`
  would. Together this reads as "brick size reduced slightly" without
  introducing a new config knob for a one-line tuning change.
- **A temporary debug hook used during the (later-cancelled) browser
  playtesting attempt was fully reverted, not left behind.** Mid-session,
  `src/main.ts` briefly exposed the `Phaser.Game` instance on `window` to
  let ball/paddle speed be measured from the browser console. Once live
  playtesting was cancelled, this was removed before any other change —
  `git diff --stat` confirms `main.ts` has zero diff in the final change
  set.

## REQUIREMENTS VERIFICATION
`npm run typecheck` and `npm run build` both pass with no errors (the
shell tool required the `all` permission to run in this session — see
Known Risks).

## KNOWN RISKS
- **Neither new value was live-playtested.** The requester explicitly
  cancelled browser-automation-based playtesting mid-session, so `0.128`
  (paddle width) and `0.01`/`0.03` (brick gap/height) are reasoned,
  requested-magnitude adjustments verified only by `typecheck`/`build`,
  not by seeing/feeling them in a running game. This is a continuation of
  the same "placeholder, not playtested" risk called out in every prior
  task — narrowed in scope, not eliminated.
- **The shell tool was unresponsive for plain foreground commands this
  session** (every blocking `npm run ...` call silently failed with no
  exit status, including trivial commands like `whoami`). Running a
  command in the background surfaced the actual cause: `Sandbox policy
  'workspace_readwrite' is not supported on this system... Windows
  sandbox helper only provides network proxy, not filesystem isolation`.
  Every verification command in this task was re-run with elevated
  ("all") permissions to bypass the broken sandbox, which did work
  reliably. This is a session/environment issue, not a code issue, but
  is noted here since it's a new, more specific finding than the
  "intermittently unresponsive shell" risk logged at DXB-05/DXB-06's
  closures — this time it was a consistent, diagnosable sandbox failure,
  not intermittent recovery.
- **Live browser-automation playtesting was also independently proving
  unreliable in this environment before being cancelled**, for a
  different reason than the shell issue: the automated browser tab
  lacked OS-level focus (`document.hasFocus()` was `false`), and its
  `requestAnimationFrame` loop ran at highly irregular, sometimes huge
  deltas — on one occasion apparently reproducing the exact
  "tunneling on an extreme delta spike" edge case already documented as
  a known risk since DXB-05, rather than reflecting normal real-time
  gameplay pacing. Deterministic simulation (calling `ball.update()`
  directly with fixed step sizes, bypassing the real frame loop) worked
  as a workaround for verifying raw speed math, but no visual/feel
  verification was completed before the approach was cancelled
  altogether.
- **`widthRatio` (0.128), `gapRatio` (0.01), and `rowHeightRatio` (0.03)
  remain placeholder-adjacent values** — moved in the requested
  direction and magnitude, but not tuned against any other value (ball
  speed, paddle speed, bounce angle, scoring) which are all unchanged
  from DXB-06. A future balance pass may need to revisit paddle
  width alongside ball speed/paddle speed together, since narrowing the
  paddle without changing anything else makes the game strictly harder.

## NEXT RECOMMENDED TASK
A lives/game-over system remains the other standing recommendation
(flagged since DXB-04) — there is still no losing condition. If another
balance pass is wanted first, live playtesting (ideally outside this
session's problematic automated-browser environment, or via a manual
human playtest) would let paddle/ball speed and the new narrower
paddle/smaller bricks actually be felt and tuned together, rather than
adjusted in isolation as this task did.
