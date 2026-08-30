# DXB-12 Advanced Powerups

## TASK
Expand DX-Ball gameplay variety through advanced positive and negative
powerups: Fire Ball, Multi Ball, Small Paddle, and Fast Ball, spawned
through the existing drop system, with a HUD listing every active
effect and its remaining duration.

## STATUS
Completed. `npm run typecheck` and `npm run build` both pass (see
Requirements Verification).

## SCOPE
Confirmed by the task itself, with no remaining open product decisions:

1. **Four new types, same drop/catch pipeline** — Fire Ball (10s,
   pierce + can destroy metal), Multi Ball (3 balls total), Small
   Paddle (15s, narrower paddle), Fast Ball (10s, faster ball). They
   join the existing Widen / Slow / Extra Life pool; `BrickGrid` still
   only queues a spawn point, `PowerupManager.spawn()` still picks a
   type at random.
2. **Timed effects stay on the entity they affect** — the DXB-09
   pattern. Fire / Fast live on `Ball`; Small lives on `Paddle`; Multi
   Ball is a scene-owned extra-ball list because `Ball` is already
   replaced (not mutated) on every level transition.
3. **Existing gameplay is preserved** — score, lives, levels, audio,
   and the original three powerups keep their call sites and values
   (widen/slow still last 8s). Widen vs. Small and Slow vs. Fast are
   mutually exclusive so opposing multipliers never stack.
4. **HUD integration is a new `ui/` widget, not a visual redesign** —
   `ActiveEffectsLabel` lists active effects between the existing
   corner `ScoreLabel`s. Themes, market, and leaderboard stay out of
   scope.

## FILES CREATED
- `src/ui/ActiveEffectsLabel.ts` — reusable top-center HUD listing
  `{ label, remainingMs? }` (or a count suffix for untimed effects).
  Hidden when empty. Not DX-Ball-specific.
- `docs/progress/DXB-12.md` — this file.

## FILES MODIFIED
- `src/entities/dx-ball/Powerup.ts` — `PowerupType` union and the
  one-letter visual map gain `F` fire, `M` multi, `N` small/narrow,
  `T` turbo/fast.
- `src/entities/dx-ball/PowerupManager.ts` — default `types` pool
  includes the four new effects. Spawn / catch / audio unchanged.
- `src/entities/dx-ball/Paddle.ts` — `applyShrinkEffect()` (0.65×
  width, 15s from the scene). Mutually exclusive with
  `applyWidenBoost()`. Getters expose remaining ms for the HUD.
- `src/entities/dx-ball/Ball.ts` — `applyFireEffect()` (pierce flag +
  orange tint), `applyFastEffect()` (1.45×, mutually exclusive with
  slow), extra-ball miss behavior (`becomeExtra()` /
  `setMissBehavior()` / `isSpent()`), and HUD getters. Brick collision
  now asks the grid `{ pierce: true }` while fire is active. `preDestroy`
  no longer destroys the shared SPACE key (multiple balls would disarm
  launch).
- `src/entities/dx-ball/Brick.ts` — `takeHit({ fire: true })` destroys
  in one hit, including metal.
- `src/entities/dx-ball/BrickGrid.ts` — `resolveBallCollision()` accepts
  `{ pierce?: true }`. On a pierce destroy it returns `null` (no bounce)
  so the ball continues through the cell; score / `'brick-break'` /
  drops still run only on actual destruction.
- `src/scenes/MainScene.ts` — owns a `balls[]` instead of a single
  `ball`; `applyPowerupEffect()` dispatches the four new types; Multi
  Ball tops up to 3 extras that spend on miss; lives still decrement
  only when the last ball is gone; `ActiveEffectsLabel` is polled every
  frame.
- `src/ui/README.md` — documents `ActiveEffectsLabel`.
- `docs/CURRENT_STATE.md` — see below.

## ARCHITECTURAL DECISIONS
- **New types are more cases, not a new system.** `PowerupType`, the
  visual map, `PowerupManager`'s configured list, and
  `MainScene.applyPowerupEffect()` are the same three seams DXB-09
  named for this expansion. No effect-manager class was introduced.
- **`BrickGrid` still does not know what a powerup is.** Fire Ball is
  a `{ pierce: true }` option on the existing overlap loop. The ball
  still does not know brick types — it only knows it is currently
  piercing. Metal dying is `Brick.takeHit({ fire: true })`, not a new
  type or a new collision path.
