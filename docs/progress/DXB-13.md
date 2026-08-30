# DXB-13 Visual Refresh

## TASK
Improve DX-Ball gameplay readability and visual clarity: distinct brick
types, an obvious Fire Ball state, polarity-colored powerup capsules,
a more readable HUD, and a lightweight arcade background — without
changing any gameplay systems.

## STATUS
Completed. `npm run typecheck` and `npm run build` both pass (see
Requirements Verification).

## SCOPE
Confirmed by the task itself, with no remaining open product decisions:

1. **Visual-only** — score, lives, levels, powerups, audio, and every
   collision/effect path stay on their existing call sites. No new
   mechanics, themes, market, leaderboard, or powerup types.
2. **Brick distinction stays data-driven** — `BRICK_TYPE_SPECS` still
   owns fill/stroke; `Brick` still owns drawing. The collision body
   remains the existing `Rectangle` so `BrickGrid` x/y/width/height
   math does not change.
3. **Powerup polarity is a color remap** — positives share a green
   family, negatives a red/orange family; the one-letter labels (`W`
   `S` `L` `F` `M` `N` `T`) are unchanged.
4. **HUD is the same widgets, restyled** — `ScoreLabel` and
   `ActiveEffectsLabel` gain a shared bold typeface, dark stroke, and
   drop shadow. Prefixes, anchors, and polling are unchanged.
5. **Background is a `ui/` Graphics widget** — gradient bands, a faint
   grid, static dots, and a vignette, redrawn only on resize. No
   assets and no per-frame work.

## FILES CREATED
- `src/ui/ArcadeBackground.ts` — reusable lightweight arcade backdrop.
  Not DX-Ball-specific.
- `docs/progress/DXB-13.md` — this file.

## FILES MODIFIED
- `src/entities/dx-ball/BrickType.ts` — cracked/metal/bonus visual
  constants tightened so each type reads further apart. Hit counts,
  score, and drop policy are unchanged.
- `src/entities/dx-ball/Brick.ts` — sibling `Graphics` overlay draws a
  clean bevel (normal), crack lines (damaged cracked), metallic bands
  (metal), or a gold highlight + pip (bonus). `takeHit()` and all
  gameplay fields are unchanged.
- `src/entities/dx-ball/Ball.ts` — Fire Ball uses a hotter fill, a
  gold stroke, and a translucent glow circle. Pierce timing is
  unchanged.
- `src/entities/dx-ball/Powerup.ts` — green-family fills for the five
  positives, red/orange for Small / Fast; letters kept.
- `src/entities/dx-ball/Paddle.ts` — playfield depth only, so the
  paddle stays above the new backdrop.
- `src/ui/ScoreLabel.ts` — shared HUD typeface, stroke, and shadow.
- `src/ui/ActiveEffectsLabel.ts` — same HUD language as `ScoreLabel`.
- `src/ui/README.md` — documents the restyle and `ArcadeBackground`.
- `src/scenes/MainScene.ts` — creates/resizes the backdrop; corner
  labels use Score / Best / Lives / Level colors from the same palette.
- `src/main.ts` — canvas `backgroundColor` matches the backdrop.
- `docs/CURRENT_STATE.md` — see below.

## ARCHITECTURAL DECISIONS
- **No new gameplay type or system.** Every change is appearance:
  colors, strokes, a Graphics overlay, a glow sibling, a backdrop
  widget. `BrickGrid`, `PowerupManager`, score/lives/level polls, and
  audio call sites were not rewritten.
- **`Brick` stays a `Rectangle`.** Collision still uses this object's
  x/y/width/height. The overlay is a sibling Graphics (not a Container
  rewrite) so `BrickGrid.resize()` / `setPosition()` keep working; the
  overlay is destroyed in `preDestroy()`.
- **Fire glow is a second `Arc`, not a post-FX.** Phaser 4 FX support
  is not assumed. One extra circle per live ball (max 3) is cheap and
  is shown only while `fireRemainingMs > 0`.
- **Polarity is the capsule color, identity is still the letter.**
  Extra Life moving from red to green is the intended readability
  fix — red is reserved for negatives (Small / Fast).
- **HUD language is shared, not a new widget.** Bold + `#0b1320`
  stroke + a short shadow on every label, with Score white, Best
  gold, Lives mint, Level cyan, and effects amber. Same
  `ScoreLabel` / `ActiveEffectsLabel` classes.
- **Background is static Graphics.** Twelve-or-fewer fill bands plus
  a grid and 32 hashed dots. `resize()` rebuilds it; `update()` never
  touches it.

## REQUIREMENTS VERIFICATION
`npm run typecheck` and `npm run build` both pass with no errors.

Verified by construction / code review:

- **Brick types are visually distinct** — normal is a clean beveled
  solid; cracked healthy has a pale outline; cracked damaged adds
  visible crack lines and a gold stroke; metal is steel bands +
  silver rim (never a row color); bonus is purple with a gold rim
  and center pip.
- **Positive and negative powerups are distinguishable** — W/S/L/F/M
  are green-family; N/T are red/orange; letters unchanged.
- **Fire Ball is visually obvious** — hot orange fill, gold stroke,
  and a larger translucent glow while the effect is active.
- **HUD readability improves** — bold typeface, dark stroke, shadow,
  and per-stat colors on Score / Best / Lives / Level / Active
  Effects.
- **Gameplay behavior remains unchanged** — no collision, score,
  lives, level, powerup-effect, or audio call site was replaced.
- **Typecheck passes** / **Build passes**: `npm run typecheck` and
  `npm run build` both pass with no errors.

## KNOWN RISKS
- **None of the new colors were live-playtested.** Contrast of mint
  Lives / cyan Level against the navy grid, and of green capsules
  against green row bricks, is reasoned rather than measured — the
  same "placeholder, not playtested" risk flagged since DXB-06A.
- **This environment's browser-automation tab remains unreliable for
  real-time, input-driven verification** (the same finding every
  closure since DXB-06A has documented). Behavior was verified by
  construction and typecheck/build; a static screenshot can confirm
  presentation only.
- **Brick overlay is a sibling, not a child.** `setPosition` is
  overridden and `refreshAppearance()` re-syncs it; any future caller
  that writes `brick.x = …` directly (none today) would desync the
  overlay.

## NEXT RECOMMENDED TASK
- **A live-playtested balance pass** covering the 7-type mix, brick
  layouts, and the standing untuned values since DXB-06A/07/08/09/10/11/12.
- **Visual/audio polish** — a catch flash, a crack-hit cue, a "+N"
  popup. Presentation of types/HUD/background is now in; those
  feedback pops are still deferred since DXB-05.
- **Background music**, explicitly deferred by DXB-10.
- **A pause/main menu** (`ui/` still has no menu component).
- Sticky Paddle, still deferred at DXB-09's own scoping.
