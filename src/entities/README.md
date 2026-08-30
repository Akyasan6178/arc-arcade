# entities/

Game objects/actors with their own behavior and state, e.g. a DX-Ball
paddle/ball/brick, a Pac-Man ghost, a Snake segment, or a Bomberman bomb.

Convention going forward: each game gets its own subfolder here
(e.g. `entities/dx-ball/`, `entities/pacman/`) so entities never collide
between titles while still sharing the same base classes/interfaces if
useful (e.g. a common `Entity` or `Sprite`-based abstraction placed
directly in this folder).

Intentionally empty for now — no gameplay has been implemented yet.
