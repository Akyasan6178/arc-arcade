# DXB-09 Powerup System

## TASK
Implement a powerup system for DX-Ball: destroying a brick has a chance
to drop a falling capsule that the player must catch with the paddle to
activate an effect.

## STATUS
Completed

## SCOPE
"Powerup System" left several genuine open decisions (how powerups reach
the player, which effects ship, how they should look with no asset
pipeline) the same way DXB-04/05/06/07/08 confirmed scope before
implementing an ambiguously named task. Confirmed with the requester up
front:

1. **Falling capsule, must be caught** — destroying a brick has a chance
   to drop a capsule that falls straight down; the paddle must physically
   catch it (classic Arkanoid/DX-Ball style), not an instant effect on
   brick break.
2. **Three effects for v1**: Widen Paddle (timed), Slow Ball (timed),
   Extra Life (instant, +1 life). Multi-Ball, Shrink Paddle, and Sticky
   Paddle were considered but deferred, the same way DXB-08 deferred
   "endless/procedural levels" in favor of a small fixed set.
3. **Visuals** — a small colored rounded rectangle with a one-letter
   label per effect (no sprite/asset pipeline exists yet; `src/assets/`
   is still empty), consistent with every other entity's plain-Phaser-
   shape convention.

## FILES CREATED
- `src/entities/dx-ball/Powerup.ts` — a single falling capsule. A
  `Phaser.GameObjects.Container` holding a `Graphics` rounded-rect
  background and a `Text` letter label, one fixed color+letter pair per
  `PowerupType` (`widen-paddle` blue `W`, `slow-ball` green `S`,
  `extra-life` red `L`). Purely visual + straight-line downward motion,
  mirroring `Brick`: all "what happens when this is caught" logic lives
  in its owner, not here.
- `src/entities/dx-ball/PowerupManager.ts` — owns every currently-falling
  capsule for one run: `spawn(x, y)` picks a random configured type and
  creates one; `update(deltaMs)` advances each and checks it against the
  paddle (caught → queued) or the bottom edge (missed → just removed, no
  penalty); `consumeCaughtPowerups()` drains the caught queue;
  `resize()`/`clear()` mirror every other entity's viewport-resize and
  (new here) level-transition cleanup hooks.

## FILES MODIFIED
- `src/entities/dx-ball/BrickGrid.ts` — added `powerupDropChance` config
  (default `0.15`) and a `pendingPowerupSpawns` queue: whenever
  `resolveBallCollision()` removes a brick, it now also rolls that
  chance and, on a hit, queues the brick's position. `consumePendingPowerupSpawns()`
  drains that queue — the same "owning scene polls a getter/queue" shape
  `getScore()`/`isCleared()` already established.
- `src/entities/dx-ball/Paddle.ts` — added `applyWidenBoost(durationMs)`:
  a temporary `widthMultiplier` (`1.5`) the paddle applies to itself and
  counts down every `update()` frame, reverting automatically on expiry.
  `resize()` and the boost apply/expire paths now share one
  `applySize()` helper so there's exactly one place that turns "base
  size + multiplier" into an actual on-screen size.
- `src/entities/dx-ball/Ball.ts` — added `applySlowEffect(durationMs)`:
  a temporary `speedMultiplier` (`0.6`) folded into every place base
  speed becomes actual velocity (`launch()`, `resize()`, and a new
  `applySpeedMultiplier()` used when the effect is applied/expires mid-
  flight), ticked down every `update()` frame regardless of
  `attached`/`launched` state.
- `src/scenes/MainScene.ts` — owns a `powerupManager` for the whole run:
  a new `updatePowerups()` (called every frame, right after
  `ball.update()`) drains `brickGrid`'s pending spawns into
  `powerupManager.spawn()`, advances the manager, then drains its caught
  queue into `applyPowerupEffect()` — the one place that knows what each
  effect type actually does. `advanceToNextLevel()` calls
  `powerupManager.clear()` so a stray capsule can't carry into the next
  level's fresh brick layout; `handleViewportChange()` resizes it like
  every other entity.

## ARCHITECTURAL DECISIONS
- **`PowerupManager` never holds a `Ball` reference, and never touches
  lives/score directly.** A caught capsule's *type* is only ever queued
  for `MainScene` to react to (`consumeCaughtPowerups()`), the same
  "owning scene polls a getter/queue" pattern already established by
  `BrickGrid.getScore()`/`isCleared()` and `Ball.getMissCount()`. This
  matters specifically because `Ball` is replaced outright (not mutated)
  on every level transition (DXB-08) while the paddle and this manager
  both live for an entire run — holding a `Ball` reference here would go
  stale the instant a level advanced. `MainScene.applyPowerupEffect()` is
  the one place that dispatches by type: `extra-life` bumps `lives`
  directly; `widen-paddle`/`slow-ball` delegate to
  `paddle.applyWidenBoost()`/`ball.applySlowEffect()`.
