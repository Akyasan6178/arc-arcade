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
