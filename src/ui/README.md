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
  lets `setValue` take an optional suffix (`Level 1 / 5`).
- `ActiveEffectsLabel.ts` — DXB-12's second shared widget. A centered
  top-of-viewport `Text` listing active effects and remaining duration
  (or a count suffix for untimed effects). Hidden when the list is empty.
  Not DX-Ball-specific; `MainScene` decides which effects to show.
  DXB-13 matches its typeface, stroke, and shadow to `ScoreLabel`.
- `ArcadeBackground.ts` — DXB-13's lightweight arcade backdrop. A
  `Graphics` object that paints a gradient, a faint grid, static dots,
  and a vignette from viewport size only — no assets, no per-frame
  work. DXB-15 adds `applyTheme()` so Neon / Space / Laboratory can
  swap colors and motif. Not DX-Ball-specific.
- `ModeLabel.ts` — DXB-14's top-center mode HUD (`label` + optional
  `detail`, e.g. a Time Attack clock). Same typeface/stroke as the
  other HUD widgets. Not DX-Ball-specific.
- `SelectMenu.ts` — DXB-14's reusable vertical option list (arrows,
  Space / Enter, click). Caller supplies options and an `onSelect`
  callback. DXB-13A adds `destroy()` (so a pause overlay can unbind
  Space) and a configurable `depth`. DXB-15 adds `initialIndex` and
  `onHighlight` for live theme preview. DXB-16 adds `locked` so a
  highlightable row cannot be confirmed. Not DX-Ball-specific.
- `PauseOverlay.ts` — DXB-13A's reusable pause/menu overlay. Dims the
  playfield, shows a title, and hosts a `SelectMenu`. Hidden until
  `show()`. DXB-15 adds a framed panel, accent bar, and `applyTheme()`.
  Not DX-Ball-specific.
- `ResultOverlay.ts` — DXB-15's reusable end/transition card (victory,
  game over, time-up, level-clear). Dim + framed panel + title + body.
  Not DX-Ball-specific.
- `ProgressList.ts` — DXB-16's reusable catalog list (title + locked /
  unlocked / percent / equipped). Space confirms only unlocked
  selectable rows. DXB-18 adds `onHighlight`, `initialIndex`,
  `getSelectedId()`, and a FAVORITE badge. Not DX-Ball-specific beyond
  the `ProgressRow` shape.
- `StatsList.ts` — DXB-17's reusable read-only label/value list
  (statistics, personal bests, leaderboards, progress summary).
  Arrow keys highlight; there is no confirm. Not DX-Ball-specific
  beyond the `StatDisplayRow` shape.
- `CollectionPreview.ts` — DXB-18's live preview stage (themed
  swatch + paddle / ball cosmetics). Caller supplies visual tokens.
  No gameplay. Not DX-Ball-specific.
