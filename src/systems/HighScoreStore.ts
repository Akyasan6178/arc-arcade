/**
 * systems/HighScoreStore.ts
 *
 * DXB-06: Reusable, game-agnostic best-score persistence, shared across
 * every arcade title built on this foundation (DX-Ball, Pac-Man, Snake,
 * Bomberman, ...) — exactly the "save/score persistence" example already
 * called out in this folder's own README.
 *
 * Wraps `localStorage` behind a tiny static key/value API so a caller
 * (one per game, e.g. `MainScene`) never touches `window.localStorage`
 * directly and never needs its own try/catch for storage-disabled
 * environments (private browsing, disabled storage, non-browser test
 * environments, ...). This file knows nothing about DX-Ball, bricks, or
 * any other game's scoring rules — it only stores a number under a key
 * the caller provides.
 */
export class HighScoreStore {
  /** Reads the best score stored under `key`, or `0` if unset/unavailable/invalid. */
  static get(key: string): number {
    if (typeof window === 'undefined') {
      return 0;
    }

    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) {
        return 0;
      }

      const value = Number(raw);
      return Number.isFinite(value) && value >= 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  /** Persists `value` as the best score stored under `key`. Silently no-ops if storage is unavailable. */
  static set(key: string, value: number): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(key, String(value));
    } catch {
      // Storage unavailable/full/blocked — the best score just won't
      // persist this session; gameplay itself is unaffected.
    }
  }
}