- **`BrickGrid` decides *whether* a powerup drops; `PowerupManager`
  decides *which type*.** `BrickGrid` has no idea `PowerupType` exists —
  it only rolls a probability and queues a bare `{x, y}` spawn point.
  Picking a random effect from the configured list lives entirely in
  `PowerupManager.spawn()`. This keeps `BrickGrid` (a DX-Ball-specific
  but powerup-agnostic class) from needing to import anything from the
  powerup system, and keeps "which effects exist" configurable in one
  place.
- **Each timed effect is owned and ticked by the entity it affects, not
  by `PowerupManager` or a shared timer system.** `Paddle.applyWidenBoost()`
  and `Ball.applySlowEffect()` both follow the exact same shape: a
  multiplier field + a remaining-ms field, ticked down in that entity's
  own `update()`, reverting automatically on expiry. This is the same
  "entity owns its own state/behavior" pattern established since DXB-01
  (`Paddle` owns its own clamped movement, `Ball` owns its own serve
  state machine) — no new "effect/buff system" class was introduced for
  what is, so far, exactly two timed effects.
- **Catching a second capsule of an already-active timed effect extends
  the duration rather than stacking the multiplier.** Both
  `applyWidenBoost()`/`applySlowEffect()` only re-apply the
  multiplier/rescale the moment they transition from inactive
  (`remainingMs <= 0`) to active; if already active, they just reset the
  countdown to the full duration. This avoids a double-widened paddle or
  a ball slowed to `0.6 * 0.6` speed from two back-to-back catches.
- **A caught/missed capsule is removed immediately, with no distinct
  "expired" state.** `PowerupManager.update()` checks catch-then-bottom-
  edge in one pass and calls `removeCapsuleAt()` either way — mirroring
  how a missed ball just re-serves without any extra bookkeeping. An
  uncaught capsule costs the player nothing beyond not getting the
  effect.
- **A level transition clears every falling capsule.** `advanceToNextLevel()`
  calls `powerupManager.clear()` alongside its existing `ball` replacement
  and `brickGrid.loadLevel()` — a capsule mid-fall from the just-cleared
  level's bricks would otherwise land in front of the next level's
  different layout, which reads as a bug rather than a feature. A full
  `scene.restart()` needs no equivalent call: Phaser's own scene
  lifecycle already destroys every `Powerup` (added via
  `scene.add.existing()` in its own constructor) along with everything
  else, per the precedent DXB-04's closure documented for the win/
  restart flow.
- **Capsule visuals are a `Graphics` rounded-rect + `Text` label inside a
  `Container`, not a new base "labeled shape" class.** Every other
  entity is a single Phaser primitive subclassed directly (`Paddle`
  extends `Rectangle`, `Ball` extends `Arc`, `Brick` extends `Rectangle`)
  — `Powerup` is the first entity needing two visual layers (background +
  label), which a `Container` handles natively without introducing a new
  shared abstraction for what is currently a single use case.

## REQUIREMENTS VERIFICATION
`npm run typecheck` and `npm run build` both pass with no errors.

Manually verified in a running dev build (Chrome DevTools Protocol
automation), using a temporary debug hook exposing the `Phaser.Game`
instance on `window` (added, used, then fully reverted before this
change set was finalized — `git diff --stat src/main.ts` confirmed zero
diff, the same discipline every prior task's closure since DXB-06A has
documented):
- **Widen boost**: `paddle.applyWidenBoost(8000)` immediately grew
  `paddle.width` from `245.76` to `368.64` (exactly `× 1.5`); calling
  `paddle.update(4000)` then `paddle.update(4001)` (spanning the 8s
  duration) left the width unchanged at the midpoint and reverted it to
  exactly `245.76` the instant the duration elapsed.
- **Slow effect**: with the ball launched at its base speed `648`,
  `ball.applySlowEffect(8000)` immediately dropped `velocity.length()` to
  `388.8` (exactly `× 0.6`); the same `update(4000)` + `update(4001)`
  pair left it unchanged mid-effect and restored it to exactly `648` on
  expiry.
- **Drop chance → spawn queue**: forcing `brickGrid.config.powerupDropChance = 1`
  and destroying one real brick via `resolveBallCollision()` (at its
  actual grid position) correctly shrank the brick list by one and
  queued exactly one `{x, y}` spawn point via `consumePendingPowerupSpawns()`.
