# DXB-10 Audio System

## TASK
Add audio feedback to every major DX-Ball gameplay event: paddle hit,
brick break, powerup spawn, powerup collect, life lost, level complete,
game over, and victory — behind a global enable/disable flag, with a
safe fallback if audio assets are missing, and an architecture ready for
future music support. Explicitly out of scope: background music, visual
redesign, a leaderboard.

## STATUS
Completed. `npm run typecheck` and `npm run build` both pass (see
Requirements Verification). An earlier pass in a previous session left
the implementation uncommitted with leftover `window.__debugGame` /
`__debugAudio` hooks in `main.ts` and without a verified typecheck/build;
those gaps are closed here.

## SCOPE
"Audio System" left one genuine open decision the same way every prior
task confirmed scope before implementing an ambiguously named task: with
**no audio asset pipeline and no real audio files anywhere in this
project** (`src/assets/` was completely empty before this task, exactly
like every visual entity's own "no sprite pipeline exists yet" note since
DXB-01), what does "add sound effects" actually play?

Rather than fabricate binary audio files, this task follows the exact
precedent every other entity's *visual* feedback already set when no
asset pipeline existed (`Paddle`/`Brick` are plain rectangles, `Ball` is
a plain circle, `Powerup` is a plain colored rounded-rect + text label —
DXB-09's own words: "no sprite/asset pipeline exists yet ... consistent
with every other entity's plain-Phaser-shape convention"). The audio
equivalent of a "plain shape" is a short tone synthesized directly via
the Web Audio API — no binary asset file required, genre-appropriate
(chiptune-style beeps/arpeggios are period-correct for an Arkanoid/
DX-Ball clone), and it is real, audible sound, not a stub.

Confirmed by construction, mirroring how DXB-09 confirmed its own open
decisions up front:
1. **Every sound effect is a synthesized tone today**, played through a
   two-path `AudioManager.play(key, fallback)`: a real Phaser-loaded
   audio asset under `key` is preferred if one exists (none do yet), and
   `fallback` (a short synthesized `ToneSpec`) is used otherwise. This
   *is* the required "safe fallback if audio assets are missing" —
   every key is currently "missing" by definition, and every sound
   effect is still audible because of this fallback path.
2. **A real per-game audio asset manifest (`src/assets/dx-ball/
   audio-manifest.ts`) was still added, empty, and already wired into
   `PreloadScene`.** The moment a future task adds real files, no code
   in `AudioManager`, `PreloadScene`, or any call site changes — the
   manifest is populated and Phaser's own cache does the rest.
3. **The global enable/disable flag is a persisted flag plus a keyboard
   shortcut (`M`), not a new HUD button/icon** — a visible mute button
   would be a "visual redesign" restriction violation; a keybinding is
   not.

## FILES CREATED
- `src/systems/AudioManager.ts` — the reusable, game-agnostic audio
  system named (but unbuilt) in `systems/README.md` since the project's
  foundation task. Singleton, same shape as `GameViewport`
  (`AudioManager.init(game)` once in `main.ts`, `AudioManager.get()`
  from anywhere). `play(key, fallback)` tries a real Phaser-cached audio
  asset first, then `fallback` (a `ToneSpec`: one or more oscillator
  steps with frequency/duration/waveform/gain) synthesized directly via
  the Web Audio API, with a short linear gain envelope per step to avoid
  clicks. A global `enabled` flag (`isEnabled()` / `setEnabled()` /
  `toggle()`) is persisted to `localStorage` (default enabled if never
  toggled before) and gates every call. Every operation — cache lookup,
  `AudioContext` construction/resume, oscillator scheduling — is wrapped
  in `try`/`catch`; `play()` never throws, matching `HighScoreStore`'s
  own defensive contract for `localStorage`.
- `src/entities/dx-ball/audioCues.ts` — DX-Ball's own sound-effect
  vocabulary, kept out of `AudioManager` the same way `levels.ts` keeps
  level data out of `BrickGrid`/`Ball` (DXB-08's own precedent).
  `DxBallSfxKey` is a string union of the 8 required events; a
  module-private `Record<DxBallSfxKey, ToneSpec>` defines each one's
  synthesized cue (short beeps/arpeggios, sine/square/sawtooth,
  60–320 ms per step). `playDxBallSfx(key)` is the one call every
  entity/scene below uses.
- `src/assets/dx-ball/audio-manifest.ts` — the designated home for real
  DX-Ball audio files once any exist, exactly the shape `assets/
  README.md` already anticipated (`assets/dx-ball/manifest.ts`).
  Currently an empty `DX_BALL_AUDIO_MANIFEST: AudioManifestEntry[]`
  array; each entry carries a `category: 'sfx' | 'music'` field
  previewing the seam a future music system would use.
- `docs/progress/DXB-10.md` — this file.

## FILES MODIFIED
- `src/main.ts` — added `AudioManager.init(game)` right after the
  existing `GameViewport.init(game)`, the same "single shared system,
  initialized once here" pattern. A leftover temporary
  `window.__debugGame` / `__debugAudio` hook from an earlier pass was
  fully reverted before this task closed, matching every prior task's
  own "add, use, revert" discipline.
- `src/scenes/PreloadScene.ts` — `preload()` now loops over
  `DX_BALL_AUDIO_MANIFEST` calling `this.load.audio(key, url)` for each
  entry (currently zero, so a no-op today, ready the moment the
  manifest is populated).
- `src/entities/dx-ball/Ball.ts` — `resolvePaddleCollision()` now plays
  `'paddle-hit'` on the *rising edge* of paddle overlap (any axis), so a
  single contact that spans several DXB-05 motion substeps does not
  replay the cue every substep. `returnToPaddle()` clears that overlap
  flag.
- `src/entities/dx-ball/BrickGrid.ts` — `resolveBallCollision()` now
  plays `'brick-break'` the instant it removes a brick, alongside the
  scoring/powerup-roll side effects that already happen at that exact
  point.
- `src/entities/dx-ball/PowerupManager.ts` — `spawn()` now plays
  `'powerup-spawn'` right after creating a capsule; `update()` now plays
  `'powerup-collect'` the instant a capsule overlaps the paddle (caught).
- `src/scenes/MainScene.ts` — `create()` now wires the `M` key directly
  to `AudioManager.get().toggle()` (defensively, so a missing manager
  cannot throw into the input handler). `updateLives()` now plays
  `'life-lost'` the instant lives actually decrement. `handleLevelCleared()`
  now plays `'level-complete'` — but only on the branch that shows the
  transition message, never on the last level (which defers straight to
  `handleWin()`). `handleGameOver()` plays `'game-over'`; `handleWin()`
  plays `'victory'`.
- `src/systems/README.md`, `src/assets/README.md` — document the new
  `AudioManager` and the first (still-empty) asset manifest.
- `docs/CURRENT_STATE.md` — see below.

## ARCHITECTURAL DECISIONS
- **`AudioManager` lives in `systems/`, is fully game-agnostic, and
  never imports anything from `entities/`.** It only knows how to play a
  bare `key` string plus an optional `ToneSpec` fallback — the same
  one-way dependency direction every other `systems/` file already has
  (`GameViewport`/`HighScoreStore` know nothing about DX-Ball). DX-Ball's
  own 8 event names and their synthesized sound design live entirely in
  `entities/dx-ball/audioCues.ts`, mirroring exactly how DXB-08 placed
  `LEVELS` in `entities/dx-ball/levels.ts` instead of `BrickGrid`.
- **Entities call `playDxBallSfx()` directly at the point each event
  actually happens, rather than the owning scene inferring it later from
  a getter/queue.** Every prior *cross-entity* concern in this codebase
  (score, lives, level-clear, powerup effects) is deliberately routed
  through `MainScene` polling a getter/queue every frame, because those
  concerns require decisions only the scene can make (is this the last
  level? how many lives are left?). A sound effect at a collision site
  has no such decision to make — it is a direct, local, immediate
  consequence of that exact call, the same way a `Brick` destroying
  itself already *is* its own visual feedback with no scene involvement.
  Adding an event-emitter/queue layer just to relay "a paddle hit
  happened" one frame later, only for `MainScene` to immediately act on
  it, would add indirection without adding any actual decision-making —
  so `Ball`/`BrickGrid`/`PowerupManager` call `AudioManager` (via
  `playDxBallSfx()`) directly, the same way they'd call `this.scene.add`
  or any other engine-level facility. This does *not* violate the
  established "entities don't know about lives/score/levels" rule: those
  are DX-Ball *rules* an entity would need new state/logic to know about;
  playing a fire-and-forget sound requires neither.
- **`AudioManager.play()`'s two-path design (real asset, then
  synthesized fallback) is the literal implementation of both this
  task's "safe fallback if audio assets are missing" requirement *and*
  its "prepare architecture for future music/real-asset support"
  requirement, in one mechanism.** No separate "is this key missing"
  detection was needed — checking `game.cache.audio.exists(key)` and
  falling through on `false` (or on a real-playback exception) already
  is the fallback; the same check already is what makes adding a real
  asset later a drop-in upgrade with zero call-site changes.
- **Every Web Audio operation is wrapped in `try`/`catch`, and a
  confirmed-unavailable `AudioContext` is remembered (`synthesisUnavailable`)
  so later calls short-circuit instead of retrying construction every
  time.** This satisfies "no runtime audio errors" unconditionally: an
  older browser, a non-browser test environment, or a browser actively
  blocking audio (autoplay policy, permissions) all degrade to "plays
  nothing," never to a thrown exception reaching gameplay code.
- **The `AudioContext` is created lazily on first real `play()` call,
  not at `AudioManager.init(game)` time.** `init()` runs immediately on
  page load, before any user gesture — constructing an `AudioContext`
  that early would sit `suspended` and could log a browser autoplay-
  policy warning for a context nothing has tried to use yet. Deferring
  construction to the first actual sound effect (already inside a
  gameplay session, so likely after some user interaction) minimizes
  that.
- **The global mute toggle is a keybinding (`M`), not a new HUD element.**
  This task's own Restrictions explicitly forbid "visual redesign";
  adding a mute icon/button would be exactly that. A `keydown-M` listener
  on the scene's own `this.input.keyboard` (torn down automatically on
  scene shutdown/restart, like every other per-scene listener already
  is) satisfies "audio can be globally disabled" without touching the
  HUD.
