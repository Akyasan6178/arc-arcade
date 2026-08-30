import Phaser from 'phaser';

/**
 * systems/AudioManager.ts
 *
 * DXB-10: Reusable, game-agnostic audio system shared by every arcade
 * game built on this foundation (DX-Ball, Pac-Man, Snake, Bomberman,
 * ...) — the "Audio manager (music/sfx pooling, mute state)" example
 * already named in this folder's own README. Mirrors `GameViewport`'s
 * singleton shape: `AudioManager.init(game)` once, right after
 * `new Phaser.Game(...)`, then `AudioManager.get()` from anywhere.
 *
 * Every `play(key, fallback)` call tries two playback paths, in order:
 *   1. A real audio asset loaded under `key` via Phaser's own loader/
 *      cache (a per-game manifest in `src/assets/` + `PreloadScene`).
 *      None exist anywhere in this project yet — `src/assets/` is still
 *      empty, per its own README — so this path is dormant today. It
 *      requires no change here the moment a future task adds real
 *      files; this manager already prefers a real asset the instant one
 *      is present under the same key a caller already uses.
 *   2. `fallback`, a short sequence of oscillator steps synthesized
 *      directly via the Web Audio API. This is today's actual playback
 *      path for every DX-Ball sound effect (see
 *      `entities/dx-ball/audioCues.ts`), and doubles as this task's
 *      required "safe fallback if audio assets are missing" — no
 *      asset pipeline exists yet, so every key is currently "missing"
 *      by definition, and every sound effect is still audible because
 *      of this fallback.
 *
 * Every operation here is defensive: a missing/blocked Web Audio API, a
 * suspended `AudioContext` a browser won't resume yet (autoplay policy),
 * or any thrown error from either playback path is caught and
 * swallowed. `play()` never throws — a muted/unsupported/blocked
 * environment simply plays nothing, and gameplay itself is never
 * affected, the same defensive contract `HighScoreStore` already
 * established for `localStorage`.
 *
 * Music is explicitly out of scope for this task (see DXB-10's own
 * Restrictions) but the two-path split above is exactly the seam a
 * future music system would reuse: a `category: 'music'` entry in a
 * future manifest, played through the same real-asset path (looped via
 * Phaser's own sound config), gated by this manager's existing global
 * `enabled` flag. No music-specific code has been added here — this is
 * architecture readiness, not a hidden implementation.
 */
export type ToneWaveform = 'sine' | 'square' | 'triangle' | 'sawtooth';

export interface ToneStep {
  /** Frequency in Hz. */
  frequency: number;
  /** Step duration, in ms. */
  durationMs: number;
  type?: ToneWaveform;
  /** Peak gain for this step, 0..1. */
  gain?: number;
}

/** A short synthesized sound effect: one or more steps played back-to-back. */
export interface ToneSpec {
  steps: ToneStep[];
}

type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext };

const DEFAULT_WAVEFORM: ToneWaveform = 'square';
const DEFAULT_GAIN = 0.2;
/** Fraction of a step's duration spent ramping gain up/down, avoiding an audible click at its start/end. */
const ENVELOPE_RATIO = 0.15;
const ENABLED_STORAGE_KEY = 'arc-arcade-audio-enabled';

export class AudioManager {
  private static instance: AudioManager | undefined;

  private readonly game: Phaser.Game;
  private enabled: boolean;
  private audioContext: AudioContext | undefined;
  /** Set once the Web Audio API is confirmed unavailable/blocked, so every later `play()` short-circuits instead of retrying construction. */
  private synthesisUnavailable = false;

  private constructor(game: Phaser.Game) {
    this.game = game;
    this.enabled = AudioManager.readPersistedEnabled();
  }

