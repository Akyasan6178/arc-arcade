import Phaser from 'phaser';

/**
 * ui/TabBar.ts
 *
 * DXB-18A: A reusable horizontal tab strip (pointer + optional left /
 * right keys). Not DX-Ball-specific — the caller supplies `{ id, title }`
 * tabs and an `onSelect` callback. The active tab is highlighted; a tap
 * or Left / Right changes it. Up / Down are left for lists below.
 */

export interface TabBarOption<T extends string = string> {
  id: T;
  title: string;
}

export interface TabBarConfig<T extends string = string> {
  color?: string;
  highlightColor?: string;
  mutedColor?: string;
  fontSizeRatio?: number;
  depth?: number;
  initialId?: T;
}

const HUD_FONT_FAMILY = 'Trebuchet MS, Segoe UI, sans-serif';
const HUD_DEPTH = 22;

const DEFAULT_CONFIG: Required<Omit<TabBarConfig, 'initialId'>> = {
  color: '#c5d0dc',
  highlightColor: '#f8f9fa',
  mutedColor: '#6c7a89',
  fontSizeRatio: 0.024,
  depth: HUD_DEPTH,
};

export class TabBar<T extends string = string> {
  private readonly scene: Phaser.Scene;
  private readonly options: readonly TabBarOption<T>[];
  private readonly onSelect: (id: T) => void;
  private readonly config: Required<Omit<TabBarConfig<T>, 'initialId'>> &
    Pick<TabBarConfig<T>, 'initialId'>;
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private selectedIndex = 0;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private originY = 0;
  private destroyed = false;
  private readonly onLeft = (): void => this.moveSelection(-1);
  private readonly onRight = (): void => this.moveSelection(1);

  constructor(
    scene: Phaser.Scene,
    viewportWidth: number,
    viewportHeight: number,
    originY: number,
    options: readonly TabBarOption<T>[],
    onSelect: (id: T) => void,
    config: TabBarConfig<T> = {},
  ) {
    this.scene = scene;
    this.options = options;
    this.onSelect = onSelect;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.originY = originY;

    const initialIndex = options.findIndex((option) => option.id === config.initialId);
    this.selectedIndex = Phaser.Math.Clamp(
      initialIndex >= 0 ? initialIndex : 0,
      0,
      Math.max(0, options.length - 1),
    );

    for (let i = 0; i < options.length; i++) {
      const label = scene.add
        .text(0, 0, '', {
          fontFamily: HUD_FONT_FAMILY,
          fontSize: '16px',
          color: this.config.color,
          fontStyle: 'bold',
          align: 'center',
          stroke: '#0b1320',
          strokeThickness: 4,
        })
        .setOrigin(0.5, 0)
        .setPadding(10, 8, 10, 8)
        .setShadow(1, 2, '#000000', 3, true, true)
        .setDepth(this.config.depth)
        .setInteractive({ useHandCursor: true });

      const selectIndex = i;
      label.on('pointerup', () => this.selectIndex(selectIndex));
      this.labels.push(label);
    }

    this.layout();
    this.refreshHighlight();
    this.bindKeyboard();
  }

  getSelectedId(): T | undefined {
    return this.options[this.selectedIndex]?.id;
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    const keyboard = this.scene.input.keyboard;
    keyboard?.off('keydown-LEFT', this.onLeft);
    keyboard?.off('keydown-RIGHT', this.onRight);

    for (const label of this.labels) {
      label.destroy();
    }
    this.labels.length = 0;
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

    keyboard.on('keydown-LEFT', this.onLeft);
    keyboard.on('keydown-RIGHT', this.onRight);
  }

  private moveSelection(delta: number): void {
    if (this.destroyed || this.options.length === 0) {
      return;
    }

    const next = (this.selectedIndex + delta + this.options.length) % this.options.length;
    this.selectIndex(next);
  }

  private selectIndex(index: number): void {
    if (this.destroyed || this.options.length === 0) {
      return;
    }

    const clamped = Phaser.Math.Clamp(index, 0, this.options.length - 1);
    const changed = clamped !== this.selectedIndex;
    this.selectedIndex = clamped;
    this.refreshHighlight();
    if (changed) {
      this.onSelect(this.options[clamped].id);
    }
  }

  private layout(): void {
    const count = this.labels.length;
    if (count === 0) {
      return;
    }

    const fontSize = Math.max(12, Math.round(this.viewportHeight * this.config.fontSizeRatio));
    const startX = this.viewportWidth * 0.1;
    const endX = this.viewportWidth * 0.9;
    const span = count === 1 ? 0 : (endX - startX) / (count - 1);

    for (let i = 0; i < count; i++) {
      const x = count === 1 ? this.viewportWidth / 2 : startX + span * i;
      this.labels[i].setPosition(x, this.originY);
      this.labels[i].setFontSize(fontSize);
    }
  }

  private refreshHighlight(): void {
    for (let i = 0; i < this.labels.length; i++) {
      const option = this.options[i];
      const selected = i === this.selectedIndex;
      this.labels[i].setText(selected ? `> ${option.title} <` : option.title);
      this.labels[i].setColor(selected ? this.config.highlightColor : this.config.mutedColor);
    }
  }
}