- **Opposing timed effects overwrite, they do not stack.** Widen
  cancels Small (and vice versa); Slow cancels Fast (and vice versa).
  Catching a second capsule of the *same* effect still only refreshes
  the timer — DXB-09's own stacking rule, extended to the new pair.
- **Multi Ball is owned by `MainScene`, not `PowerupManager`.**
  DXB-09 kept `PowerupManager` free of any `Ball` reference because
  `Ball` is replaced on every level transition. Extra balls follow
  that same ownership: the scene creates them, copies remaining timed
  effects from the source ball, destroys them on level advance, and
  treats a `'spend'` miss as "remove this extra" rather than "lose a
  life". The last remaining ball is flipped back to `'reserve'` so
  the existing `getMissCount()` lives poll keeps working. If every
  ball spends in one frame, that is one life and a fresh serve.
- **The SPACE key is scene-shared and must not be destroyed by an
  extra ball.** Phaser returns the same `Key` from every
  `addKey(SPACE)`. `Ball.preDestroy()` used to destroy it; with
  Multi Ball that would disarm launch on the remaining serve ball.
  Scene shutdown still tears keys down.
- **HUD is a generic `ui/` widget.** All four corners were already
  taken by Score / Best / Lives / Level. `ActiveEffectsLabel` sits
  top-center on one line so it does not overlap the brick field and
  does not redesign those existing labels. Extra Life is instant and
  is not listed; Multi Ball shows `MULTI xN` while more than one ball
  is live.

## REQUIREMENTS VERIFICATION
`npm run typecheck` and `npm run build` both pass with no errors.

Verified by construction / code review:

- **Fire Ball works** — 10s; `applyFireEffect()` sets the pierce flag;
  `resolveBallCollision({ pierce: true })` force-destroys the overlapped
  brick (including metal) and returns `null` so the ball does not bounce.
- **Multi Ball works** — `spawnMultiBall()` tops the live list up to 3;
  extras launch at ±20° (or from the paddle if the source is still
  attached); extras inherit fire/slow/fast; existing score / lives /
  levels / audio keep working (lives only decrement on the last ball).
- **Small Paddle works** — 15s; `applyShrinkEffect()` applies 0.65×
  width and cancels an active widen.
- **Fast Ball works** — 10s; `applyFastEffect()` applies 1.45× speed
  and cancels an active slow.
- **Existing powerups still work** — Widen / Slow / Extra Life stay in
  the spawn pool and the same `applyPowerupEffect()` cases, with the
  original 8s duration.
- **Existing levels still work** — `LEVELS` and `loadLevel()` are
  untouched; extras and falling capsules are cleared on advance, same
  as DXB-09.
- **Existing audio still works** — no cue call sites removed; pierce
  destroys still play `'brick-break'`; spawn/collect still fire from
  `PowerupManager`.
- **Typecheck passes** / **Build passes**: `npm run typecheck` and
  `npm run build` both pass with no errors.

## KNOWN RISKS
- **None of the new multipliers or durations were live-playtested** —
  Small `0.65`, Fast `1.45`, Fire 10s, Small 15s, Fast 10s, and a
  uniform 7-type spawn pool are reasoned starting values, the same
  "placeholder, not playtested" risk flagged since DXB-06A.
- **A uniform random draw over 7 types makes each individual effect
  rarer than before** (1/7 vs 1/3). Positives still outnumber
  negatives (5 vs 2). A future balance pass may want weights or a
  polarity coin-flip.
- **Fire Ball destroying a whole row in one pass can feel bursty** —
  one brick per DXB-05 substep is the intended pierce rule, but a
  high-speed fire ball can clear several bricks in a single frame.
- **Multi Ball extras each also bind SPACE** (Phaser shares one Key).
  Launch is only checked while `attached`, and extras start launched,
  so this should be harmless. Documented in case a future extra can
  sit attached.
- **This environment's browser-automation tab remains unreliable for
  real-time, input-driven verification** (the same finding every
  closure since DXB-06A has documented). Behavior was verified by
  construction and typecheck/build.

## NEXT RECOMMENDED TASK
- **A live-playtested balance pass** covering the new 7-type mix
  (drop chance, durations, widen/small/slow/fast multipliers) together
  with everything already flagged as untuned since DXB-06A/07/08/09/10/11.
- **Visual/audio polish** — a catch flash, a crack-hit cue, a "+N"
  popup. The timed-effect HUD requested since DXB-09 is now in.
- **Background music**, explicitly deferred by DXB-10.
- **A pause/main menu** (`ui/` still has no menu component).
- Sticky Paddle, still deferred at DXB-09's own scoping.
