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

Currently:

- `SceneKeys.ts` — string keys used to register and start scenes.
- `GameViewport.ts` — ARC-01 responsive-viewport service. Wraps Phaser's
  Scale Manager plus browser orientation/safe-area concerns into a single
  `GameViewport.get()` accessor (`width`, `height`, `centerX`, `centerY`,
  `isPortrait`, `isLandscape`, `safeArea`, `onChange(listener)`) that any
  scene/system/entity in any future game can read.
