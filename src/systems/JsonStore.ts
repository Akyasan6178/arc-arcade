/**
 * systems/JsonStore.ts
 *
 * DXB-16: Game-agnostic JSON persistence. Same localStorage wrapper
 * shape as `HighScoreStore` / `ThemeStore`, but for structured blobs
 * the caller owns. Knows nothing about achievements, unlocks, or any
 * game's progress rules — it only stores JSON under a key.
 */
export class JsonStore {
  /** Reads and parses JSON stored under `key`, or `null` if unset/unavailable/invalid. */
  static get<T>(key: string): T | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) {
        return null;
      }

      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /** Persists `value` as JSON under `key`. Silently no-ops if storage is unavailable. */
  static set(key: string, value: unknown): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage unavailable/full/blocked — progress just won't persist
      // this session; gameplay itself is unaffected.
    }
  }
}