- **The enabled flag defaults to `true` and is only ever persisted as an
  explicit `'0'`/`'1'`, distinguishing "never toggled" from "explicitly
  disabled."** A naive reuse of `HighScoreStore` (which returns `0` for
  both "unset" and "explicitly stored 0") would have made a fresh
  browser silently start muted — so `AudioManager` reads/writes its own
  tiny `localStorage` key directly instead, with the same defensive
  `try`/`catch` shape `HighScoreStore` already established, just correct
  for boolean tri-state semantics. The key itself is
  `arc-arcade-audio-enabled` (arcade-wide, not `dx-ball-…`), keeping
  `AudioManager` game-agnostic the same way `HighScoreStore` never
  hard-codes a DX-Ball key.
- **"Level Complete" and "Victory" are mutually exclusive per clear, not
  layered.** `handleLevelCleared()` only plays `'level-complete'` on the
  branch that actually shows the transition message; the last-level
  branch returns immediately into `handleWin()`, which plays `'victory'`
  instead. A player never hears both cues for the same brick-grid clear.
- **Paddle-hit audio fires on the rising edge of overlap, not on every
  overlapping substep.** DXB-05 splits a launched frame into several
  collision-checked substeps and the paddle does not push the ball out
  of overlap, so a naive "play whenever `checkBallCollision()` returns
  an axis" would replay `'paddle-hit'` several times for one contact.
  `Ball` tracks `overlappingPaddle` and only calls `playDxBallSfx()`
  when overlap goes from false to true.

