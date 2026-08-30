import Phaser from 'phaser';

/**
 * systems/GameViewport.ts
 *
 * ARC-01: Reusable, game-agnostic responsive-viewport service shared by
 * every arcade game built on this foundation (DX-Ball, Pac-Man, Snake,
 * Bomberman, ...).
 *
 * Wraps Phaser's Scale Manager plus a couple of browser-only responsive
 * concerns (orientation, device safe-area insets for notches/home
 * indicators) into one always-up-to-date snapshot that any scene, system,
 * or entity can read without caring how the browser window is sized.
 *
 * Usage:
 *   const viewport = GameViewport.init(game); // once, right after `new Phaser.Game(...)`
 *   // ...later, from any scene:
 *   const viewport = GameViewport.get();
 *   viewport.width / viewport.height
 *   viewport.centerX / viewport.centerY
 *   viewport.isPortrait / viewport.isLandscape
 *   viewport.safeArea.top / .right / .bottom / .left
 *   const unsubscribe = viewport.onChange((snapshot) => { ... });
 */

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ViewportSnapshot {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  isPortrait: boolean;
  isLandscape: boolean;
  safeArea: SafeAreaInsets;
}

export type ViewportChangeListener = (snapshot: ViewportSnapshot) => void;

export class GameViewport {
  private static instance: GameViewport | undefined;

  private readonly game: Phaser.Game;
  private readonly listeners = new Set<ViewportChangeListener>();
  private snapshot: ViewportSnapshot;
  private readonly handleChange = (): void => this.refresh();

  private constructor(game: Phaser.Game) {
    this.game = game;
    this.snapshot = this.computeSnapshot();

    // Phaser's Scale Manager already tracks browser window resizes and
    // orientation changes for the canvas itself (requirements #2 and #3).
    this.game.scale.on(Phaser.Scale.Events.RESIZE, this.handleChange);
    this.game.scale.on(Phaser.Scale.Events.ORIENTATION_CHANGE, this.handleChange);

    // Extra browser-level listeners as a safety net for cases the Scale
    // Manager doesn't cover directly, e.g. safe-area insets changing
    // (rotating a notched device, or the on-screen keyboard/visualViewport
    // shifting) without necessarily firing a Scale Manager resize event.
    window.addEventListener('resize', this.handleChange);
    window.addEventListener('orientationchange', this.handleChange);
    window.visualViewport?.addEventListener('resize', this.handleChange);
  }

  /** Creates the single shared GameViewport instance. Call once, right after `new Phaser.Game(config)`. */
  static init(game: Phaser.Game): GameViewport {
    if (!GameViewport.instance) {
      GameViewport.instance = new GameViewport(game);
    }
    return GameViewport.instance;
  }

  /** Returns the already-initialized instance. Throws if `init` was never called. */
  static get(): GameViewport {
    if (!GameViewport.instance) {
      throw new Error('GameViewport.init(game) must be called before GameViewport.get().');
    }
    return GameViewport.instance;
  }

  get width(): number {
    return this.snapshot.width;
  }

  get height(): number {
    return this.snapshot.height;
  }

  get centerX(): number {
    return this.snapshot.centerX;
  }

  get centerY(): number {
    return this.snapshot.centerY;
  }

  get isPortrait(): boolean {
    return this.snapshot.isPortrait;
  }

  get isLandscape(): boolean {
    return this.snapshot.isLandscape;
  }

  get safeArea(): SafeAreaInsets {
    return this.snapshot.safeArea;
  }

  /** Full immutable snapshot, useful when a consumer wants every value at once. */
  getSnapshot(): ViewportSnapshot {
    return this.snapshot;
  }

  /** Subscribes to viewport changes (resize/orientation). Returns an unsubscribe function. */
  onChange(listener: ViewportChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Forces a recomputation and notifies listeners. Rarely needed manually — resize/orientation trigger it automatically. */
  refresh(): void {
    this.snapshot = this.computeSnapshot();
    this.listeners.forEach((listener) => listener(this.snapshot));
  }

  /** Tears down all listeners. Intended for tests/hot-reload, not normal gameplay use. */
  destroy(): void {
    this.game.scale.off(Phaser.Scale.Events.RESIZE, this.handleChange);
    this.game.scale.off(Phaser.Scale.Events.ORIENTATION_CHANGE, this.handleChange);
    window.removeEventListener('resize', this.handleChange);
    window.removeEventListener('orientationchange', this.handleChange);
    window.visualViewport?.removeEventListener('resize', this.handleChange);
    this.listeners.clear();
    GameViewport.instance = undefined;
  }

  private computeSnapshot(): ViewportSnapshot {
    const { width, height } = this.game.scale.gameSize;
    const isPortrait = this.game.scale.isPortrait;

    return {
      width,
      height,
      centerX: width / 2,
      centerY: height / 2,
      isPortrait,
      isLandscape: !isPortrait,
      safeArea: GameViewport.readSafeAreaInsets(),
    };
  }

  /**
   * Reads CSS env(safe-area-inset-*) values (notches, home indicators on
   * modern mobile devices) via a throwaway probe element, since these
   * values aren't otherwise exposed to JavaScript. Requires the page's
   * viewport meta tag to include `viewport-fit=cover` (see index.html) —
   * without it every inset is always 0, which is still a safe default.
   */
  private static readSafeAreaInsets(): SafeAreaInsets {
    if (typeof document === 'undefined') {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    const probe = document.createElement('div');
    probe.style.position = 'fixed';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    probe.style.top = 'env(safe-area-inset-top, 0px)';
    probe.style.right = 'env(safe-area-inset-right, 0px)';
    probe.style.bottom = 'env(safe-area-inset-bottom, 0px)';
    probe.style.left = 'env(safe-area-inset-left, 0px)';
    document.body.appendChild(probe);

    const computed = getComputedStyle(probe);
    const insets: SafeAreaInsets = {
      top: parseFloat(computed.top) || 0,
      right: parseFloat(computed.right) || 0,
      bottom: parseFloat(computed.bottom) || 0,
      left: parseFloat(computed.left) || 0,
    };

    document.body.removeChild(probe);
    return insets;
  }
}
