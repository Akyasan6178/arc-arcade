import Phaser from 'phaser';

/**
 * ui/ScoreLabel.ts
 *
 * DXB-06: The first shared HUD widget in `ui/` — exactly the "generic
 * ScoreLabel" example already named in this folder's own README. Not
 * DX-Ball-specific: it just displays a `prefix` and a numeric `value` in
 * a corner of the viewport, responsively sized/positioned the same
 * ratio-based way `Paddle`/`Ball`/`BrickGrid` size themselves. Any future
 * game can reuse it for a score, a best score, a lives counter, etc. —
 * only the `prefix` text and `anchor` corner differ per use.
 *
 * Mirrors the rest of the codebase's "entity IS the game object" pattern
 * (`Paddle` extends `Rectangle`, `Ball` extends `Arc`): `ScoreLabel`
 * extends `Phaser.GameObjects.Text` directly rather than wrapping one.
 *
 * DXB-07 adds the two bottom corners as anchor options — exactly the
 * "lives counter" reuse this file's own doc comment already anticipated
 * (`MainScene` uses one for a `Lives: ` label, since both top corners
 * are already taken by the score/best labels).
 */
export type ScoreLabelAnchor = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface ScoreLabelConfig {
  /** Text shown before the numeric value, e.g. `'Score: '`. */
  prefix?: string;
  color?: string;
  /** Which corner of the viewport this label is anchored to. */
  anchor?: ScoreLabelAnchor;
  /** Margin from the anchored edges, as a ratio of the smaller viewport dimension. */
  marginRatio?: number;
  /** Font size, as a ratio of viewport height. */
  fontSizeRatio?: number;
}

const DEFAULT_CONFIG: Required<ScoreLabelConfig> = {
  prefix: 'Score: ',
  color: '#ffffff',
  anchor: 'top-left',
  marginRatio: 0.02,
  fontSizeRatio: 0.035,
};

export class ScoreLabel extends Phaser.GameObjects.Text {
  private readonly config: Required<ScoreLabelConfig>;
  private value = 0;

  constructor(
    scene: Phaser.Scene,
    viewportWidth: number,
    viewportHeight: number,
    config: ScoreLabelConfig = {},
  ) {
    const resolvedConfig: Required<ScoreLabelConfig> = { ...DEFAULT_CONFIG, ...config };
    const fontSize = ScoreLabel.computeFontSize(viewportHeight, resolvedConfig);
    const { x, y } = ScoreLabel.computePosition(viewportWidth, viewportHeight, resolvedConfig);

    super(scene, x, y, ScoreLabel.formatText(resolvedConfig.prefix, 0), {
      fontFamily: 'sans-serif',
      fontSize: `${fontSize}px`,
      color: resolvedConfig.color,
    });

    this.config = resolvedConfig;
    const { originX, originY } = ScoreLabel.computeOrigin(resolvedConfig);
    this.setOrigin(originX, originY);

    scene.add.existing(this);
  }

  /** Updates the displayed numeric value. No-ops if unchanged, avoiding a needless text-texture rebuild. */
  setValue(value: number): void {
    if (value === this.value) {
      return;
    }

    this.value = value;
    this.setText(ScoreLabel.formatText(this.config.prefix, value));
  }

  /** Recomputes position and font size for a new viewport size (e.g. on resize). */
  resize(viewportWidth: number, viewportHeight: number): void {
    const { x, y } = ScoreLabel.computePosition(viewportWidth, viewportHeight, this.config);
    this.setPosition(x, y);
    this.setFontSize(ScoreLabel.computeFontSize(viewportHeight, this.config));
  }

  private static formatText(prefix: string, value: number): string {
    return `${prefix}${value}`;
  }

  private static computeFontSize(
    viewportHeight: number,
    config: Required<ScoreLabelConfig>,
  ): number {
    return Math.round(viewportHeight * config.fontSizeRatio);
  }

  private static computePosition(
    viewportWidth: number,
    viewportHeight: number,
    config: Required<ScoreLabelConfig>,
  ): { x: number; y: number } {
    const margin = Math.min(viewportWidth, viewportHeight) * config.marginRatio;
    const isRight = config.anchor === 'top-right' || config.anchor === 'bottom-right';
    const isBottom = config.anchor === 'bottom-left' || config.anchor === 'bottom-right';

    return {
      x: isRight ? viewportWidth - margin : margin,
      y: isBottom ? viewportHeight - margin : margin,
    };
  }

  /** Origin follows the anchored corner, so the label grows away from the edges it's pinned to. */
  private static computeOrigin(config: Required<ScoreLabelConfig>): {
    originX: number;
    originY: number;
  } {
    const isRight = config.anchor === 'top-right' || config.anchor === 'bottom-right';
    const isBottom = config.anchor === 'bottom-left' || config.anchor === 'bottom-right';

    return { originX: isRight ? 1 : 0, originY: isBottom ? 1 : 0 };
  }
}