## REQUIREMENTS VERIFICATION
- **Every gameplay event triggers audio**: all 8 required events
  (`paddle-hit`, `brick-break`, `powerup-spawn`, `powerup-collect`,
  `life-lost`, `level-complete`, `game-over`, `victory`) have exactly one
  `playDxBallSfx()` call site, placed directly at the code path that
  already detects that event (see Files Modified above for every exact
  location). Each was code-reviewed against the existing gameplay flow
  this same session to confirm it is reachable exactly when, and only
  when, that event actually occurs.
- **No runtime audio errors**: `AudioManager.play()`/`playTone()` wrap
  every cache lookup, real-asset playback call, `AudioContext`
  construction/resume, and oscillator scheduling call in `try`/`catch`;
  no path rethrows. `playDxBallSfx()` itself also swallows any
  `AudioManager.get()` failure, so a missing manager cannot reach
  gameplay. `playDxBallSfx()` never receives a `key` outside the 8
  defined in `DX_BALL_SFX_TONES` (a `Record` keyed by the exhaustive
  `DxBallSfxKey` union), so every fallback tone is always defined —
  there is no "unknown key" case to hit at every call site.
- **Audio can be globally disabled**: `AudioManager.setEnabled(false)`/
  `toggle()` (wired to the `M` key in `MainScene.create()`) makes every
  subsequent `play()` call an immediate no-op, verified by direct method
  inspection (`play()`'s very first check is `if (!this.enabled) return;`).
- **Typecheck passes** / **Build passes**: `npm run typecheck` and
  `npm run build` both pass with no errors.

## KNOWN RISKS
- **Every sound effect is a placeholder synthesized tone, not a composed
  or mastered sound design pass** — frequencies/durations/waveforms were
  chosen by genre convention (rising tones for pickups, descending tones
  for losses, arpeggios for level-complete/victory) and are unplaytested,
  the same "reasoned but not playtested" caveat every prior task's tuning
  values have carried since DXB-06A.
- **No real audio asset files exist yet** — `DX_BALL_AUDIO_MANIFEST` is
  empty, so the "real asset" path in `AudioManager.play()` is entirely
  unexercised (always falls through to synthesis). This was a scoping
  decision (see Scope), not an oversight, but it means that path's own
  correctness (a real `this.game.sound.play(key)` call succeeding) is
  unverified beyond matching Phaser's own documented API shape.
- **Volume levels/gain values across all 8 cues were not balanced
  against each other or against any future music track** — each was
  given a small, broadly reasonable peak gain (0.15–0.26) independently,
  not mixed as a set.
- **No per-category (sfx vs. future music) volume control exists yet** —
  only one global `enabled` flag. A future music task would likely want
  independent sfx/music volume sliders, not just one on/off switch; the
  architecture (`ToneSpec`'s `gain` per step, a `category` field already
  on `AudioManifestEntry`) is ready for that extension but it isn't
  built.
- **This environment's browser-automation tab is still unreliable for
  real-time, input-driven verification** (the same finding every closure
  since DXB-06A has documented). Cue-to-event wiring was verified by
  code review plus deterministic state inspection in a running build;
  a genuinely live "hear every cue in an actual playthrough" pass was
  not completed.

## NEXT RECOMMENDED TASK
- **A live-playtested balance pass** covering every tuning value flagged
  as unplaytested since DXB-06A/07/08/09, now also covering this task's
  own 8 synthesized cues' pitches/durations/gains — the standing
  recommendation across nearly every task's closure so far.
- **Background music**, explicitly deferred by this task's own
  Restrictions — `AudioManager`'s real-asset path, `AudioManifestEntry`'s
  `category` field, and the existing global `enabled` flag are all
  already shaped for it.
- **A pause/main menu** — `ui/` still has no menu component; a visible
  mute toggle (as opposed to today's `M` keybinding) would fit naturally
  there once one exists, without this task's "no visual redesign"
  restriction applying to a future task.
- **Visual feedback polish** — a "+N" popup or flash on scoring, a flash
  on losing a life / catching a powerup / a level transition; a HUD
  indicator for an active timed effect's remaining duration. The audio
  half of this long-standing polish item is now in.
