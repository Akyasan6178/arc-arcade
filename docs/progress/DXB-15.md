# DXB-15 Theme & Visual Identity System

## TASK
Create a consistent visual identity across the entire game: three
selectable themes (Neon Arcade, Space, Laboratory) that recolor the
backdrop, HUD, brick palette, and powerup palette; unique icon
identities for every powerup; and a refresh of the pause, victory, and
game-over screens.

## STATUS
Completed. `npm run typecheck` and `npm run build` both pass (see
Requirements Verification).

## SCOPE
Confirmed by the task itself, with no remaining open product decisions:

1. **Themes are data + a picker scene, not a gameplay system** — same
   shape as DXB-14's `GameMode.ts` / `ModeSelectScene`. Score, lives,
   levels, powerups, and audio keep their existing call sites.
2. **Three themes** — Neon Arcade, Space, Laboratory. Each owns
   backdrop colors/motif, HUD colors, brick row + type colors, powerup
   capsule colors, overlay/menu tokens. Selection is persisted.
3. **Powerup identity is an icon first** — heart / flame / spheres /
   expand / shrink / slow / fast. Letters remain as a small secondary
   cue. Catch / spawn / effect dispatch are unchanged.
4. **Overlay refresh is visual** — pause gets a framed panel; win /
   game-over / time-up / level-clear use a shared `ResultOverlay`.
   Market, leaderboard, and new mechanics stay out of scope.

## FILES CREATED
- `src/entities/dx-ball/Theme.ts` — theme ids, labels, palettes, load/save.
  Kept out of `MainScene` the same way `GameMode.ts` keeps mode data out
  of the run.
- `src/systems/ThemeStore.ts` — game-agnostic string persistence.
- `src/scenes/ThemeSelectScene.ts` — pre-run picker with live backdrop
  preview. Starts `ModeSelectScene`.
- `src/ui/ResultOverlay.ts` — reusable end/transition card.
- `docs/progress/DXB-15.md` — this file.

## FILES MODIFIED
- `src/ui/ArcadeBackground.ts` — theme tokens + Neon / Space /
  Laboratory motifs; `applyTheme()`.
- `src/entities/dx-ball/Powerup.ts` — unique Graphics icons; letter is
  secondary; colors accepted from a theme palette.
- `src/entities/dx-ball/PowerupManager.ts` — passes theme palette into
  each spawned capsule; slightly larger capsule so the icon reads.
- `src/entities/dx-ball/Brick.ts` / `BrickGrid.ts` — optional type
  visuals and row colors from the theme; hit counts / score / drops
  unchanged.
- `src/ui/PauseOverlay.ts` — framed panel, accent bar, themed menu.
- `src/ui/SelectMenu.ts` — `initialIndex` + `onHighlight` for live
  preview.
- `src/scenes/ModeSelectScene.ts` — paints the saved theme; Esc returns
  to ThemeSelect.
- `src/scenes/MainScene.ts` — applies theme to backdrop / HUD / bricks /
  powerups / overlays; result cards replace the old centered text.
- `src/scenes/PreloadScene.ts` / `BootScene.ts` / `src/main.ts` /
  `src/systems/SceneKeys.ts` — Boot -> Preload -> ThemeSelect ->
  ModeSelect -> Main.
- `src/ui/README.md` / `src/systems/README.md` — document the new
  widgets and store.
- `docs/CURRENT_STATE.md` — see below.

## ARCHITECTURAL DECISIONS
- **Theme vocabulary lives next to `GameMode.ts`.** Palettes are
  DX-Ball-specific; persistence is a game-agnostic `ThemeStore` so
  systems/ stays clean.
- **Theme select is a scene.** Matches ModeSelect: Preload hands off to
  ThemeSelect; confirm starts ModeSelect. Esc on ModeSelect returns here.
  `MainScene` only reads `loadThemeId()` — restarting a run keeps the
  theme without passing it through scene data.
- **Entities do not import a live theme singleton.** `BrickGrid` and
  `PowerupManager` take palette tokens from the owning scene, the same
  way they already take level / type config.
- **Icons are Graphics, not assets.** No sprite pipeline exists; this
  is the same plain-Phaser-shape convention as bricks and the fire-ball
  glow.
- **Result cards reuse one widget.** Victory, game over, time-up, and
  level-clear share `ResultOverlay` tones (`victory` / `defeat` /
  `info`). Pause stays its own overlay (it hosts a `SelectMenu`).
- **No new gameplay.** Drop chance, durations, Multi Ball rules, audio
  cues, and the 5-level campaign are untouched.

## REQUIREMENTS VERIFICATION
`npm run typecheck` and `npm run build` both pass with no errors.

Verified by construction / code review:

- **Themes can be selected** — ThemeSelect lists Neon Arcade / Space /
  Laboratory; highlight live-previews the backdrop; confirm persists
  the id; ModeSelect Esc returns to change it.
- **Themes visibly affect the game** — backdrop motif/colors, HUD
  corner/mode/effects colors, brick row + metal/bonus/cracked colors,
  and powerup capsule colors all read from the saved theme.
- **Every powerup is recognizable without reading text** — heart,
  flame, three spheres, expand arrows, inward arrows, clock + down
  chevron, speed chevrons. Letters remain as a secondary corner cue.
- **HUD remains readable** — same bold typeface / dark stroke / shadow
  language; per-stat colors come from the theme tokens chosen for
  contrast against each backdrop.
- **Existing gameplay is unchanged** — no score, lives, level, powerup-
  effect, or audio call site was replaced.
- **Typecheck passes** / **Build passes**: `npm run typecheck` and
  `npm run build` both pass with no errors.

## KNOWN RISKS
- **Capsule size grew slightly** (`widthRatio` 0.05 → 0.056,
  `heightRatio` 0.03 → 0.038) so icons read at playfield scale. Catch
  math is still AABB vs paddle; drop chance and effects are unchanged.
  Not playtested.
- **This environment's browser-automation tab remains unreliable for
  real-time, input-driven verification** (the same finding every
  closure since DXB-06A). Theme select, mode select, and HUD colors
  were checked by construction and typecheck/build.
- **Theme tokens were not contrast-tested on a physical display.**
  Space's dark void and Laboratory's teal grid are reasoned, not
  measured — the standing "placeholder, not playtested" note.

## NEXT RECOMMENDED TASK
- **A live-playtested balance pass** covering the 7-type mix, the
  5-level campaign, Time Attack's 90s clock, Endless's ramp, and now
  icon-sized capsules.
- **Visual/audio polish** — catch flash, crack-hit cue, "+N" popup,
  still deferred since DXB-05.
- **Background music**, explicitly deferred by DXB-10.
- Sticky Paddle, still deferred at DXB-09's own scoping.
