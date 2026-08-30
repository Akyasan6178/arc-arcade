# ui/

Heads-up display and menu components layered on top of gameplay: score
displays, health/lives indicators, pause menus, main menu screens, buttons,
dialogs.

Convention going forward: shared/reusable widgets (e.g. a generic Button or
ScoreLabel) live directly in this folder; per-game screens can live in
subfolders (e.g. `ui/dx-ball/`) if/when they diverge.

Intentionally empty for now — no menus or UI have been implemented yet.
