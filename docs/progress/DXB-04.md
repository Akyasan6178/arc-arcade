# DXB-04 Gameplay Loop

## STATUS
Completed

## FILES CREATED

None — this task only extended existing entities/scenes.

## FILES MODIFIED

- `src/entities/dx-ball/Paddle.ts` — added `checkBallCollision(ballX, ballY, ballRadius)`, which checks a ball's circle against the paddle's rectangle and returns the axis to bounce along (or `null`), mirroring `BrickGrid.resolveBallCollision()`'s axis-of-least-overlap approach. The paddle only reports the overlap; it never mutates anything (unlike a brick, it's never removed).
- `src/entities/dx-ball/Ball.ts` — added `resolvePaddleCollision()`, called every `launched`-state frame (right before the existing `resolveBrickCollisions()` call) so the ball now bounces off the paddle instead of passing through it. Reflects velocity on whichever axis `Paddle.checkBallCollision()` reports, identical in style to the existing brick-bounce logic.
- `src/entities/dx-ball/BrickGrid.ts` — added `isCleared(): boolean`, a trivial query (`this.bricks.length === 0`) for whether every brick has been removed. The grid itself still has no opinion on what happens when it's cleared — that's the scene's responsibility.
- `src/scenes/MainScene.ts` — `update()` now polls `brickGrid.isCleared()` after the paddle/ball update each frame. On clear, `handleWin()` freezes the loop (an early-return guard on a new `won` flag stops `paddle.update()`/`ball.update()` from running), shows a centered, responsive "YOU WIN / Press Space to play again" `Phaser.GameObjects.Text`, and arms a one-shot `keydown-SPACE` listener that calls `this.scene.restart()`.

## ARCHITECTURAL DECISIONS

- **Paddle/ball collision reuses the brick-collision shape.** `Paddle.checkBallCollision()` is a straight port of `BrickGrid.resolveBallCollision()`'s circle-vs-rectangle, axis-of-least-overlap math, just without the removal step (the paddle is permanent, a brick isn't). This keeps collision logic consistent across every solid the ball can hit, rather than introducing a second, different collision style.
- **Win detection is a simple poll, not an event.** `MainScene.update()` checks `brickGrid.isCleared()` once per frame after gameplay updates, rather than having `BrickGrid` emit a "cleared" event. Given there's exactly one consumer and one grid, an event bus would be speculative infrastructure for a single boolean check.
- **Restart leans entirely on Phaser's own scene lifecycle.** `this.scene.restart()` triggers Phaser's standard shutdown-then-create cycle, which tears down every game object this scene owns (paddle, ball, all bricks, the win text) as part of its normal display-list cleanup — including running each entity's own `preDestroy()` (e.g. `Paddle`/`Ball` unhooking their input listeners). No manual "reset the game" method was written anywhere; `create()` already builds a fresh game from scratch, which is exactly what a restart needs.
- **The win message is a plain `Phaser.GameObjects.Text`, not a HUD system.** `ui/` has no HUD/menu system built yet (per the project's own architecture notes), and building one was explicitly out of scope for this task. A single ad hoc text object was judged the minimal way to make the win/restart flow perceivable and usable, as opposed to leaving it a silent freeze.
- **Scope was deliberately narrowed before implementation.** "Gameplay Loop" was ambiguous enough (could have implied lives, game-over, scoring, restart-after-loss) that scope was confirmed with the requester first: in scope for DXB-04 are paddle/ball collision, win-on-clear, and restart; lives/game-over were explicitly excluded and deferred.

## KNOWN RISKS

- `checkBallCollision()` (paddle) and `resolveBallCollision()` (brick) both only reflect velocity on overlap — they never correct the ball's position out of the shape it hit. At high enough speed relative to the paddle's thin height (`heightRatio: 0.025`), the ball could theoretically tunnel through in a single frame without ever registering an overlap. This mirrors an already-accepted, already-documented risk in the existing wall/brick collision code, not a new one.
- There is no lives or game-over concept: a ball missed past the bottom edge simply re-serves indefinitely, as it did before this task. This was an explicit, confirmed scope decision, not an oversight — but it means the "loop" only ever ends in a win, never a loss.
- The win text's font size is recomputed on resize, but its `fontFamily`/`color`/layout are fixed inline values, not sourced from any shared style/theme — acceptable for a single ad hoc message, but not a pattern to copy if more UI text is added later.
- Not playtested for edge cases such as a ball grazing the paddle at a shallow angle, or hitting the paddle and a brick in the same frame (brick collision is still checked immediately after paddle collision every frame, unchanged from DXB-03's own ordering assumptions).

## NEXT RECOMMENDED TASK

DXB-05 Score System
