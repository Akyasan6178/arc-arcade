import Phaser from 'phaser';

/**
 * systems/AudioManager.ts
 *
 * DXB-10: Reusable, game-agnostic audio system shared by every arcade
 * game built on this foundation. Mirrors `GameViewport`'s singleton
 * shape: `AudioManager.init(game)` once, then `AudioManager.get()`.
 *
 * DXB-22: adds a looping music path (`playMusic` / `stopMusic`) on the
 * same two-path seam as one-shot SFX — a Phaser-cached asset under
 * `key` if one exists, otherwise a synthesized `MusicLoopSpec`. Music
 * and SFX use separate internal volume buses; the existing global
 * `enabled` mute flag still gates both and stops music immediately.
 *
 * DXB-25: user-facing `setSfxVolume` / `setMusicVolume` (0..1, persisted)
 * multiply those buses. Mute is unchanged. No new audio architecture.
 *
 * DXB-26: independent `musicEnabled` / `sfxEnabled` flags so Pause and
 * Settings can mute one bus without visiting the other. Global `enabled`
 * still gates both and remains the persisted M-key mute.
 *
 * Every operation is defensive and never throws.
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

export interface MusicNote {
  /** Start time within the loop, in seconds. */
  at: number;
  /** Note length, in seconds. */
  duration: number;
  frequency: number;
}

export interface MusicVoice {
  type: ToneWaveform;
  /** Peak gain for this voice before the music-bus multiplier. */
  gain: number;
  notes: MusicNote[];
}

/** One looping synthesized bed, used when no real music asset is cached. */
export interface MusicLoopSpec {
  /** Loop length, in seconds. */
  duration: number;
  voices: MusicVoice[];
}

type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext };

const DEFAULT_WAVEFORM: ToneWaveform = 'square';
const DEFAULT_GAIN = 0.2;
/** Fraction of a step's duration spent ramping gain up/down, avoiding an audible click at its start/end. */
const ENVELOPE_RATIO = 0.15;
const ENABLED_STORAGE_KEY = 'arc-arcade-audio-enabled';
const MUSIC_ENABLED_STORAGE_KEY = 'arc-arcade-music-enabled';
const SFX_ENABLED_STORAGE_KEY = 'arc-arcade-sfx-enabled';
const SFX_VOLUME_STORAGE_KEY = 'arc-arcade-sfx-volume';
const MUSIC_VOLUME_STORAGE_KEY = 'arc-arcade-music-volume';
/** Internal music bus, quieter so beds sit under gameplay cues at user 100%. */
const MUSIC_BUS = 0.48;
const MUSIC_LOOKAHEAD_SECONDS = 0.85;
const MUSIC_SCHEDULE_MS = 200;

export class AudioManager {
  private static instance: AudioManager | undefined;

  private readonly game: Phaser.Game;
  private enabled: boolean;
  /** DXB-26: Music bed on/off, independent of SFX. Global mute still wins. */
  private musicEnabled: boolean;
  /** DXB-26: SFX on/off, independent of music. Global mute still wins. */
  private sfxEnabled: boolean;
  /** User-facing SFX volume, 0..1. Mute is a separate flag. */
  private sfxVolume: number;
  /** User-facing music volume, 0..1. Multiplied by MUSIC_BUS at mix time. */
  private musicVolume: number;
  private audioContext: AudioContext | undefined;
  /** Set once the Web Audio API is confirmed unavailable/blocked, so every later `play()` short-circuits instead of retrying construction. */
  private synthesisUnavailable = false;

  private musicKey: string | undefined;
  private musicFallback: MusicLoopSpec | undefined;
  private phaserMusic: Phaser.Sound.BaseSound | undefined;
  private musicTimer: ReturnType<typeof setInterval> | undefined;
  private musicOscillators: OscillatorNode[] = [];
  private musicGainNode: GainNode | undefined;
  private musicNextLoopAt = 0;
  private readonly musicTick = (): void => {
    this.scheduleMusicAhead();
  };

  private constructor(game: Phaser.Game) {
    this.game = game;
    this.enabled = AudioManager.readPersistedEnabled();
    this.musicEnabled = AudioManager.readPersistedFlag(MUSIC_ENABLED_STORAGE_KEY, true);
    this.sfxEnabled = AudioManager.readPersistedFlag(SFX_ENABLED_STORAGE_KEY, true);
    this.sfxVolume = AudioManager.readPersistedVolume(SFX_VOLUME_STORAGE_KEY, 1);
    this.musicVolume = AudioManager.readPersistedVolume(MUSIC_VOLUME_STORAGE_KEY, 1);
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

  isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  isSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  getSfxVolume(): number {
    return this.sfxVolume;
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }

  /** User-facing SFX volume, 0..1. Mute still gates playback. */
  setSfxVolume(volume: number): void {
    this.sfxVolume = AudioManager.clampVolume(volume);
    AudioManager.writePersistedVolume(SFX_VOLUME_STORAGE_KEY, this.sfxVolume);
  }

  /** User-facing music volume, 0..1. Applied to the live bed immediately. */
  setMusicVolume(volume: number): void {
    this.musicVolume = AudioManager.clampVolume(volume);
    AudioManager.writePersistedVolume(MUSIC_VOLUME_STORAGE_KEY, this.musicVolume);
    this.applyLiveMusicVolume();
  }

  /** Music bed on/off. Global mute still silences everything. */
  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    AudioManager.writePersistedFlag(MUSIC_ENABLED_STORAGE_KEY, enabled);
    if (!enabled) {
      this.haltMusicPlayback();
      return;
    }
    this.resumeMusicIfNeeded();
  }

