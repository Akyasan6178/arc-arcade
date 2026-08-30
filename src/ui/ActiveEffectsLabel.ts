import Phaser from 'phaser';

/**
 * ui/ActiveEffectsLabel.ts
 *
 * DXB-12: A reusable HUD widget listing currently-active timed (or
 * counted) effects. Not DX-Ball-specific — it just renders an array of
 * `{ label, remainingMs? }` lines, centered near the top of the
 * viewport so it sits between the existing corner `ScoreLabel`s without
 * replacing them. Hidden when the list is empty.
 *
 * Mirrors `ScoreLabel`: this class *is* the `Phaser.GameObjects.Text`,
 * sized/positioned from viewport ratios. The caller owns *which* effects
 * are active and for how long; this widget only formats and places them.
 */
export interface ActiveEffectDisplay {
  /** Short name shown on the HUD, e.g. `'FIRE'`. */
  label: string;
  /**
   * Remaining time in milliseconds. Omit (or pass non-finite) for an
   * untimed effect such as Multi Ball, which shows a `detail` suffix
   * instead of a countdown.
   */
  remainingMs?: number;
  /** Optional suffix when there is no countdown, e.g. `'x3'`. */
  detail?: string;
}

export interface ActiveEffectsLabelConfig {
  color?: string;
  /** Vertical offset from the top edge, as a ratio of viewport height. */
  topRatio?: number;
  /** Font size, as a ratio of viewport height. */
  fontSizeRatio?: number;
}

const DEFAULT_CONFIG: Required<ActiveEffectsLabelConfig> = {
  color: '#ffffff',
  topRatio: 0.02,
  fontSizeRatio: 0.022,
};

export class ActiveEffectsLabel extends Phaser.GameObjects.Text {
  private readonly config: Required<ActiveEffectsLabelConfig>;
  private lastText = '';

  constructor(
    scene: Phaser.Scene,
    viewportWidth: number,
    viewportHeight: number,
    config: ActiveEffectsLabelConfig = {},
  ) {
    const resolvedConfig: Required<ActiveEffectsLabelConfig> = { ...DEFAULT_CONFIG, ...config };
    const fontSize = ActiveEffectsLabel.computeFontSize(viewportHeight, resolvedConfig);
    const { x, y } = ActiveEffectsLabel.computePosition(viewportWidth, viewportHeight, resolvedConfig);

    super(scene, x, y, '', {
      fontFamily: 'sans-serif',
      fontSize: `${fontSize}px`,
      color: resolvedConfig.color,
      align: 'center',
    });

    this.config = resolvedConfig;
    this.setOrigin(0.5, 0);
    this.setVisible(false);
    scene.add.existing(this);
  }

  /** Replaces the displayed effect list. No-ops if the formatted text is unchanged. */
  setEffects(effects: readonly ActiveEffectDisplay[]): void {
    const next = ActiveEffectsLabel.formatText(effects);
    if (next === this.lastText) {
      return;
    }

    this.lastText = next;
    this.setText(next);
    this.setVisible(next.length > 0);
  }

  /** Recomputes position and font size for a new viewport size (e.g. on resize). */
  resize(viewportWidth: number, viewportHeight: number): void {
    const { x, y } = ActiveEffectsLabel.computePosition(viewportWidth, viewportHeight, this.config);
    this.setPosition(x, y);
    this.setFontSize(ActiveEffectsLabel.computeFontSize(viewportHeight, this.config));
  }

  private static formatText(effects: readonly ActiveEffectDisplay[]): string {
    return effects
      .map((effect) => {
        if (effect.remainingMs !== undefined && Number.isFinite(effect.remainingMs)) {
          const seconds = Math.max(0, effect.remainingMs / 1000).toFixed(1);
          return `${effect.label} ${seconds}s`;
        }
        return effect.detail ? `${effect.label} ${effect.detail}` : effect.label;
      })
      .join('  ·  ');
  }

  private static computeFontSize(
    viewportHeight: number,
    config: Required<ActiveEffectsLabelConfig>,
  ): number {
    return Math.round(viewportHeight * config.fontSizeRatio);
  }

  private static computePosition(
    viewportWidth: number,
    viewportHeight: number,
    config: Required<ActiveEffectsLabelConfig>,
  ): { x: number; y: number } {
    return {
      x: viewportWidth / 2,
      y: viewportHeight * config.topRatio,
    };
  }
}
