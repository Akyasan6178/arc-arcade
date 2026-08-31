# ui/

Heads-up display and menu components layered on top of gameplay: score
displays, health/lives indicators, pause menus, main menu screens, buttons,
dialogs.

Convention going forward: shared/reusable widgets (e.g. a generic Button or
ScoreLabel) live directly in this folder; per-game screens can live in
subfolders (e.g. `ui/dx-ball/`) if/when they diverge.

Currently:

- `ScoreLabel.ts` — DXB-06's first shared widget. A `Phaser.GameObjects.Text`
  subclass showing a `prefix` + numeric value anchored to a viewport
  corner, responsively sized/positioned. Not DX-Ball-specific; reusable
  for a score, a best score, or (in a future game) a lives counter.
  DXB-07 added the two bottom corners as anchor options and put that
  reuse into practice — DX-Ball's lives counter is a third `ScoreLabel`
  instance (`Lives: `, bottom-left). DXB-13 adds a shared bold typeface,
  dark stroke, and drop shadow so every corner stays readable. DXB-13A
  lets `setValue` take an optional suffix (`Level 1 / 10`). DXB-20 adds
  optional safe-area insets and a minimum font size.
- `ActiveEffectsLabel.ts` — DXB-12's second shared widget. A centered
  top-of-viewport `Text` listing active effects and remaining duration
  (or a count suffix for untimed effects). Hidden when the list is empty.
  Not DX-Ball-specific; `MainScene` decides which effects to show.
  DXB-13 matches its typeface, stroke, and shadow to `ScoreLabel`.
- `ArcadeBackground.ts` — DXB-13's lightweight arcade backdrop. A
  `Graphics` object that paints a gradient, a faint grid, static dots,
  and a vignette from viewport size — rebuilt on resize / theme change.
  DXB-15 adds `applyTheme()` so Neon / Space / Laboratory can swap
  colors and motif. DXB-19 adds retro CRT scanlines, frozen frost
  shards, and inferno ember vents. DXB-22 adds a sibling particle
  overlay (under 20 dots) so themes feel alive without assets. Not
  DX-Ball-specific.
- `ModeLabel.ts` — DXB-14's top-center mode HUD (`label` + optional
  `detail`, e.g. a Time Attack clock). Same typeface/stroke as the
  other HUD widgets. Not DX-Ball-specific.
- `SelectMenu.ts` — DXB-14's reusable vertical option list (arrows,
  Space / Enter, click). Caller supplies options and an `onSelect`
  callback. DXB-13A adds `destroy()` (so a pause overlay can unbind
  Space) and a configurable `depth`. DXB-15 adds `initialIndex` and
  `onHighlight` for live theme preview. DXB-16 adds `locked` so a
  highlightable row cannot be confirmed. DXB-20 shrinks row height
  when the list would otherwise clip the Back/hint row. Not
  DX-Ball-specific.
- `PauseOverlay.ts` — DXB-13A's reusable pause/menu overlay. Dims the
  playfield, shows a title, and hosts a `SelectMenu`. Hidden until
  `show()`. DXB-15 adds a framed panel, accent bar, and `applyTheme()`.
  Not DX-Ball-specific.
- `ResultOverlay.ts` — DXB-15's reusable end/transition card (victory,
  game over, time-up, level-clear). Dim + framed panel + title + body.
  DXB-20 adds a tap-to-continue hint and word wrap. DXB-22 adds a
  kicker, a reward line, and stronger theme-colored panel treatment.
  Not DX-Ball-specific.
- `ProgressList.ts` — DXB-16's reusable catalog list (title + locked /
  unlocked / percent / equipped). Space confirms only unlocked
  selectable rows. DXB-18 adds `onHighlight`, `initialIndex`,
  `getSelectedId()`, and a FAVORITE badge. Garage and Achievements
  are the current callers. Not DX-Ball-specific beyond the
  `ProgressRow` shape.
- `StatsList.ts` — DXB-17's reusable read-only label/value list
  (statistics, personal bests, leaderboards, progress summary).
  Arrow keys highlight; there is no confirm. Not DX-Ball-specific
  beyond the `StatDisplayRow` shape.
- `CollectionPreview.ts` — DXB-18's live preview stage (themed
  swatch + paddle / ball cosmetics). Caller supplies visual tokens.
  DXB-22 animates those tokens and the theme motif so Garage shows
  why a cosmetic is worth unlocking. No gameplay. Not DX-Ball-specific.
- `CatchFlash.ts` — DXB-22's one-shot full-viewport color flash.
  `MainScene` uses it for powerup collection. Not DX-Ball-specific.
- `TextButton.ts` — DXB-18A's reusable tappable label (hover brightens,
  pointerup clicks). Used for visible Back / Favorite / Settings /
  Pause controls. Not DX-Ball-specific.
- `TabBar.ts` — DXB-18A's reusable horizontal tab strip (tap or Left /
  Right). Garage and Statistics are the first callers. Not
  DX-Ball-specific.
- `menuLayout.ts` — DXB-20's shared menu chrome tokens (title /
  subtitle / hint / Back placement, minimum font sizes, safe-area
  offsets). Hub and every side screen read these so spacing stays
  consistent. Not a new screen.
