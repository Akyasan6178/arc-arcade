import Phaser from 'phaser';

/**
 * ui/SelectMenu.ts
 *
 * DXB-14: A reusable vertical option list (keyboard + pointer). Not
 * DX-Ball-specific — the caller supplies `{ id, title, description }`
 * rows and an `onSelect` callback. Arrow keys move the highlight;
 * Space / Enter / a click confirm. Shares the HUD typeface/stroke
 * language from DXB-13.
 */

export interface SelectMenuOption<T extends string = string> {
  id: T;
  title: string;
  description?: string;
}

export interface SelectMenuConfig {
  color?: string;
  highlightColor?: string;
  descriptionColor?: string;
  mutedColor?: string;
  titleFontSizeRatio?: number;
  descriptionFontSizeRatio?: number;
  rowHeightRatio?: number;
}

const HUD_FONT_FAMILY = 'Trebuchet MS, Segoe UI, sans-serif';
const HUD_DEPTH = 20;

const DEFAULT_CONFIG: Required<SelectMenuConfig> = {
  color: '#c5d0dc',
  highlightColor: '#f8f9fa',
  descriptionColor: '#90e0ef',
  mutedColor: '#6c7a89',
  titleFontSizeRatio: 0.042,
  descriptionFontSizeRatio: 0.022,
  rowHeightRatio: 0.11,
};

interface SelectMenuRow {
  title: Phaser.GameObjects.Text;
  description: Phaser.GameObjects.Text;
}

export class SelectMenu<T extends string = string> {
  private readonly scene: Phaser.Scene;
  private readonly options: readonly SelectMenuOption<T>[];
  private readonly onSelect: (id: T) => void;
  private readonly config: Required<SelectMenuConfig>;
  private readonly rows: SelectMenuRow[] = [];
  private selectedIndex = 0;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private originY = 0;
  private confirmed = false;

  constructor(
    scene: Phaser.Scene,
    viewportWidth: number,
    viewportHeight: number,
    originY: number,
    options: readonly SelectMenuOption<T>[],
    onSelect: (id: T) => void,
    config: SelectMenuConfig = {},
  ) {
    this.scene = scene;
    this.options = options;
    this.onSelect = onSelect;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.originY = originY;

    for (let i = 0; i < options.length; i++) {
      const option = options[i];
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
        .setDepth(HUD_DEPTH)
        .setInteractive({ useHandCursor: true });

      const description = scene.add
        .text(0, 0, option.description ?? '', {
          fontFamily: HUD_FONT_FAMILY,
          fontSize: '12px',
          color: this.config.mutedColor,
          align: 'center',
          wordWrap: { width: viewportWidth * 0.72 },
          stroke: '#0b1320',
          strokeThickness: 3,
        })
        .setOrigin(0.5, 0)
        .setShadow(1, 2, '#000000', 2, true, true)
        .setDepth(HUD_DEPTH)
        .setInteractive({ useHandCursor: true });

      const selectIndex = i;
      title.on('pointerover', () => this.setSelectedIndex(selectIndex));
      description.on('pointerover', () => this.setSelectedIndex(selectIndex));
      title.on('pointerup', () => this.confirm());
      description.on('pointerup', () => this.confirm());

      this.rows.push({ title, description });
    }

    this.layout();
    this.refreshHighlight();
    this.bindKeyboard();
  }

  resize(viewportWidth: number, viewportHeight: number, originY: number): void {
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

    keyboard.on('keydown-UP', () => this.moveSelection(-1));
    keyboard.on('keydown-DOWN', () => this.moveSelection(1));
    keyboard.on('keydown-ENTER', () => this.confirm());
    keyboard.on('keydown-SPACE', () => this.confirm());
  }

  private moveSelection(delta: number): void {
    if (this.confirmed || this.options.length === 0) {
      return;
    }

    const next = (this.selectedIndex + delta + this.options.length) % this.options.length;
    this.setSelectedIndex(next);
  }

  private setSelectedIndex(index: number): void {
    if (this.confirmed || index === this.selectedIndex) {
      return;
    }

    this.selectedIndex = index;
    this.refreshHighlight();
  }

  private confirm(): void {
    if (this.confirmed) {
      return;
    }

    const option = this.options[this.selectedIndex];
    if (!option) {
      return;
    }

    this.confirmed = true;
    this.onSelect(option.id);
  }

  private layout(): void {
    const titleSize = Math.round(this.viewportHeight * this.config.titleFontSizeRatio);
    const descriptionSize = Math.round(this.viewportHeight * this.config.descriptionFontSizeRatio);
    const rowHeight = this.viewportHeight * this.config.rowHeightRatio;
    const wrapWidth = this.viewportWidth * 0.72;

    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i];
      const y = this.originY + i * rowHeight;
      row.title.setPosition(this.viewportWidth / 2, y);
      row.title.setFontSize(titleSize);
      row.description.setPosition(this.viewportWidth / 2, y + titleSize * 1.15);
      row.description.setFontSize(descriptionSize);
      row.description.setWordWrapWidth(wrapWidth);
    }
  }

  private refreshHighlight(): void {
    for (let i = 0; i < this.rows.length; i++) {
      const option = this.options[i];
      const row = this.rows[i];
      const selected = i === this.selectedIndex;
      row.title.setText(selected ? `>  ${option.title}  <` : option.title);
      row.title.setColor(selected ? this.config.highlightColor : this.config.color);
      row.description.setColor(selected ? this.config.descriptionColor : this.config.mutedColor);
    }
  }
}
