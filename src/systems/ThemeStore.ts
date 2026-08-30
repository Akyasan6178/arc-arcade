/**
 * systems/ThemeStore.ts
 *
 * DXB-15: Game-agnostic string persistence for a selected theme id.
 * Same localStorage wrapper shape as `HighScoreStore`, but for strings
 * rather than numbers — the caller picks the key and owns what a valid
 * id is. Knows nothing about DX-Ball palettes or any theme's colors.
 */
export class ThemeStore {
  /** Reads the string stored under `key`, or `null` if unset/unavailable. */
  static get(key: string): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  /** Persists `value` under `key`. Silently no-ops if storage is unavailable. */
  static set(key: string, value: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Storage unavailable/full/blocked — the choice just won't persist.
    }
  }
}
