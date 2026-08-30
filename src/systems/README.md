# systems/

Reusable, game-agnostic engine systems shared across every arcade title
built on this foundation (DX-Ball, Pac-Man, Snake, Bomberman, ...).

Examples of what belongs here as the project grows:

- Input abstraction (keyboard/gamepad/touch mapping)
- Audio manager (music/sfx pooling, mute state)
- Save/score persistence
- A global event bus for cross-scene communication
- Collision/physics helpers that aren't specific to one game's rules

Nothing in this folder should contain gameplay rules for a specific game —
that belongs in `entities/` (per-game actors) or a future per-game module.

Currently only `SceneKeys.ts` lives here, defining the string keys used to
register and start scenes.
