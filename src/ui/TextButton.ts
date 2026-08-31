import Phaser from 'phaser';

/**
 * ui/TextButton.ts
 *
 * DXB-18A: A reusable tappable label. Not DX-Ball-specific — the caller
 * supplies the caption and an `onClick` callback. Pointer hover brightens
 * the text; keyboard handling stays with the owning scene so Esc / M / G
 * keep their existing bindings.
 */

export interface TextButtonConfig {
  color?: string;
  highlightColor?: string;
  fontSize?: number;
  originX?: number;
  originY?: number;
  depth?: number;
  align?: 'left' | 'center' | 'right';
}

const HUD_FONT_FAMILY = 'Trebuchet MS, Segoe UI, sans-serif';
const HUD_DEPTH = 22;

const DEFAULT_CONFIG: Required<Omit<TextButtonConfig, 'fontSize'>> & { fontSize: number } = {
  color: '#c5d0dc',
  highlightColor: '#f8f9fa',
  fontSize: 16,
  originX: 0.5,
  originY: 0.5,
  depth: HUD_DEPTH,
  align: 'center',
};

export class TextButton {
  private readonly text: Phaser.GameObjects.Text;
  private color: string;
  private highlightColor: string;
  private destroyed = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    config: TextButtonConfig = {},
  ) {
    const resolved = { ...DEFAULT_CONFIG, ...config };
    this.color = resolved.color;
    this.highlightColor = resolved.highlightColor;

    this.text = scene.add
      .text(x, y, label, {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: `${resolved.fontSize}px`,
        color: resolved.color,
        fontStyle: 'bold',
        align: resolved.align,
        stroke: '#0b1320',
        strokeThickness: 4,
      })
      .setOrigin(resolved.originX, resolved.originY)
      .setPadding(14, 10, 14, 10)
      .setShadow(1, 2, '#000000', 3, true, true)
      .setDepth(resolved.depth)
      .setInteractive({ useHandCursor: true });

    this.text.on('pointerover', () => {
      if (!this.destroyed) {
        this.text.setColor(this.highlightColor);
      }
    });
    this.text.on('pointerout', () => {
      if (!this.destroyed) {
        this.text.setColor(this.color);
      }
    });
    this.text.on('pointerup', () => {
      if (!this.destroyed) {
        onClick();
      }
    });
  }

  setText(label: string): void {
    if (!this.destroyed) {
      this.text.setText(label);
    }
  }

  setColor(color: string, highlightColor?: string): void {
    if (this.destroyed) {
      return;
    }

    this.color = color;
    if (highlightColor) {
      this.highlightColor = highlightColor;
    }
    this.text.setColor(color);
  }

  setPosition(x: number, y: number): void {
    if (!this.destroyed) {
      this.text.setPosition(x, y);
    }
  }

  setFontSize(size: number): void {
    if (!this.destroyed) {
      this.text.setFontSize(Math.max(14, size));
    }
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.text.destroy();
  }
}
