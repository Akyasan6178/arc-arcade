# DXB-22 Audio & Cosmetic Pass

## TASK
Make unlocked cosmetic content feel valuable and visually rewarding:
theme background music, paddle / ball cosmetic animations, powerup
collection flashes, lighter theme atmosphere, result-screen hierarchy,
and Garage previews that actually show those effects.

Presentation, polish, identity, animation, and audio only. No new
gameplay systems, achievements, themes, levels, or powerups.

## STATUS
Completed. `npm run typecheck` and `npm run build` both pass (see
Requirements Verification).

## SCOPE
Confirmed by the task itself. Existing catalogs, mute, Fire Ball
override, and gameplay call sites stay in place.

1. **Theme music** — six beds on `AudioManager.playMusic`, one per
   existing theme. Real files preferred; synthesized loops if missing.
   Mute still gates everything. Music volume is a separate internal bus
   from SFX.
2. **Paddle / ball cosmetics** — Phaser Graphics / Arc animation on
   existing skins. No GIF files. Fire Ball still overrides the ball
   while active.
3. **Collection flash** — short color flash on catch. No effect changes.
4. **Theme atmosphere** — small particle overlay on `ArcadeBackground`.
5. **Result cards** — kicker / title / reward / body hierarchy plus
   theme-colored panel treatment.
6. **Garage preview** — same motif, glow, shell, and atmosphere ticks
   as gameplay.

## AUDIO IMPLEMENTATION

- `AudioManager.playMusic(key, fallback)` prefers a Phaser-cached asset
  under `key` (looped, `MUSIC_VOLUME` bus). If the cache miss or play
  throws, it synthesizes `MusicLoopSpec` through a dedicated
  `GainNode` at that same music volume. SFX still go through
  `play()` on a separate `SFX_VOLUME` bus (authored ToneSpec gains
  unchanged).
- The persisted `enabled` flag still mutes both. `setEnabled(false)`
  stops oscillators / Phaser loops immediately and remembers the
  current key so unmute resumes. Same-key `playMusic` is a no-op so
  Hub → Theme Select → a run does not restart the bed.
- DX-Ball keys and loop design live in `audioCues.ts`
  (`playDxBallThemeMusic`). Manifest stays empty; named keys are
  documented for a future file drop:
  neon-arcade synthwave, space ambient, laboratory sci-fi pulse,
  retro-grid chiptune, frozen-core cold drones, inferno high-energy
  bass. No binary assets were added.

## COSMETIC IMPLEMENTATION

- **Paddles** — motif overlay redraws each frame for glow / core /
  crystal / plates / pulse / shard (Crystal shimmer, Titan metal
  sweep, Pulse rings, Reactor core glow, Obsidian aura). Classic and
  Carbon stay static. Collision size is unchanged.
- **Balls** — idle `fx` token on existing skins. Ice Core frost glow +
  shell, Dark Matter purple aura, Solar corona, Nova pulsing shell.
  Plasma / Inferno / Quantum get a lighter pulse. Fire Ball still
  swaps fill / glow / hides core and shell while the timer runs.
- **Atmosphere** — sibling Graphics, ≤18 particles, wrap/recycle. Space
  drifts, Frozen falls, Inferno rises, Neon glow orbs, Laboratory
  squares, Retro a moving scanline.
- **Catch flash** — one fullscreen rectangle, ~200ms fade. Extra Life
  green, Fire Ball orange, Multi Ball blue, Slow cool cyan, Fast warm
  pink. Widen / Small use related tints so every catch still flashes.
- **Results** — kicker (mode), title, reward (`Score` / `NEW BEST`),
  body. Victory / game over / Time Attack complete / Endless summary
  each have distinct copy. Panel uses the theme's tone color.
- **Garage** — `CollectionPreview` ticks the same paddle / ball / theme
  motion and labels the stage `LIVE PREVIEW`.

## PERFORMANCE CONSIDERATIONS

- Backdrop gradient/motif is still static (resize / theme only).
  Atmosphere is one extra `Graphics.clear` + ≤18 dots per frame.
- One paddle overlay redraw per frame for animated skins; Classic /
  Carbon skip that path.
- Ball cosmetics tweak existing glow / core / one extra shell Arc
  (max 3 balls). No post-FX, no extra textures.
- Garage preview redraws a small playfield overlay only while that
  scene is active.
- Synthesized music schedules a short lookahead of oscillators onto
  one gain bus; mute disconnects the bus. No audio files in the
  bundle.

## FILES CREATED
- `src/ui/CatchFlash.ts`
- `docs/progress/DXB-22.md` — this file.

## FILES MODIFIED
- `src/systems/AudioManager.ts` — music playback, mute halt/resume,
  separate SFX / music volume buses.
- `src/entities/dx-ball/audioCues.ts` — theme loop specs +
  `playDxBallThemeMusic`.
- `src/assets/dx-ball/audio-manifest.ts` — documented music keys;
  array still empty.
- `src/entities/dx-ball/Skins.ts` — idle `fx` tokens on existing balls.
- `src/entities/dx-ball/Paddle.ts` / `Ball.ts` — cosmetic animation.
- `src/ui/ArcadeBackground.ts` — atmosphere overlay.
- `src/ui/CollectionPreview.ts` — live Garage preview.
- `src/ui/ResultOverlay.ts` — kicker / reward / tone panel.
- `src/scenes/MainScene.ts` — theme music, catch flash, result copy.
- Hub / Theme Select / Mode Select / Garage / Settings / Stats /
  Achievements — start (and preview) theme music.
- README files under `systems/`, `ui/`, `assets/`.
- `docs/CURRENT_STATE.md`.

## ARCHITECTURAL DECISIONS
- Music reuses DXB-10's two-path seam instead of a new audio system.
  Theme beds stay in `audioCues.ts` so `AudioManager` stays
  game-agnostic.
- Cosmetics still do not import unlock tables. `fx` is a visual token
  applied by the owning scene, same as fill / motif.
- Atmosphere is a sibling Graphics, not a rewrite of the static
  backdrop, so resize cost stays on the existing redraw path.
- Collection flash is a `ui/` widget. Catch dispatch still lives in
  `MainScene.applyPowerupEffect()`.

## REQUIREMENTS VERIFICATION
`npm run typecheck` and `npm run build` both pass with no errors.

Restrictions held: no new powerups, themes, achievements, skins,
levels, game modes, currency, purchases, or online systems.

## KNOWN RISKS
- Synthesized beds are placeholders, not mastered tracks. Gains were
  chosen to sit under SFX, not mix-tested on hardware.
- This environment's browser-automation tab remains unreliable for
  real-time audio / animation feel (standing note since DXB-06A).
  Behavior is verified by construction plus typecheck/build.
- Atmosphere is always ticking while a scene with an
  `ArcadeBackground` is active, including pause / result cards. Cost
  is one small Graphics pass.

## NEXT RECOMMENDED TASK
Ship / host the release candidate. Remaining optional polish:
- A visible mute toggle on the pause overlay.
- Sticky Paddle, still deferred at DXB-09.
- Real music files dropped into the named manifest keys.