  /** Creates the single shared AudioManager instance. Call once, right after `new Phaser.Game(config)`. */
  static init(game: Phaser.Game): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager(game);
    }
    return AudioManager.instance;
  }

  /** Returns the already-initialized instance. Throws if `init` was never called. */
  static get(): AudioManager {
    if (!AudioManager.instance) {
      throw new Error('AudioManager.init(game) must be called before AudioManager.get().');
    }
    return AudioManager.instance;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** Global enable/disable flag for every sound effect (and, in the future, music). Persisted across reloads. */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    AudioManager.writePersistedEnabled(enabled);
  }

  /** Flips the global enable/disable flag. Returns the new state. */
  toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  /**
   * Plays one one-shot sound effect: a real asset loaded under `key`, if
   * one exists in Phaser's audio cache, otherwise `fallback` synthesized
   * directly via the Web Audio API. No-ops silently — never throws — if
   * audio is globally disabled, neither a real asset nor a `fallback` is
   * available, or playback fails for any reason.
   */
  play(key: string, fallback?: ToneSpec): void {
    if (!this.enabled) {
      return;
    }

    try {
      if (this.game.cache.audio.exists(key)) {
        this.game.sound.play(key);
        return;
      }
    } catch {
      // Cache lookup or real-asset playback failed — fall through to
      // the synthesized fallback rather than throwing into gameplay.
    }

    if (fallback) {
      this.playTone(fallback);
    }
  }

  private playTone(spec: ToneSpec): void {
    if (this.synthesisUnavailable) {
      return;
    }

    const context = this.ensureAudioContext();
    if (!context) {
      return;
    }

    try {
      if (context.state === 'suspended') {
        // Browsers block audio until a user gesture; opportunistically
        // resume on every play attempt rather than requiring a caller to
        // wire up its own gesture-unlock listener. A rejected promise
        // here (still blocked) is expected and harmless.
        void context.resume().catch(() => undefined);
      }

      let startTime = context.currentTime;
      for (const step of spec.steps) {
        startTime = AudioManager.scheduleStep(context, step, startTime);
      }
    } catch {
      // A synthesis failure never breaks gameplay — just skip this one
      // sound effect, mirroring the real-asset path's own try/catch above.
    }
  }

  private static scheduleStep(context: AudioContext, step: ToneStep, startTime: number): number {
    const durationSeconds = step.durationMs / 1000;
    const attackSeconds = durationSeconds * ENVELOPE_RATIO;
    const peakGain = step.gain ?? DEFAULT_GAIN;

    const oscillator = context.createOscillator();
    oscillator.type = step.type ?? DEFAULT_WAVEFORM;
    oscillator.frequency.setValueAtTime(step.frequency, startTime);

    const gainNode = context.createGain();
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(peakGain, startTime + attackSeconds);
    gainNode.gain.linearRampToValueAtTime(0, startTime + durationSeconds);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + durationSeconds);

    return startTime + durationSeconds;
  }

  /** Lazily creates the shared `AudioContext` on first real use (not at `init()` time), minimizing browser autoplay-policy warnings for a context nothing has tried to use yet. */
  private ensureAudioContext(): AudioContext | undefined {
    if (this.audioContext) {
      return this.audioContext;
    }

    try {
      const AudioContextClass: typeof AudioContext | undefined =
        window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;

      if (!AudioContextClass) {
        this.synthesisUnavailable = true;
        return undefined;
      }

      this.audioContext = new AudioContextClass();
      return this.audioContext;
    } catch {
      this.synthesisUnavailable = true;
      return undefined;
    }
  }

  private static readPersistedEnabled(): boolean {
    if (typeof window === 'undefined') {
      return true;
    }

    try {
      const raw = window.localStorage.getItem(ENABLED_STORAGE_KEY);
      // Unset (never toggled before) defaults to enabled; only an
      // explicit prior "disabled" should stay disabled across reloads.
      return raw === null ? true : raw === '1';
    } catch {
      return true;
    }
  }

  private static writePersistedEnabled(enabled: boolean): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(ENABLED_STORAGE_KEY, enabled ? '1' : '0');
    } catch {
      // Storage unavailable/full/blocked — the preference just won't
      // persist this session; gameplay itself is unaffected.
    }
  }
}
