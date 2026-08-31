/**
 * assets/dx-ball/audio-manifest.ts
 *
 * DXB-10: The designated place for DX-Ball's *real* audio asset files
 * once any exist. `PreloadScene` loads every entry here via
 * `this.load.audio(entry.key, entry.url)`; `AudioManager` prefers a
 * cached asset over its synthesized fallback the moment one exists.
 *
 * DXB-22: music keys are named below. The array stays empty until real
 * files exist — missing assets are the expected state, and theme beds
 * play through `AudioManager.playMusic`'s synthesized `MusicLoopSpec`
 * fallback (see `entities/dx-ball/audioCues.ts`). Dropping files under
 * these keys later requires no call-site changes:
 *
 *   dx-ball-music-neon-arcade     (synthwave)
 *   dx-ball-music-space           (ambient space)
 *   dx-ball-music-laboratory      (sci-fi laboratory)
 *   dx-ball-music-retro-grid      (chiptune)
 *   dx-ball-music-frozen-core     (cold ambient)
 *   dx-ball-music-inferno         (high-energy arcade)
 */
export interface AudioManifestEntry {
  key: string;
  /** Relative to the site root, matching every other `PreloadScene` load call's convention. */
  url: string;
  category: 'sfx' | 'music';
}

export const DX_BALL_AUDIO_MANIFEST: AudioManifestEntry[] = [];
