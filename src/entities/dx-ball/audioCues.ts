import { AudioManager, type ToneSpec } from '@systems/AudioManager';

/**
 * entities/dx-ball/audioCues.ts
 *
 * DXB-10: DX-Ball's own sound-effect vocabulary — the "which key means
 * what, and what does it sound like" data — kept out of `systems/
 * AudioManager.ts` the same way `levels.ts` keeps level layouts out of
 * `BrickGrid`/`Ball`: `AudioManager` only knows how to play a `key`
 * string plus an optional synthesized `ToneSpec` fallback, and has no
 * idea a "brick" or "paddle" exists, exactly the "systems/ stays
 * game-agnostic, entities/dx-ball/ holds this game's own rules" split
 * DXB-08's closure documented for `LEVELS`.
 *
 * Every event required by this task gets one entry here, each a short
 * synthesized chiptune-style cue (no sprite/asset pipeline exists yet
 * for real audio files either — `src/assets/` is still empty — so, like
 * every visual entity before it (`Powerup`'s plain colored rectangle,
 * `Brick`'s plain rectangle), these are a plain-Web-Audio-oscillator
 * stand-in, not a composed/mastered sound design pass).
 *
 * `playDxBallSfx(key)` is the one call site every entity/scene below
 * uses — it looks up the right `ToneSpec` and hands it to the shared
 * `AudioManager` as that key's fallback, so call sites never repeat (or
 * risk drifting) tone data themselves.
 */
export type DxBallSfxKey =
  | 'paddle-hit'
  | 'brick-break'
  | 'powerup-spawn'
  | 'powerup-collect'
  | 'life-lost'
  | 'level-complete'
  | 'game-over'
  | 'victory';

const DX_BALL_SFX_TONES: Record<DxBallSfxKey, ToneSpec> = {
  'paddle-hit': {
    steps: [{ frequency: 220, durationMs: 60, type: 'square', gain: 0.22 }],
  },
  'brick-break': {
    steps: [
      { frequency: 520, durationMs: 40, type: 'square', gain: 0.2 },
      { frequency: 220, durationMs: 50, type: 'square', gain: 0.18 },
    ],
  },
  'powerup-spawn': {
    steps: [
      { frequency: 400, durationMs: 80, type: 'sine', gain: 0.15 },
      { frequency: 640, durationMs: 100, type: 'sine', gain: 0.15 },
    ],
  },
  'powerup-collect': {
    steps: [
      { frequency: 523.25, durationMs: 80, type: 'sine', gain: 0.2 },
      { frequency: 659.25, durationMs: 80, type: 'sine', gain: 0.2 },
      { frequency: 783.99, durationMs: 120, type: 'sine', gain: 0.22 },
    ],
  },
  'life-lost': {
    steps: [
      { frequency: 440, durationMs: 120, type: 'sawtooth', gain: 0.18 },
      { frequency: 330, durationMs: 140, type: 'sawtooth', gain: 0.18 },
      { frequency: 220, durationMs: 180, type: 'sawtooth', gain: 0.18 },
    ],
  },
  'level-complete': {
    steps: [
      { frequency: 523.25, durationMs: 90, type: 'square', gain: 0.2 },
      { frequency: 659.25, durationMs: 90, type: 'square', gain: 0.2 },
      { frequency: 783.99, durationMs: 90, type: 'square', gain: 0.2 },
      { frequency: 1046.5, durationMs: 150, type: 'square', gain: 0.22 },
    ],
  },
  'game-over': {
    steps: [
      { frequency: 330, durationMs: 180, type: 'sawtooth', gain: 0.2 },
      { frequency: 220, durationMs: 220, type: 'sawtooth', gain: 0.2 },
      { frequency: 110, durationMs: 320, type: 'sawtooth', gain: 0.2 },
    ],
  },
  victory: {
    steps: [
      { frequency: 523.25, durationMs: 120, type: 'square', gain: 0.22 },
      { frequency: 659.25, durationMs: 120, type: 'square', gain: 0.22 },
      { frequency: 783.99, durationMs: 120, type: 'square', gain: 0.22 },
      { frequency: 1046.5, durationMs: 120, type: 'square', gain: 0.24 },
      { frequency: 1318.5, durationMs: 220, type: 'square', gain: 0.26 },
    ],
  },
};

/**
 * Plays one DX-Ball sound effect by its event name via the shared
 * `AudioManager` singleton. `AudioManager.init(game)` must already have
 * run (see `main.ts`) — every call site here is reached only from
 * gameplay code that only ever runs after that.
 */
export function playDxBallSfx(key: DxBallSfxKey): void {
  try {
    AudioManager.get().play(key, DX_BALL_SFX_TONES[key]);
  } catch {
    // AudioManager missing/unavailable — gameplay continues silently.
  }
}
