# DXB-21 Balance Pass

## TASK
Adjust DX-Ball gameplay balance from live playtest feedback. Tuning
only — no new systems, content, themes, achievements, powerups, brick
types, levels, or modes.

## STATUS
Completed. `npm run typecheck` and `npm run build` both pass (see
Requirements Verification).

## ORIGINAL PLAYTEST FINDINGS

1. **Fire Ball feels too strong.** A 10-second pierce that one-shots
   metal can dominate a level, especially metal corridors.
2. **Multi Ball balls spread too aggressively.** ±20° extras fan out
   across the playfield, which is hard to track and feels chaotic.
3. **Time Attack ball speed feels too low for a 90-second mode.** The
   clock is fine; there are not enough scoring chances per second.
4. **Endless becomes excessively fast around level 4.** The +0.4%/s
   ramp hit its 2× cap at ~250s (~4 minutes), stacking on level 4's
   already-higher `speedRatio` (0.82) into a difficulty wall.

## SCOPE
Confirmed by the task itself. Four existing knobs, four existing
systems:

1. **Fire Ball** — shorter duration. Metal still dies in one fire hit
   (the smaller change vs rewriting `takeHit()`).
2. **Multi Ball** — keep the powerup and the 3-ball cap; extras
   diverge less.
3. **Time Attack** — slightly higher default ball speed. Timer stays
   90 seconds.
4. **Endless** — slower speed ramp. Cap stays 2×. Reach level 10
   comfortably and level 20 through skill; no level-4 wall.

Classic keeps its existing loop, levels, and base ball speed.

## FINAL TUNING VALUES

| Knob | Before (DXB-12 / DXB-14 / DXB-20) | After (DXB-21) |
| --- | --- | --- |
| Fire Ball duration | 10s | **7s** |
| Fire Ball metal | One-hit destroy | Unchanged (one-hit destroy) |
| Multi Ball cap | 3 | Unchanged |
| Multi Ball split | ±20° | **±10°** |
| Time Attack timer | 90s | Unchanged |
| Time Attack speed fold | 1.0 (same as Classic) | **1.15×** |
| Endless ramp | +0.4%/s | **+0.15%/s** |
| Endless cap | 2× (~250s) | **2× (~667s)** |
| Drop chance / spawn pool | 0.15, uniform 7 types | Unchanged |
| Widen / Slow / Fast / Small | 8s / 8s / 10s / 15s | Unchanged |

### Endless ramp at typical pace (~45–60s per level)

| Level | ~Elapsed | Old multiplier | New multiplier |
| --- | --- | --- | --- |
| 4 | ~3 min | ~1.72× (near cap) | ~1.27× |
| 10 | ~8 min | 2.00× (capped since ~4 min) | ~1.72× |
| 20 | ~16 min | 2.00× | 2.00× (just at / past cap) |

## RATIONALE

- **Fire Ball: duration, not metal rules.** Playtest called the effect
  too strong, not "metal should survive fire." Cutting 10s → 7s is a
  single config change: still long enough to punch a metal corridor,
  no longer a near-full-level carry. Changing `takeHit({ fire: true })`
  would be a new interaction, which this task disallows.
- **Multi Ball: half the split, same cap.** ±10° keeps extras visibly
  separate but in a tighter cone, so they stay readable. Attached-serve
  extras still launch around the −60° serve angle (−70° / −50° instead
  of −80° / −40°). The 3-ball cap and spend-on-miss lives rule are
  unchanged.
