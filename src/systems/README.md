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

- `SceneKeys.ts` — string keys used to register and start scenes
  (`Boot`, `Preload`, `ThemeSelect` since DXB-15, `ModeSelect` since
  DXB-14, `Unlockables` since DXB-16, `Main`).
- `GameViewport.ts` — ARC-01 responsive-viewport service. Wraps Phaser's
  Scale Manager plus browser orientation/safe-area concerns into a single
  `GameViewport.get()` accessor (`width`, `height`, `centerX`, `centerY`,
  `isPortrait`, `isLandscape`, `safeArea`, `onChange(listener)`) that any
  scene/system/entity in any future game can read.
- `HighScoreStore.ts` — DXB-06 save/score persistence. A tiny static
  `get(key)` / `set(key, value)` wrapper around `localStorage`, keyed by
  a caller-provided string so each game picks its own key without this
  file knowing anything about that game's scoring rules.
- `AudioManager.ts` — DXB-10 audio manager (the "music/sfx pooling, mute
  state" example above, now built). `AudioManager.init(game)` once (see
  `main.ts`), then `AudioManager.get().play(key, fallback)` from
  anywhere: plays a real asset loaded under `key` if one exists in
  Phaser's audio cache, otherwise synthesizes `fallback` (a short
  `ToneSpec`) directly via the Web Audio API — today's real playback
  path for every sound effect, since no real audio files exist in this
  project yet. A global `enabled` flag (persisted, `isEnabled()` /
  `setEnabled()` / `toggle()`) gates every sound; every operation is
  defensive and never throws. Knows nothing about DX-Ball or any other
  game's specific sound effects — see `entities/dx-ball/audioCues.ts`
  for that game's own key/tone vocabulary.
- `ThemeStore.ts` — DXB-15 string persistence for a selected theme id.
  Same localStorage wrapper shape as `HighScoreStore`, but for strings.
  Knows nothing about palettes; `entities/dx-ball/Theme.ts` owns those.
- `JsonStore.ts` — DXB-16 JSON persistence. Tiny static `get<T>(key)` /
  `set(key, value)` wrapper around `localStorage`. Knows nothing about
  achievements or unlocks; `entities/dx-ball/Progress.ts` owns those.
