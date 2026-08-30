# DXB-11 Advanced Brick System

## TASK
Increase DX-Ball gameplay variety through advanced brick types: a reusable
type system, plus normal (1 hit), cracked (2 hits with a visible damaged
state), metal (indestructible obstacle that still bounces the ball), and
bonus (guaranteed powerup drop) bricks, integrated into the existing
3-level sequence and scoring/powerup/audio pipelines.

## STATUS
Completed. `npm run typecheck` and `npm run build` both pass (see
Requirements Verification). Live browser playtesting was skipped per
this session's explicit "manual verification policy" instruction.

## SCOPE
Confirmed by the task itself, with no remaining open product decisions:

1. **Four types, data-driven rather than subclassed** — `normal`,
   `cracked`, `metal`, `bonus`, each a `BrickTypeSpec` record (hit count,
   score, drop policy, fill/stroke). Adding a future type is one more
   spec entry plus a layout character.
2. **Existing collision loop is reused** — `BrickGrid.resolveBallCollision()`
   still does axis-of-least-overlap against every remaining brick, one
   brick per call. `Brick.takeHit()` answers whether that bounce also
   destroys the brick.
3. **Level 1 stays all-normal** (empty `LEVELS[0]` overrides, so it is
   unchanged from DXB-06A/DXB-08 defaults). Level 2 introduces cracked
   bricks into the existing 6×8 ramp. Level 3 mixes cracked, metal, and
   bonus into the existing 7×9 ramp. Spacing / points / ball speed are
   unchanged from DXB-08.
4. **Scoring** — normal uses existing row-weighted points; cracked awards
   those points only on the destroying hit; metal awards nothing; bonus
   awards points plus a guaranteed powerup. Random drops for normal (and
   cracked, on destruction) still roll `powerupDropChance`.