- **Time Attack: 1.15× on the existing progression fold.** The 90s
  clock was not the complaint. A constant 15% speed bump (level 1
  effectively 0.69 vs 0.60, just past Classic level 2's 0.68) creates
  more brick contacts without a new scoring rule. Slow / Fast still
  stack on top. Classic is untouched.
- **Endless: ramp only.** The wall was time-to-cap (~4 min ≈ level 4),
  not the 2× ceiling. +0.15%/s delays the cap to ~11 minutes so level
  10 is still climbing and level 20 is the skill ceiling. Level
  `speedRatio` values are unchanged so Classic's campaign ramp stays.

## FILES CREATED
- `docs/progress/DXB-21.md` — this file.

## FILES MODIFIED
- `src/entities/dx-ball/GameMode.ts` — `TIME_ATTACK_SPEED_MULTIPLIER`
  (1.15); `ENDLESS_SPEED_RAMP_PER_SECOND` (0.0015); `TIME_ATTACK_DURATION_MS`
  still 90s; `ENDLESS_SPEED_RAMP_CAP` still 2; new
  `computeModeSpeedMultiplier()`.
- `src/entities/dx-ball/Ball.ts` — comments only: the progression fold
  is also Time Attack's constant, not Endless-only.
- `src/scenes/MainScene.ts` — Fire Ball 7s; Multi Ball ±10°;
  `applyModeSpeed()` writes Classic / Time Attack / Endless folds onto
  serve, extras, and the opening ball. No new effect types.
- `docs/CURRENT_STATE.md` — see below.

## ARCHITECTURAL DECISIONS
- **Pure config-value tuning, same seams.** Fire duration stays in
  `POWERUP_DURATION_MS`. Multi Ball split stays in
  `MULTI_BALL_SPLIT_ANGLES_DEG`. Mode speed still goes through
  `Ball.setProgressionMultiplier()` so the ball does not import
  `GameMode.ts`. No new classes, no new powerup types, no layout edits.
- **Time Attack reuses the progression fold.** DXB-14 already named
  that multiplier as a nameless speed scale. A constant 1.15 for Time
  Attack is the same write `applyEndlessSpeed()` used for Endless,
  generalized to `applyModeSpeed()` + `computeModeSpeedMultiplier()`.
- **Endless stays time-based.** Switching the ramp to "per level
  cleared" would be a new rule. Slowing `ENDLESS_SPEED_RAMP_PER_SECOND`
  is the existing knob that removes the level-4 wall.

## CONSISTENCY REVIEW
- **Classic** — same levels, lives, win-on-last, base `speedRatio`.
  Fire Ball is shorter and Multi Ball is tighter; both still exist.
  Campaign feel is the same loop with less-dominant powerups.
- **Time Attack** — still 90s, still wraps `LEVELS`, still highest
  score. The 1.15× fold is the only mode-specific speed change, so
  the clock stays competitive rather than becoming a slow brick-tap.
- **Endless** — still wraps, still lives-end, still ramps to 2×.
  Early levels are no longer at-cap; late levels still demand skill.

## REQUIREMENTS VERIFICATION
`npm run typecheck` and `npm run build` both pass with no errors.

Restrictions held: no new powerups, brick types, achievements, themes,
levels, or modes. Score / lives / drop / audio call sites were not
replaced.

## KNOWN RISKS
- **Values are reasoned from the playtest notes, not a second live
  session in this environment.** This environment's browser-automation
  tab remains unreliable for real-time, input-driven feel (the same
  finding every closure since DXB-06A). Behavior is verified by
  construction plus typecheck/build.
- **Fire Ball still one-shots metal.** If a later playtest still finds
  it dominant, duration can drop again (6s) before touching
  `takeHit()`.
- **Time Attack 1.15× stacks with Fast Ball (1.45× → ~1.67×).** Same
  stacking rule as Endless × Fast. Fast remains a short 10s effect.
- **Endless still compounds level `speedRatio` with the fold.** Level
  10 at cap is 0.98 × 2.0. That is the intended late-run ceiling, now
  reached around level 20 instead of level 4.

## NEXT RECOMMENDED TASK
Ship / host the release candidate. Remaining optional polish:
- Visual feedback (catch flash, crack-hit cue, "+N" popup) — deferred
  since DXB-05.
- Background music — deferred by DXB-10.
- A visible mute toggle on the pause overlay.
- Sticky Paddle — deferred at DXB-09.
