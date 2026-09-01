import { AudioManager, type MusicLoopSpec, type ToneSpec } from '@systems/AudioManager';
import type { ThemeId } from '@entities/dx-ball/Theme';

/**
 * entities/dx-ball/audioCues.ts
 *
 * DXB-10: DX-Ball's own sound-effect vocabulary — the "which key means
 * what, and what does it sound like" data — kept out of `systems/
 * AudioManager.ts` the same way `levels.ts` keeps level layouts out of
 * `BrickGrid`/`Ball`.
 *
 * DXB-22: theme background-music beds live here too. Real files (when
 * added under the keys in `audio-manifest.ts`) are preferred; these
 * synthesized loops are the required safe fallback. Mute still goes
 * through `AudioManager`'s global enabled flag.
 */
export type DxBallSfxKey =
  | 'paddle-hit'
  | 'brick-break'
  | 'brick-hit'
  | 'powerup-spawn'
  | 'powerup-collect'
  | 'powerup-celebrate'
  | 'laser-fire'
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
  'brick-hit': {
    steps: [{ frequency: 310, durationMs: 45, type: 'triangle', gain: 0.16 }],
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
  'powerup-celebrate': {
    steps: [
      { frequency: 659.25, durationMs: 70, type: 'square', gain: 0.18 },
      { frequency: 783.99, durationMs: 80, type: 'square', gain: 0.2 },
      { frequency: 1046.5, durationMs: 90, type: 'square', gain: 0.22 },
      { frequency: 1318.5, durationMs: 140, type: 'sine', gain: 0.2 },
    ],
  },
  'laser-fire': {
    steps: [
      { frequency: 880, durationMs: 40, type: 'square', gain: 0.14 },
      { frequency: 1320, durationMs: 50, type: 'square', gain: 0.12 },
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

/** Cache keys a future real-file drop would use; Preload already loads any matching manifest entry. */
export const DX_BALL_THEME_MUSIC_KEYS: Record<ThemeId, string> = {
  'neon-arcade': 'dx-ball-music-neon-arcade',
  space: 'dx-ball-music-space',
  laboratory: 'dx-ball-music-laboratory',
  'retro-grid': 'dx-ball-music-retro-grid',
  'frozen-core': 'dx-ball-music-frozen-core',
  inferno: 'dx-ball-music-inferno',
};

const DX_BALL_THEME_MUSIC: Record<ThemeId, MusicLoopSpec> = {
  'neon-arcade': {
    duration: 4,
    voices: [
      {
        type: 'sawtooth',
        gain: 0.1,
        notes: [
          { at: 0, duration: 0.48, frequency: 110 },
          { at: 0.5, duration: 0.48, frequency: 110 },
          { at: 1, duration: 0.48, frequency: 130.81 },
          { at: 1.5, duration: 0.48, frequency: 82.41 },
          { at: 2, duration: 0.48, frequency: 110 },
          { at: 2.5, duration: 0.48, frequency: 98 },
          { at: 3, duration: 0.48, frequency: 146.83 },
          { at: 3.5, duration: 0.48, frequency: 82.41 },
        ],
      },
      {
        type: 'triangle',
        gain: 0.055,
        notes: [
          { at: 0, duration: 1.95, frequency: 220 },
          { at: 2, duration: 1.95, frequency: 261.63 },
        ],
      },
      {
        type: 'square',
        gain: 0.03,
        notes: [
          { at: 0, duration: 0.12, frequency: 440 },
          { at: 0.25, duration: 0.12, frequency: 554.37 },
          { at: 0.5, duration: 0.12, frequency: 659.25 },
          { at: 0.75, duration: 0.18, frequency: 880 },
          { at: 2, duration: 0.12, frequency: 440 },
          { at: 2.25, duration: 0.12, frequency: 659.25 },
          { at: 2.5, duration: 0.12, frequency: 554.37 },
          { at: 2.75, duration: 0.22, frequency: 440 },
        ],
      },
    ],
  },
  space: {
    duration: 8,
    voices: [
      {
        type: 'sine',
        gain: 0.07,
        notes: [
          { at: 0, duration: 7.9, frequency: 55 },
          { at: 0, duration: 7.9, frequency: 82.41 },
        ],
      },
      {
        type: 'sine',
        gain: 0.028,
        notes: [
          { at: 1.6, duration: 1.4, frequency: 329.63 },
          { at: 4.8, duration: 1.8, frequency: 392 },
          { at: 6.4, duration: 0.6, frequency: 523.25 },
        ],
      },
      {
        type: 'triangle',
        gain: 0.018,
        notes: [
          { at: 2.4, duration: 0.25, frequency: 1046.5 },
          { at: 5.7, duration: 0.3, frequency: 1174.7 },
        ],
      },
    ],
  },
  laboratory: {
    duration: 4,
    voices: [
      {
        type: 'sine',
        gain: 0.06,
        notes: [{ at: 0, duration: 3.95, frequency: 65.41 }],
      },
      {
        type: 'triangle',
        gain: 0.05,
        notes: [
          { at: 0, duration: 0.18, frequency: 174.61 },
          { at: 0.5, duration: 0.18, frequency: 174.61 },
          { at: 1, duration: 0.18, frequency: 196 },
          { at: 1.5, duration: 0.18, frequency: 174.61 },
          { at: 2, duration: 0.18, frequency: 174.61 },
          { at: 2.5, duration: 0.18, frequency: 220 },
          { at: 3, duration: 0.18, frequency: 196 },
          { at: 3.5, duration: 0.18, frequency: 174.61 },
        ],
      },
      {
        type: 'square',
        gain: 0.022,
        notes: [
          { at: 1.15, duration: 0.08, frequency: 698.46 },
          { at: 1.28, duration: 0.08, frequency: 783.99 },
          { at: 1.41, duration: 0.12, frequency: 1046.5 },
          { at: 3.1, duration: 0.08, frequency: 659.25 },
          { at: 3.22, duration: 0.16, frequency: 880 },
        ],
      },
    ],
  },
  'retro-grid': {
    duration: 2,
    voices: [
      {
        type: 'triangle',
        gain: 0.09,
        notes: [
          { at: 0, duration: 0.22, frequency: 130.81 },
          { at: 0.25, duration: 0.22, frequency: 98 },
          { at: 0.5, duration: 0.22, frequency: 130.81 },
          { at: 0.75, duration: 0.22, frequency: 98 },
          { at: 1, duration: 0.22, frequency: 146.83 },
          { at: 1.25, duration: 0.22, frequency: 98 },
          { at: 1.5, duration: 0.22, frequency: 130.81 },
          { at: 1.75, duration: 0.22, frequency: 82.41 },
        ],
      },
      {
        type: 'square',
        gain: 0.045,
        notes: [
          { at: 0, duration: 0.12, frequency: 523.25 },
          { at: 0.25, duration: 0.12, frequency: 659.25 },
          { at: 0.5, duration: 0.12, frequency: 783.99 },
          { at: 0.75, duration: 0.18, frequency: 1046.5 },
          { at: 1, duration: 0.12, frequency: 783.99 },
          { at: 1.25, duration: 0.12, frequency: 659.25 },
          { at: 1.5, duration: 0.12, frequency: 587.33 },
          { at: 1.75, duration: 0.2, frequency: 523.25 },
        ],
      },
    ],
  },
  'frozen-core': {
    duration: 6,
    voices: [
      {
        type: 'sine',
        gain: 0.065,
        notes: [
          { at: 0, duration: 5.9, frequency: 98 },
          { at: 0, duration: 5.9, frequency: 146.83 },
        ],
      },
      {
        type: 'triangle',
        gain: 0.04,
        notes: [
          { at: 0, duration: 2.9, frequency: 196 },
          { at: 3, duration: 2.9, frequency: 233.08 },
        ],
      },
      {
        type: 'sine',
        gain: 0.02,
        notes: [
          { at: 1.4, duration: 0.35, frequency: 1174.7 },
          { at: 3.6, duration: 0.28, frequency: 1396.9 },
          { at: 5.1, duration: 0.4, frequency: 1046.5 },
        ],
      },
    ],
  },
  inferno: {
    duration: 2.4,
    voices: [
      {
        type: 'sawtooth',
        gain: 0.11,
        notes: [
          { at: 0, duration: 0.28, frequency: 73.42 },
          { at: 0.3, duration: 0.28, frequency: 92.5 },
          { at: 0.6, duration: 0.28, frequency: 110 },
          { at: 0.9, duration: 0.28, frequency: 73.42 },
          { at: 1.2, duration: 0.28, frequency: 98 },
          { at: 1.5, duration: 0.28, frequency: 123.47 },
          { at: 1.8, duration: 0.28, frequency: 110 },
          { at: 2.1, duration: 0.28, frequency: 82.41 },
        ],
      },
      {
        type: 'square',
        gain: 0.04,
        notes: [
          { at: 0, duration: 0.14, frequency: 392 },
          { at: 0.3, duration: 0.14, frequency: 493.88 },
          { at: 0.6, duration: 0.2, frequency: 587.33 },
          { at: 1.2, duration: 0.14, frequency: 440 },
          { at: 1.5, duration: 0.14, frequency: 523.25 },
          { at: 1.8, duration: 0.22, frequency: 659.25 },
        ],
      },
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

/**
 * Starts (or continues) the looping bed for a theme. Same-key recalls
 * are a no-op so Hub → Theme Select → a run do not restart the track.
 */
export function playDxBallThemeMusic(themeId: ThemeId): void {
  try {
    AudioManager.get().playMusic(DX_BALL_THEME_MUSIC_KEYS[themeId], DX_BALL_THEME_MUSIC[themeId]);
  } catch {
    // AudioManager missing/unavailable — menus and gameplay continue silently.
  }
}
