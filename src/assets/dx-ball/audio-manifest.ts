/**
 * assets/dx-ball/audio-manifest.ts
 *
 * DXB-10: The designated place for DX-Ball's *real* audio asset files
 * once any exist — exactly the "e.g. `assets/dx-ball/manifest.ts`" shape
 * this folder's own README already anticipated. `PreloadScene` loads
 * every entry here via `this.load.audio(entry.key, entry.url)`; nothing
 * else needs to change when a real file is added later — `AudioManager`
 * already prefers a real asset over its synthesized fallback the moment
 * one is loaded under the same key (see `systems/AudioManager.ts`'s own
 * doc comment).
 *
 * Intentionally empty for now — no binary audio files exist anywhere in
 * this project yet, the same "no asset pipeline yet" state every other
 * entity's plain-shape visuals have already documented since DXB-01.
 * Every DX-Ball sound effect today plays through `AudioManager`'s
 * synthesized fallback path instead (see `entities/dx-ball/audioCues.ts`).
 *
 * `category` previews the seam a future music system would use: a
 * `'music'` entry, still loaded and cached the same way, just played
 * looped instead of one-shot — not implemented here, per this task's own
 * restrictions.
 */
export interface AudioManifestEntry {
  key: string;
  /** Relative to the site root, matching every other `PreloadScene` load call's convention. */
  url: string;
  category: 'sfx' | 'music';
}

export const DX_BALL_AUDIO_MANIFEST: AudioManifestEntry[] = [];
