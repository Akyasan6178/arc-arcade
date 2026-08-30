import Phaser from 'phaser';

/**
 * ui/ModeLabel.ts
 *
 * DXB-14: A reusable top-center HUD widget showing the active mode name
 * and an optional detail (e.g. a Time Attack clock). Not DX-Ball-
 * specific — it just places `label` + optional `detail` under the top
 * edge, leaving room for `ActiveEffectsLabel` below it. Hidden only if
 * the caller never sets a label (the gameplay scene always does).
 *
 * Mirrors `ScoreLabel` / `ActiveEffectsLabel`: this class *is* the
 * `Phaser.GameObjects.Text`, sized/positioned from viewport ratios.
 */

export interface ModeLabelConfig {
  color?: string;
  /** Vertical offset from the top edge, as a ratio of viewport height. */
  topRatio?: number;
  /** Font size, as a ratio of viewport height. */
  fontSizeRatio?: number;
}

const HUD_FONT_FAMILY = 'Trebuchet MS, Segoe UI, sans-serif';
const HUD_DEPTH = 20;

const DEFAULT_CONFIG: Required<ModeLabelConfig> = {
  color: '#c4b5fd',
  topRatio: 0.016,
  fontSizeRatio: 0.028,
};

export class ModeLabel extends Phaser.GameObjects.Text {
  private readonly config: Required<ModeLabelConfig>;
  private lastText = '';

  constructor(
    scene: Phaser.Scene,
    viewportWidth: number,
    viewportHeight: number,
    config: ModeLabelConfig = {},
  ) {
    const resolvedConfig: Required<ModeLabelConfig> = { ...DEFAULT_CONFIG, ...config };
    const fontSize = ModeLabel.computeFontSize(viewportHeight, resolvedConfig);
    const { x, y } = ModeLabel.computePosition(viewportWidth, viewportHeight, resolvedConfig);

    super(scene, x, y, '', {
      fontFamily: HUD_FONT_FAMILY,
      fontSize: `${fontSize}px`,
      color: resolvedConfig.color,
      fontStyle: 'bold',
      align: 'center',
      stroke: '#0b1320',
      strokeThickness: 4,
    });

    this.config = resolvedConfig;
    this.setOrigin(0.5, 0);
    this.setShadow(1, 2, '#000000', 3, true, true);
    this.setDepth(HUD_DEPTH);
    scene.add.existing(this);
  }

  /** Replaces the displayed mode line. No-ops if the formatted text is unchanged. */
  setContent(label: string, detail?: string): void {
    const next = detail ? `${label}  ${detail}` : label;
    if (next === this.lastText) {
      return;
    }

    this.lastText = next;
    this.setText(next);
  }

  /** Recomputes position and font size for a new viewport size (e.g. on resize). */
  resize(viewportWidth: number, viewportHeight: number): void {
    const { x, y } = ModeLabel.computePosition(viewportWidth, viewportHeight, this.config);
    this.setPosition(x, y);
    this.setFontSize(ModeLabel.computeFontSize(viewportHeight, this.config));
  }

  private static computeFontSize(
    viewportHeight: number,
    config: Required<ModeLabelConfig>,
  ): number {
    return Math.round(viewportHeight * config.fontSizeRatio);
  }

  private static computePosition(
    viewportWidth: number,
    viewportHeight: number,
    config: Required<ModeLabelConfig>,
  ): { x: number; y: number } {
    return {
      x: viewportWidth / 2,
      y: viewportHeight * config.topRatio,
    };
  }
}
