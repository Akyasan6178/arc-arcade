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
  dark stroke, and drop shadow so every corner stays readable.
- `ActiveEffectsLabel.ts` — DXB-12's second shared widget. A centered
  top-of-viewport `Text` listing active effects and remaining duration
  (or a count suffix for untimed effects). Hidden when the list is empty.
  Not DX-Ball-specific; `MainScene` decides which effects to show.
  DXB-13 matches its typeface, stroke, and shadow to `ScoreLabel`.
- `ArcadeBackground.ts` — DXB-13's lightweight arcade backdrop. A
  `Graphics` object that paints a gradient, a faint grid, static dots,
  and a vignette from viewport size only — no assets, no per-frame
  work. Not DX-Ball-specific.
