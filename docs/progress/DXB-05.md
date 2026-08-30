# DXB-05 Gameplay Polish

## STATUS
Completed

## SCOPE
"Gameplay Polish" was ambiguous enough on its own (the project's own
`CURRENT_STATE.md` had actually recommended a *different* next task,
"Score System") that scope was confirmed with the requester first, the
same way DXB-04 confirmed scope for "Gameplay Loop". Two concrete,
already-documented "Known Risks" (see DXB-03/DXB-04) were chosen:

1. Variable paddle bounce angle — every paddle hit previously left at a
   fixed angle (whatever it arrived at, just mirrored), regardless of
   where on the paddle it landed.
2. Ball tunneling through the paddle/a brick at high speed — a
   single-step-per-frame position integration could move the ball clean
   through a thin solid without its end-of-frame position ever
   overlapping it, so the collision would simply never register.

Explicitly out of scope for this pass: progressive difficulty/speed
ramping and visual hit feedback (tweens/flashes) — both raised as
candidate polish items but not selected.

## FILES MODIFIED

- `src/entities/dx-ball/Paddle.ts` — added `computeHitOffset(x)`, a pure
  geometry query returning where `x` sits relative to the paddle's
  center, normalized to `-1` (left edge) .. `1` (right edge) and clamped.
- `src/entities/dx-ball/Ball.ts`
  - `resolvePaddleCollision()`: a `'vertical'`-axis paddle hit now calls
    the new `computePaddleBounceVelocity()` instead of a plain
    `velocity.y = -velocity.y` flip — see Architectural Decisions.
  - `update()` / `stepLaunched()` / `advanceLaunched()` /
    `computeSafeStepMs()`: the launched-ball motion previously run once
    per frame is now split into one or more capped-distance substeps —
    see Architectural Decisions.
- `src/entities/dx-ball/BrickGrid.ts` — updated a stale doc comment on
  `resolveBallCollision()` that asserted "a ball can never destroy more
  than one brick in a single frame"; with substeps that's no longer true
  (by design — see below), so the comment was corrected rather than left
  inaccurate.

## ARCHITECTURAL DECISIONS

- **Paddle bounce angle is computed from a normalized hit offset, not a
  lookup table or curve.** `Paddle.computeHitOffset()` reports pure
  geometry (`-1`..`1`, same style as `checkBallCollision()` — the paddle
  never touches velocity itself). `Ball.computePaddleBounceVelocity()`
  scales that offset by a fixed `MAX_PADDLE_BOUNCE_ANGLE_DEG` (60°) to
  get an angle-from-straight-up, then rebuilds a velocity vector at the
  ball's *current* speed (`velocity.length()`, preserved, not reset to a
  base config speed) pointed at that angle. A center hit stays at 0°
  (straight up); edge hits deviate up to 60° toward that edge. Only the
  `'vertical'`-axis case (top/bottom face — in practice always the top)
  is changed; a `'horizontal'` (side-edge) hit still just flips
  `velocity.x`, since there's no meaningful "hit position" to vary on
  that axis.
- **Tunneling is fixed with fixed-distance substeps, not swept/continuous
  collision detection.** Introducing true swept-AABB-vs-circle math would
  have meant a second, different collision model living alongside the
  existing overlap-based one already shared by walls, the paddle, and
  bricks — a much bigger, more speculative change for a project that
  deliberately has "no physics engine or shared collision system" (per
  DXB-03's own note). Instead, `advanceLaunched()` divides a frame's
  `deltaMs` into substeps sized so the ball moves at most
  `MAX_STEP_DISTANCE_RATIO` (0.5) times its own radius per substep,
  calling the *exact same* per-frame body (renamed `stepLaunched()`,
  otherwise unchanged) once per substep. Every intermediate position
  along the frame's motion now gets its own overlap check, closing the
  skip-through gap without introducing new collision math anywhere.
- **A hit brick can now be destroyed more than once per frame — one per
  substep — and that's correct, not a new bug.** `BrickGrid`'s "one brick
  removed per call" invariant is unchanged (still exactly one per call to
  `resolveBallCollision()`); only the old, stronger claim that a whole
  *frame* could never destroy more than one brick no longer holds, since
  a frame can now contain several substeps. This is exactly what
  substeps are for, so the stale comment was corrected rather than
  "preserved" at the cost of accuracy.
- **Substeps are bounded by the ball's own radius, not by paddle/brick
  thickness config.** `Ball` already doesn't know about `Paddle`'s or
  `BrickGrid`'s internal size ratios (it only ever asks them "am I
  overlapping you"), and this task didn't want to add that coupling. The
  ball's own radius (0.014 of the smaller viewport dimension) is smaller
  than every current paddle/brick thickness ratio (0.025–0.035), so
  capping substep travel to `0.5 * radius` leaves a multi-times safety
  margin against those current values without `Ball` needing to know
  them directly. A `MAX_SUBSTEPS_PER_FRAME` (8) defensive cap also exists
  purely to bound worst-case work on an extreme delta spike (e.g. a
  backgrounded tab regaining focus) — see Known Risks.

## KNOWN RISKS

- **Position is still never corrected out of an overlap.** This task
  fixed the ball *missing* a collision entirely (tunneling); it did not
  add pushing the ball back out to the exact surface it hit once a
  collision *is* detected (an already-documented, separate risk from
  DXB-04). In practice this is now substep-bounded to at most
  `0.5 * radius` of penetration depth per detected hit (down from a full
  frame's travel distance before this task), but it is not eliminated.
- **`MAX_SUBSTEPS_PER_FRAME` (8) is a defensive cap, not a guarantee.** On
  an extreme single-frame delta spike (well beyond a dropped frame or
  two — e.g. a tab backgrounded for seconds then regaining focus), a fast
  ball could still tunnel within that one frame once the cap is hit. This
  trades a vanishingly rare edge case for a bounded, predictable amount
  of per-frame collision work in the overwhelmingly common case.
- **`MAX_PADDLE_BOUNCE_ANGLE_DEG` (60°) and `MAX_STEP_DISTANCE_RATIO`
  (0.5) are placeholder tuning values, not playtested** — consistent with
  every other ratio/config value called out as a known risk in
  DXB-01–DXB-04.
- Progressive difficulty and visual hit feedback (tweens/flashes),
  discussed as candidate polish items during scoping, remain
  unimplemented — deliberately deferred, not an oversight.
- Not yet re-verified against a full `npm run typecheck` / `npm run
  build` pass — the local shell/terminal tool was unresponsive for the
  remainder of this session after implementation. `ReadLints` reported no
  errors on the three modified files, and the changes were manually
  reviewed for type correctness, but an actual compiler/build run is
  still outstanding before this can be called fully verified.

## NEXT RECOMMENDED TASK

DXB-06 Score System — this was already `CURRENT_STATE.md`'s prior
recommendation (as "DXB-05 Score System") before this task took its slot
under a different name; it remains the natural next step. A lives/
game-over system (there is still no losing condition — a missed ball
simply re-serves indefinitely) is the other obvious candidate and was
raised but not chosen during this task's own scoping.
