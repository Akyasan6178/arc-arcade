# DXB-02 Ball Core

## TASK
Implement the core DX-Ball ball entity: visual representation, responsive sizing/positioning, a paddle-attached serve state, a one-shot Space-triggered launch, in-bounds bounce movement, and a miss/reset cycle when the ball exits the bottom boundary.

## STATUS
Completed

## COMMIT
(pending)

## FILES CREATED
- `src/entities/dx-ball/Ball.ts`

## FILES MODIFIED
- `src/scenes/MainScene.ts` — instantiates the ball alongside the existing paddle (passing the paddle instance in so the ball can attach to it), and drives its per-frame `update(delta)` and viewport-driven `resize(width, height)` the same way the paddle is driven. The paddle is updated before the ball each frame so the ball's paddle-tracking uses that frame's latest paddle position.

## ARCHITECTURAL DECISIONS
- `Ball` extends `Phaser.GameObjects.Arc` (a filled circle) and is a self-contained entity, mirroring `Paddle`'s pattern: no separate physics/input/collision system introduced, no shared base class extracted (would be speculative given only two entities exist).
- Serve state machine (`'attached' | 'launched'`):
  - `attached` (initial state): the ball has zero velocity and repositions every frame to sit centered above the paddle, touching its top edge (`computeAttachedPosition`), so it visually rides along with paddle movement without moving on its own.
  - Pressing Space (checked via `Phaser.Input.Keyboard.JustDown`) while `attached` calls `launch()`, which applies a fixed, deterministic launch velocity (-60°: up and to the right) and transitions to `launched`. The Space check only runs in the `attached` branch of `update()`, so it is structurally impossible for a second press to re-launch or alter velocity while `launched` — this is what makes the launch exactly-once per serve.
  - `launched`: position integrates from velocity every frame; `resolveWallCollisions()` bounces (reflects) the ball off the left, right, and top viewport edges only.
  - A bottom exit (`this.y - radius > viewportHeight`, i.e. the ball has fully left the screen underneath) calls `returnToPaddle()`, which zeroes velocity, switches state back to `attached`, and re-homes the ball above the paddle — re-arming the Space listener for the next serve.
- Responsive sizing/speed: `radius` and `speed` are both ratios of `Math.min(viewportWidth, viewportHeight)` (rather than width alone, as `Paddle` uses) so the ball's relative scale and pace stay consistent in both portrait and landscape.
- `resize()` preserves state: while `attached` it just re-homes above the paddle at the new size; while `launched` it rescales radius and current speed (preserving direction) and clamps position into the new bounds — analogous to `Paddle.resize()`.
- Deliberately excluded from this task (per explicit instruction): brick collisions, score, lives, audio, UI, leaderboard. Paddle/ball collision is also not implemented — the ball currently passes through the paddle visually while `launched`, since the only paddle-related requirement was attaching to it before/between serves, not bouncing off it.

## REQUIREMENTS VERIFICATION
1. **Ball starts attached above the paddle** — constructor computes its initial position via `Ball.computeAttachedPosition(paddle, radius)` (`src/entities/dx-ball/Ball.ts`), placing it centered on `paddle.x`, touching the paddle's top edge.
2. **Ball does not move until Space is pressed** — initial `state = 'attached'` with `velocity = (0, 0)`; the `attached` branch of `update()` only repositions the ball to track the paddle, it never integrates velocity.
3. **Space launches the ball exactly once** — the Space key is only polled inside the `attached` branch of `update()`; `launch()` sets velocity and flips `state` to `'launched'`, after which that branch (and the key check) is skipped entirely until a miss resets state back to `attached`.
4. **Exiting the bottom boundary stops movement, returns the ball above the paddle, and re-arms Space** — `resolveWallCollisions()` detects `this.y - radius > this.viewportHeight` and calls `returnToPaddle()`, which zeroes velocity, sets `state = 'attached'`, and repositions above the paddle; the next Space press then launches again via the same path as the initial serve.

## BUILD FIX
- Initial implementation named the serve-state field `state`, which collides with `Phaser.GameObjects.GameObject#state` (a public `number | string` property Phaser reserves on every game object). TypeScript rejected `Ball` as an invalid subclass of `Arc` because the narrower private `state: BallState` field was incompatible with that inherited public property. Renamed the field (and every reference to it) to `serveState` — a pure rename, no behavior, ordering, or architecture changes.

## KNOWN RISKS
- `radiusRatio`, `speedRatio`, and `LAUNCH_ANGLE_DEG` in `Ball.ts` are placeholder tuning values, not playtested.
- No paddle/brick collision exists yet, so the ball passes through the paddle visually once launched (only explicitly out of scope: brick collisions — paddle collision simply wasn't requested for this task).

## NEXT RECOMMENDED TASK
DXB-03 Paddle/Ball Collision