- **Catch → effect dispatch**: spawning a capsule via `powerupManager.spawn()`,
  relocating it directly onto the paddle's position, then calling
  `powerupManager.update()` correctly queued it as caught; passing that
  through `consumeCaughtPowerups()` into `scene.applyPowerupEffect()`
  incremented `lives` by exactly 1 (`2 → 3`, the paddle having organically
  taken a real miss earlier in the same session — confirming
  `updateLives()`'s real-time loop was still running correctly
  throughout, per DXB-07's own precedent for this environment).
- **Visual check**: freezing three capsules' fall speed at 0 and forcing
  one of each type (`widen-paddle`/`slow-ball`/`extra-life`) confirmed
  each renders as its own distinct colored rounded rectangle with the
  correct letter (`W` blue, `S` green, `L` red), screenshotted sitting on
  top of the brick grid.
- A genuinely live, real-time "destroy a brick, watch a capsule fall,
  physically catch it with the paddle via real input" playthrough was
  **not** completed — this environment's browser-automation tab is still
  unreliable for real-time, input-driven verification (the same finding
  every closure since DXB-06A has documented). The deterministic checks
  above exercise every piece of the pipeline individually and, in the
  catch → effect case, chained together end-to-end.

## KNOWN RISKS
- **None of the new tuning values were live-playtested**: `powerupDropChance`
  (`0.15`), `WIDEN_BOOST_MULTIPLIER` (`1.5`), `SLOW_EFFECT_MULTIPLIER`
  (`0.6`), `POWERUP_EFFECT_DURATION_MS` (`8000`), and `PowerupManager`'s
  own capsule size/fall-speed ratios are all reasoned, genre-typical
  starting values verified only by `typecheck`/`build`/deterministic
  state inspection — a continuation of the same "placeholder, not
  playtested" risk flagged in every prior task, now extended to the
  powerup system's own values.
- **This environment's browser-automation tab is still unreliable for
  real-time, input-driven verification** (the same finding every closure
  since DXB-06A has documented). Every powerup-specific check above
  drove state directly rather than through an actual played-out catch —
  the underlying `pointermove`-driven paddle movement and real
  `requestAnimationFrame` timing were exercised only incidentally (the
  scene's own background loop organically ticking lives/score during
  testing), not as a deliberate "move the paddle under a real falling
  capsule" scenario.
- **`powerupDropChance` (0.15) is not tuned against level difficulty.**
  All three levels (`levels.ts`) share the same drop chance — a level
  with more bricks (levels 2-3) will statistically drop more capsules
  per playthrough than level 1, purely as a side effect of having more
  bricks, not a deliberate per-level design choice. A future balance
  pass may want to tune this per level alongside everything DXB-06A/07/08
  already flagged as still untuned together.
- **No visual/audio feedback beyond the capsule and label itself** — no
  particle/flash on catch, no sound on drop/catch/expiry, and no on-
  screen indicator that a timed effect is currently active or how much
  longer it will last (a player has to infer "widen" wore off only by
  noticing the paddle shrink back). Raised as a possible future polish
  item, not selected here, the same way DXB-05/06/07/08 deferred
  audio/visual feedback polish each time.
- **Multi-Ball, Shrink Paddle, and Sticky Paddle were explicitly
  considered and deferred**, not overlooked — see this task's own Scope
  section. `PowerupManager.spawn()`'s random-pick-from-configured-list
  design and `PowerupType`'s string-union shape make adding any of them
  later a matter of one more case in `Powerup.ts`'s visual map and
  `MainScene.applyPowerupEffect()`'s switch, not an architecture change.
- **A caught capsule's effect always fully overwrites/refreshes, never
  stacks or queues** — e.g. catching "widen" twice in a row just resets
  the 8s timer rather than granting 16s or a bigger multiplier. This was
  a deliberate simplicity choice (see Architectural Decisions), not
  tested against alternative stacking rules.
- **The temporary `window.__debugGame` hook used for verification
  mirrors every prior task's own temporary debug hook** — same
  technique, same full revert before finalizing (confirmed via `git diff
  --stat src/main.ts` showing zero diff).

## NEXT RECOMMENDED TASK
- **A live-playtested balance pass** covering the powerup system's own
  new values (drop chance, effect duration, widen/slow multipliers)
  together with everything already flagged as untuned since DXB-06A/07/08
  (paddle width/speed, ball speed, starting lives, per-level difficulty)
  — the standing recommendation across nearly every task's closure so
  far, still blocked on this environment's recurring browser-automation
  playtesting limitations.
- **Visual/audio feedback polish** — a catch flash/sound, a HUD indicator
  for an active timed effect's remaining duration, a drop/fall sound.
  Repeatedly raised and repeatedly deferred since DXB-05.
- **A sound/audio system** (`systems/` still lists it as an unbuilt
  example) or a pause/main menu (`ui/` still has no menu component).
- Additional powerup types deferred at this task's own scoping
  (Multi-Ball, Shrink Paddle, Sticky Paddle) if a future task wants to
  expand the effect roster.
