import Phaser from 'phaser';
import type { StatDisplayRow } from '@entities/dx-ball/Progress';
import { fittedRowHeight } from '@ui/menuLayout';

/**
 * ui/StatsList.ts
 *
 * DXB-17: Reusable read-only label/value list for statistics,
 * personal bests, leaderboards, and progress summaries. Not
 * DX-Ball-specific beyond consuming a `StatDisplayRow` shape.
 * No confirm action — arrow keys only move the highlight so a
 * long list stays readable. Esc handling belongs to the scene.
 */

export interface StatsListConfig {
  color?: string;
  highlightColor?: string;
  valueColor?: string;
  mutedColor?: string;
  titleFontSizeRatio?: number;
  valueFontSizeRatio?: number;
  rowHeightRatio?: number;
  depth?: number;
}

const HUD_FONT_FAMILY = 'Trebuchet MS, Segoe UI, sans-serif';
const HUD_DEPTH = 20;

const DEFAULT_CONFIG: Required<StatsListConfig> = {
  color: '#c5d0dc',
  highlightColor: '#f8f9fa',
  valueColor: '#90e0ef',
  mutedColor: '#6c7a89',
  titleFontSizeRatio: 0.026,
  valueFontSizeRatio: 0.022,
  rowHeightRatio: 0.055,
  depth: HUD_DEPTH,
};

interface StatsListVisualRow {
  title: Phaser.GameObjects.Text;
  value: Phaser.GameObjects.Text;
}

export class StatsList {
  private readonly scene: Phaser.Scene;
  private readonly config: Required<StatsListConfig>;
  private readonly visualRows: StatsListVisualRow[] = [];
  private items: readonly StatDisplayRow[] = [];
  private selectedIndex = 0;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private originY = 0;
  private destroyed = false;
  private readonly onUp = (): void => this.moveSelection(-1);
  private readonly onDown = (): void => this.moveSelection(1);

  constructor(
    scene: Phaser.Scene,
    viewportWidth: number,
    viewportHeight: number,
    originY: number,
    items: readonly StatDisplayRow[],
    config: StatsListConfig = {},
  ) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.originY = originY;
    this.items = items;

    for (let i = 0; i < items.length; i++) {
      const title = scene.add
        .text(0, 0, '', {
          fontFamily: HUD_FONT_FAMILY,
          fontSize: '16px',
          color: this.config.color,
          fontStyle: 'bold',
          align: 'center',
          stroke: '#0b1320',
          strokeThickness: 5,
        })
        .setOrigin(0.5, 0)
        .setShadow(1, 2, '#000000', 3, true, true)
        .setDepth(this.config.depth);

      const value = scene.add
        .text(0, 0, '', {
          fontFamily: HUD_FONT_FAMILY,
          fontSize: '12px',
          color: this.config.valueColor,
          align: 'center',
          wordWrap: { width: viewportWidth * 0.84 },
          stroke: '#0b1320',
          strokeThickness: 3,
        })
        .setOrigin(0.5, 0)
        .setShadow(1, 2, '#000000', 2, true, true)
        .setDepth(this.config.depth);

      const selectIndex = i;
      title.setInteractive({ useHandCursor: true });
      value.setInteractive({ useHandCursor: true });
      title.on('pointerover', () => this.setSelectedIndex(selectIndex));
      value.on('pointerover', () => this.setSelectedIndex(selectIndex));

      this.visualRows.push({ title, value });
    }

    this.layout();
    this.refreshHighlight();
    this.bindKeyboard();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    const keyboard = this.scene.input.keyboard;
    keyboard?.off('keydown-UP', this.onUp);
    keyboard?.off('keydown-DOWN', this.onDown);

    for (const row of this.visualRows) {
      row.title.destroy();
      row.value.destroy();
    }
    this.visualRows.length = 0;
  }

  resize(viewportWidth: number, viewportHeight: number, originY: number): void {
    if (this.destroyed) {
      return;
    }

    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.originY = originY;
    this.layout();
  }

  private bindKeyboard(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) {
      return;
    }

    keyboard.on('keydown-UP', this.onUp);
    keyboard.on('keydown-DOWN', this.onDown);
  }

  private moveSelection(delta: number): void {
    if (this.destroyed || this.items.length === 0) {
      return;
    }

    const next = (this.selectedIndex + delta + this.items.length) % this.items.length;
    this.setSelectedIndex(next);
  }

  private setSelectedIndex(index: number): void {
    if (this.destroyed || index === this.selectedIndex) {
      return;
    }

    this.selectedIndex = index;
    this.refreshHighlight();
  }

  private layout(): void {
    const titleSize = Math.max(12, Math.round(this.viewportHeight * this.config.titleFontSizeRatio));
    const valueSize = Math.max(11, Math.round(this.viewportHeight * this.config.valueFontSizeRatio));
    const rowHeight = fittedRowHeight(
      this.viewportHeight,
      this.originY,
      this.visualRows.length,
      this.config.rowHeightRatio,
      this.viewportHeight * 0.9,
    );
    const wrapWidth = this.viewportWidth * 0.84;

    for (let i = 0; i < this.visualRows.length; i++) {
      const row = this.visualRows[i];
      const y = this.originY + i * rowHeight;
      row.title.setPosition(this.viewportWidth / 2, y);
      row.title.setFontSize(titleSize);
      row.value.setPosition(this.viewportWidth / 2, y + titleSize * 1.08);
      row.value.setFontSize(valueSize);
      row.value.setWordWrapWidth(wrapWidth);
    }
  }

  private refreshHighlight(): void {
    for (let i = 0; i < this.visualRows.length; i++) {
      const item = this.items[i];
      const row = this.visualRows[i];
      if (!item) {
        continue;
      }

      const selected = i === this.selectedIndex;
      row.title.setText(selected ? `>  ${item.title}  <` : item.title);
      row.title.setColor(selected ? this.config.highlightColor : this.config.color);
      row.value.setText(item.value);
      row.value.setColor(selected ? this.config.valueColor : this.config.mutedColor);
    }
  }
}