5. **Explicitly out of scope** (this task's own Restrictions): Fire Ball,
   Multi Ball, new powerup types, visual asset redesign, themes, market,
   leaderboard.

## FILES CREATED
- `src/entities/dx-ball/BrickType.ts` — the reusable type vocabulary:
  `BrickType` union, `BRICK_TYPE_SPECS` table, compact layout parser
  (`N`/`C`/`M`/`B`/`.`). Kept out of `BrickGrid` the same way `levels.ts`
  keeps level data out of the grid (DXB-08's own precedent).
- `docs/progress/DXB-11.md` — this file.

## FILES MODIFIED
- `src/entities/dx-ball/Brick.ts` — carries `brickType`, remaining hit
  points, and type-driven appearance. `takeHit()` decrements hits and
  refreshes visuals; metal never dies. Cracked healthy uses a white
  outline; cracked damaged darkens the row fill and switches to a gold
  stroke. Metal is gray; bonus is purple with a gold stroke. No sprites.
- `src/entities/dx-ball/BrickGrid.ts` — optional `layout` on
  `BrickGridConfig` (when present, `rows`/`columns` are derived from it).
  `resolveBallCollision()` still uses the same overlap math but now asks
  `takeHit()` before removing; a surviving brick stays in the list.
  Score and `'brick-break'` still fire only on actual destruction.
  Drop policy is per-type (`always` / `chance` / `never`). `isCleared()`
  now means "no destructible bricks remain" so leftover metal cannot
  lock a level. Return value gained a separation vector so a surviving
  brick cannot be re-hit on the next DXB-05 motion substep.
- `src/entities/dx-ball/Ball.ts` — `resolveBrickCollisions()` still only
  reflects velocity on the reported axis; it now also applies the grid's
  separation. The ball still does not know brick types exist.
- `src/entities/dx-ball/levels.ts` — level 2/3 `layout` strings. Level 1
  remains `{}` (all normal). DXB-08's gap/points/speed ramps are
  unchanged.
- `docs/CURRENT_STATE.md` — see below.

## ARCHITECTURAL DECISIONS
- **Types are data, not subclasses.** `BRICK_TYPE_SPECS` is a
  `Record<BrickType, BrickTypeSpec>`. `Brick`/`BrickGrid` read the spec
  instead of switching on type names, so a fifth type later does not
  require a new class or a new collision path.
- **`Brick` owns hit-points and appearance; `BrickGrid` still owns
  bounce, score, drops, and removal.** Same split DXB-03 established
  (brick is a thin cell; the grid is the owner) and DXB-09 reinforced
  (the grid only queues a spawn point, never knows what a powerup is).
  `takeHit()` returning a boolean is the one new question the existing
  overlap loop needed to ask.
- **Metal is an obstacle, not a clear-blocker.** `isCleared()` is
  `this.bricks.every((b) => b.isIndestructible)` rather than
  `length === 0`. An all-metal leftover field is a cleared level; an
  all-metal authored level would clear instantly and is not used.
- **Surviving bricks need a separation vector.** Before this task every
  hit destroyed the brick, so the next substep could not re-overlap it.
  Metal and a cracked brick's first hit stay in place — without pushing
  the ball out of overlap, DXB-05's substeps would hit the same brick
  twice in one frame (cracked would die in one frame; metal would
  oscillate). The collision math is unchanged; the return value just
  also reports how far to separate, and `Ball` applies it the same way
  wall collision already snaps the ball back inside the viewport.
- **Layouts are compact row-strings in `levels.ts`, parsed in
  `BrickType.ts`.** `BrickGridConfig.layout` stays plain data. Omitting
  it yields a uniform normal field — the pre-DXB-11 default — so level 1
  and any future config that does not opt in stay pixel-compatible.
- **No new audio cues.** `'brick-break'` still plays only when a brick
  is actually removed. A cracked first hit and a metal bounce are silent,
  matching walls (which also bounce without a dedicated cue). Adding a
  crack/metal cue would have been a new SFX type, out of this task's
  "preserve audio system" / no-new-systems intent.
- **Cracked bricks roll the same random drop as normal, but only on
  destruction.** The requirement called out preserving random drops for
  normal bricks and guaranteeing a drop for bonus; cracked-on-destroy
  using `'chance'` treats them as tougher normals rather than introducing
  a third drop rule.
- **Visual distinction uses the existing plain-rectangle convention**
  (fill + stroke), not sprites, matching every other entity and this
  task's "no visual asset redesign" restriction.

## REQUIREMENTS VERIFICATION
`npm run typecheck` and `npm run build` both pass with no errors.

Verified by construction / code review (manual verification policy —
no live browser playtesting this session):

- **Normal bricks work** — `hitsToDestroy: 1`, `'chance'` drop, existing
  row-weighted `points`, destroyed on first `takeHit()`. Level 1 is a
  uniform normal field (no `layout`).
- **Cracked bricks require 2 hits** — `hitsToDestroy: 2`; first
  `takeHit()` leaves the brick in the list, darkens fill, does not
  score or drop; second destroys, awards points, rolls chance.
- **Metal bricks cannot be destroyed** — `hitsToDestroy: Infinity`,
  `takeHit()` always returns `false`, never scored, never dropped.
- **Metal bricks still bounce the ball** — overlap still returns an
  axis (and a separation); `Ball` still reflects velocity. Metal stays
  in `this.bricks`.
- **Bonus bricks always drop a powerup** — `powerupDrop: 'always'`
  queues a spawn on destroy regardless of `powerupDropChance`. Type is
  still picked by `PowerupManager.spawn()`.
- **Existing levels still work** — still 3 `LEVELS` entries; level 1 is
  empty overrides; `MainScene` level-advance / score-carry / lives-carry
  / last-level-win paths are untouched.
- **Existing powerups still work** — `PowerupManager` / `MainScene`
  effect dispatch unchanged; only the spawn-*whether* decision gained a
  per-type policy in `BrickGrid`.
- **Existing audio still works** — `'brick-break'` still fires at the
  same destruction site; no call sites removed; no new keys added.
- **Typecheck passes** / **Build passes**: `npm run typecheck` and
  `npm run build` both pass with no errors.

## KNOWN RISKS
- **None of the new layouts or type visuals were live-playtested** —
  cracked/metal/bonus placement, stroke colors, and the cracked darken
  factor are reasoned starting values verified only by typecheck/build/
  code review, a continuation of the same "placeholder, not playtested"
  risk flagged since DXB-06A.
- **No dedicated SFX for a cracked first hit or a metal bounce** —
  deliberate (see Architectural Decisions). A first crack can feel
  silent compared to a break; a future audio pass could reuse
  `'brick-break'` or add a quieter cue without an architecture change.
- **Metal bricks in a layout that fully walls off bricks above them
  could make those bricks unreachable.** Level 3's metal cells are
  placed with bounce gaps (not a solid metal row); that placement is
  unplaytested.
- **`isCleared()` treating leftover metal as cleared** is the intended
  rule, but an accidentally all-metal `layout` would clear the instant
  the level loads. Not used in the current 3 levels.
- **Separation-on-hit slightly changes ball position after every brick
  contact, including destroyed ones.** For 1-hit bricks this is a small
  extra push out of a cell that is already gone; it should be harmless
  and is what prevents double-hits on survivors. Untested against
  grazing corner contacts.

## NEXT RECOMMENDED TASK
- **A live-playtested balance pass** covering the new type mix (how many
  cracked/metal/bonus per level, metal placement) together with
  everything already flagged as untuned since DXB-06A/07/08/09/10
  (paddle/ball speed, lives, drop chance, synthesized cue mix).
- **Visual/audio polish** — a crack-hit cue, a "+N" popup, a HUD
  indicator for an active timed effect. Repeatedly deferred since
  DXB-05.
- **Background music**, explicitly deferred by DXB-10.
- **A pause/main menu** (`ui/` still has no menu component).
- Additional powerup types deferred at DXB-09 (Multi-Ball, Shrink
  Paddle, Sticky Paddle) — still out of scope here.