  /** SFX on/off. Global mute still silences everything. */
  setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
    AudioManager.writePersistedFlag(SFX_ENABLED_STORAGE_KEY, enabled);
  }

  toggleMusic(): boolean {
    this.setMusicEnabled(!this.musicEnabled);
    return this.musicEnabled;
  }

  toggleSfx(): boolean {
    this.setSfxEnabled(!this.sfxEnabled);
    return this.sfxEnabled;
  }

  /** Global enable/disable flag for every sound effect and music bed. Persisted across reloads. */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    AudioManager.writePersistedEnabled(enabled);
    if (!enabled) {
      this.haltMusicPlayback();
      return;
    }
    this.resumeMusicIfNeeded();
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
    if (!this.enabled || !this.sfxEnabled) {
      return;
    }

    try {
      if (this.game.cache.audio.exists(key)) {
        this.game.sound.play(key, { volume: this.sfxVolume });
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

  /**
   * Starts a looping music bed. Prefers a Phaser-cached asset under
   * `key` (looped); if that asset is missing or fails, synthesizes
   * `fallback`. Calling again with the same key while it is already
   * the current bed is a no-op so scene transitions do not restart
   * the track. Mute still wins: the key is remembered and resumes
   * when audio is re-enabled.
   */
  playMusic(key: string, fallback?: MusicLoopSpec): void {
    if (this.musicKey === key && this.isMusicAudible()) {
      return;
    }

    this.haltMusicPlayback();
    this.musicKey = key;
    this.musicFallback = fallback;

    if (!this.enabled || !this.musicEnabled) {
      return;
    }

    this.startMusicPlayback();
  }

  /** Stops the current bed and forgets its key. Mute uses halt, not this. */
  stopMusic(): void {
    this.haltMusicPlayback();
    this.musicKey = undefined;
    this.musicFallback = undefined;
  }

  private isMusicAudible(): boolean {
    if (!this.enabled || !this.musicEnabled || !this.musicKey) {
      return false;
    }
    if (this.phaserMusic) {
      return this.phaserMusic.isPlaying;
    }
    return this.musicTimer !== undefined || this.musicOscillators.length > 0;
  }

  private startMusicPlayback(): void {
    if (!this.enabled || !this.musicEnabled || !this.musicKey) {
      return;
    }

    try {
      if (this.game.cache.audio.exists(this.musicKey)) {
        const sound = this.game.sound.add(this.musicKey, {
          loop: true,
          volume: this.effectiveMusicVolume(),
        });
        sound.play();
        this.phaserMusic = sound;
        return;
      }
    } catch {
      // Missing/broken real asset — fall through to the synthesized bed.
    }

    if (!this.musicFallback) {
      return;
    }

    const context = this.ensureAudioContext();
    if (!context) {
      return;
    }

    try {
      if (context.state === 'suspended') {
        void context.resume().catch(() => undefined);
      }
      this.ensureMusicGain(context);
      this.musicNextLoopAt = context.currentTime + 0.03;
      this.scheduleMusicAhead();
      this.musicTimer = setInterval(this.musicTick, MUSIC_SCHEDULE_MS);
    } catch {
      this.haltMusicPlayback();
    }
  }

  private resumeMusicIfNeeded(): void {
    if (!this.musicKey || !this.musicEnabled) {
      return;
    }
    this.startMusicPlayback();
  }

  private haltMusicPlayback(): void {
    if (this.musicTimer !== undefined) {
      clearInterval(this.musicTimer);
      this.musicTimer = undefined;
    }

    if (this.phaserMusic) {
      try {
        this.phaserMusic.stop();
      } catch {
        // Phaser sound already gone — ignore.
      }
      this.phaserMusic = undefined;
    }

    for (const oscillator of this.musicOscillators) {
      try {
        oscillator.stop();
      } catch {
        // Already stopped.
      }
    }
    this.musicOscillators = [];

    if (this.musicGainNode) {
      try {
        this.musicGainNode.disconnect();
      } catch {
        // Already disconnected.
      }
      this.musicGainNode = undefined;
    }
  }

  private ensureMusicGain(context: AudioContext): GainNode | undefined {
    if (this.musicGainNode) {
      return this.musicGainNode;
    }

    try {
      const gain = context.createGain();
      gain.gain.value = this.effectiveMusicVolume();
      gain.connect(context.destination);
      this.musicGainNode = gain;
      return gain;
    } catch {
      return undefined;
    }
  }

  private scheduleMusicAhead(): void {
    if (!this.enabled || !this.musicEnabled || !this.musicFallback) {
      return;
    }

    const context = this.ensureAudioContext();
    if (!context) {
      return;
    }

    const gain = this.ensureMusicGain(context);
    if (!gain) {
      return;
    }

    try {
      if (context.state === 'suspended') {
        void context.resume().catch(() => undefined);
      }

      const horizon = context.currentTime + MUSIC_LOOKAHEAD_SECONDS;
      while (this.musicNextLoopAt < horizon) {
        this.scheduleMusicLoop(context, gain, this.musicFallback, this.musicNextLoopAt);
        this.musicNextLoopAt += this.musicFallback.duration;
      }
    } catch {
      // A scheduling failure never breaks gameplay; the next tick retries.
    }
  }

  private scheduleMusicLoop(
    context: AudioContext,
    bus: GainNode,
    spec: MusicLoopSpec,
    loopStart: number,
  ): void {
    for (const voice of spec.voices) {
      for (const note of voice.notes) {
        this.scheduleMusicNote(context, bus, voice, note, loopStart);
      }
    }
  }

  private scheduleMusicNote(
    context: AudioContext,
    bus: GainNode,
    voice: MusicVoice,
    note: MusicNote,
    loopStart: number,
  ): void {
    const startTime = loopStart + note.at;
    if (startTime < context.currentTime - 0.02) {
      return;
    }

    const oscillator = context.createOscillator();
    oscillator.type = voice.type;
    oscillator.frequency.setValueAtTime(note.frequency, startTime);

    const envelope = context.createGain();
    const attack = Math.min(0.04, note.duration * ENVELOPE_RATIO);
    envelope.gain.setValueAtTime(0, startTime);
    envelope.gain.linearRampToValueAtTime(voice.gain, startTime + attack);
    envelope.gain.linearRampToValueAtTime(0, startTime + note.duration);

    oscillator.connect(envelope);
    envelope.connect(bus);
    oscillator.start(startTime);
    oscillator.stop(startTime + note.duration);

    this.musicOscillators.push(oscillator);
    oscillator.addEventListener('ended', () => {
      const index = this.musicOscillators.indexOf(oscillator);
      if (index >= 0) {
        this.musicOscillators.splice(index, 1);
      }
    });
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
        startTime = AudioManager.scheduleStep(context, step, startTime, this.sfxVolume);
      }
    } catch {
      // A synthesis failure never breaks gameplay — just skip this one
      // sound effect, mirroring the real-asset path's own try/catch above.
    }
  }

  private effectiveMusicVolume(): number {
    return MUSIC_BUS * this.musicVolume;
  }

  private applyLiveMusicVolume(): void {
    const volume = this.effectiveMusicVolume();
    if (this.phaserMusic) {
      try {
        const withVolume = this.phaserMusic as Phaser.Sound.BaseSound & { setVolume?: (value: number) => void };
        withVolume.setVolume?.(volume);
      } catch {
        // Phaser sound already gone — ignore.
      }
    }
    if (this.musicGainNode) {
      try {
        this.musicGainNode.gain.value = volume;
      } catch {
        // Gain node already disconnected — ignore.
      }
    }
  }

  private static scheduleStep(
    context: AudioContext,
    step: ToneStep,
    startTime: number,
    volume: number,
  ): number {
    const durationSeconds = step.durationMs / 1000;
    const attackSeconds = durationSeconds * ENVELOPE_RATIO;
    const peakGain = (step.gain ?? DEFAULT_GAIN) * volume;

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
    return AudioManager.readPersistedFlag(ENABLED_STORAGE_KEY, true);
  }

  private static readPersistedFlag(key: string, fallback: boolean): boolean {
    if (typeof window === 'undefined') {
      return fallback;
    }

    try {
      const raw = window.localStorage.getItem(key);
      // Unset defaults to `fallback`; only an explicit prior "disabled"
      // should stay disabled across reloads.
      return raw === null ? fallback : raw === '1';
    } catch {
      return fallback;
    }
  }

  private static writePersistedFlag(key: string, enabled: boolean): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(key, enabled ? '1' : '0');
    } catch {
      // Storage unavailable — preference won't persist this session.
    }
  }

  private static clampVolume(volume: number): number {
    if (!Number.isFinite(volume)) {
      return 1;
    }
    return Math.max(0, Math.min(1, volume));
  }

  private static readPersistedVolume(key: string, fallback: number): number {
    if (typeof window === 'undefined') {
      return fallback;
    }

    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) {
        return fallback;
      }
      return AudioManager.clampVolume(Number.parseFloat(raw));
    } catch {
      return fallback;
    }
  }

  private static writePersistedVolume(key: string, volume: number): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(key, String(volume));
    } catch {
      // Storage unavailable — preference won't persist this session.
    }
  }

  private static writePersistedEnabled(enabled: boolean): void {
    AudioManager.writePersistedFlag(ENABLED_STORAGE_KEY, enabled);
  }
}
