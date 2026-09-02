import Phaser from 'phaser';
import { fittedRowHeight } from '@ui/menuLayout';

/**
 * ui/SelectMenu.ts
 *
 * DXB-14: A reusable vertical option list (keyboard + pointer). Not
 * DX-Ball-specific — the caller supplies `{ id, title, description }`
 * rows and an `onSelect` callback. Arrow keys move the highlight;
 * Space / Enter / a click confirm. DXB-16: an option may set `locked`.
 *
 * DXB-26: card chrome and visual highlight instead of `> title <`
 * debug prefixes, so Hub / Theme / Mode read as a finished game UI.
 */

export interface SelectMenuOption<T extends string = string> {
  id: T;
  title: string;
  description?: string;
  /** DXB-16: Highlightable so the requirement is readable, but Space will not confirm. */
  locked?: boolean;
}

export interface SelectMenuConfig<T extends string = string> {
  color?: string;
  highlightColor?: string;
  descriptionColor?: string;
  mutedColor?: string;
  titleFontSizeRatio?: number;
  descriptionFontSizeRatio?: number;
  rowHeightRatio?: number;
  /** Draw depth. Pause overlays pass a value above gameplay HUD / messages. */
  depth?: number;
  panel?: number;
  panelStroke?: number;
  accent?: number;
  /** DXB-15: Index highlighted when the menu is created. */
  initialIndex?: number;
  /** DXB-15: Fires when the highlight moves, before confirm. */
  onHighlight?: (id: T) => void;
}

const HUD_FONT_FAMILY = 'Trebuchet MS, Segoe UI, sans-serif';
const HUD_DEPTH = 20;

const DEFAULT_CONFIG: Required<Omit<SelectMenuConfig, 'onHighlight' | 'initialIndex'>> = {
  color: '#c5d0dc',
  highlightColor: '#f8f9fa',
  descriptionColor: '#90e0ef',
  mutedColor: '#6c7a89',
  titleFontSizeRatio: 0.032,
  descriptionFontSizeRatio: 0.016,
  rowHeightRatio: 0.09,
  depth: HUD_DEPTH,
  panel: 0x12182c,
  panelStroke: 0x2de2e6,
  accent: 0xff2a6d,
};

interface SelectMenuRow {
  hit: Phaser.GameObjects.Rectangle;
  chrome: Phaser.GameObjects.Graphics;
  title: Phaser.GameObjects.Text;
  description: Phaser.GameObjects.Text;
  badge: Phaser.GameObjects.Text;
}

export class SelectMenu<T extends string = string> {
  private readonly scene: Phaser.Scene;
  private readonly options: readonly SelectMenuOption<T>[];
  private readonly onSelect: (id: T) => void;
  private readonly config: Required<Omit<SelectMenuConfig<T>, 'onHighlight' | 'initialIndex'>> &
    Pick<SelectMenuConfig<T>, 'onHighlight' | 'initialIndex'>;
  private readonly rows: SelectMenuRow[] = [];
  private selectedIndex = 0;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private originY = 0;
  private confirmed = false;
  private destroyed = false;
  private readonly onUp = (): void => this.moveSelection(-1);
  private readonly onDown = (): void => this.moveSelection(1);
  private readonly onEnter = (): void => this.confirm();
  private readonly onSpace = (): void => this.confirm();

  constructor(
    scene: Phaser.Scene,
    viewportWidth: number,
    viewportHeight: number,
    originY: number,
    options: readonly SelectMenuOption<T>[],
    onSelect: (id: T) => void,
    config: SelectMenuConfig<T> = {},
  ) {
    this.scene = scene;
    this.options = options;
    this.onSelect = onSelect;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.selectedIndex = Phaser.Math.Clamp(
      config.initialIndex ?? 0,
      0,
      Math.max(0, options.length - 1),
    );
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.originY = originY;

    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      const chrome = scene.add.graphics().setDepth(this.config.depth - 1);
      const hit = scene.add
        .rectangle(0, 0, 10, 10, 0x000000, 0.01)
        .setDepth(this.config.depth + 1)
        .setInteractive({ useHandCursor: !option.locked });

      const title = scene.add
        .text(0, 0, option.title, {
          fontFamily: HUD_FONT_FAMILY,
          fontSize: '16px',
          color: this.config.color,
          fontStyle: 'bold',
          align: 'center',
          stroke: '#0b1320',
          strokeThickness: 4,
        })
        .setOrigin(0.5, 0)
        .setShadow(1, 2, '#000000', 3, true, true)
        .setDepth(this.config.depth)
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
        .setDepth(this.config.depth)
        .setVisible(Boolean(option.description));

      const badge = scene.add
        .text(0, 0, option.locked ? 'LOCKED' : '', {
          fontFamily: HUD_FONT_FAMILY,
          fontSize: '10px',
          color: this.config.mutedColor,
          fontStyle: 'bold',
          align: 'right',
          stroke: '#0b1320',
          strokeThickness: 3,
        })
        .setOrigin(1, 0.5)
        .setDepth(this.config.depth)
        .setVisible(Boolean(option.locked));

      const selectIndex = i;
      hit.on('pointerover', () => this.setSelectedIndex(selectIndex));
      hit.on('pointerup', () => this.confirm());
      title.on('pointerover', () => this.setSelectedIndex(selectIndex));
      title.on('pointerup', () => this.confirm());

      this.rows.push({ hit, chrome, title, description, badge });
    }

    this.layout();
    this.refreshHighlight();
    this.bindKeyboard();
  }

  /** Removes keyboard listeners and texts so a later overlay cannot steal Space. */
  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.confirmed = true;
    const keyboard = this.scene.input.keyboard;
    keyboard?.off('keydown-UP', this.onUp);
    keyboard?.off('keydown-DOWN', this.onDown);
    keyboard?.off('keydown-ENTER', this.onEnter);
    keyboard?.off('keydown-SPACE', this.onSpace);

    for (const row of this.rows) {
      row.hit.destroy();
      row.chrome.destroy();
      row.title.destroy();
      row.description.destroy();
      row.badge.destroy();
    }
    this.rows.length = 0;
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
    keyboard.on('keydown-ENTER', this.onEnter);
    keyboard.on('keydown-SPACE', this.onSpace);
  }

  private moveSelection(delta: number): void {
    if (this.destroyed || this.confirmed || this.options.length === 0) {
      return;
    }

    const next = (this.selectedIndex + delta + this.options.length) % this.options.length;
    this.setSelectedIndex(next);
  }

  private setSelectedIndex(index: number): void {
    if (this.destroyed || this.confirmed || index === this.selectedIndex) {
      return;
    }

    this.selectedIndex = index;
    this.refreshHighlight();
    this.config.onHighlight?.(this.options[index].id);
  }

  private confirm(): void {
    if (this.destroyed || this.confirmed) {
      return;
    }

    const option = this.options[this.selectedIndex];
    if (!option || option.locked) {
      return;
    }

    this.confirmed = true;
    this.onSelect(option.id);
  }

  private layout(): void {
    const titleSize = Math.max(13, Math.round(this.viewportHeight * this.config.titleFontSizeRatio));
    const descriptionSize = Math.max(
      10,
      Math.round(this.viewportHeight * this.config.descriptionFontSizeRatio),
    );
    const rowHeight = fittedRowHeight(
      this.viewportHeight,
      this.originY,
      this.rows.length,
      this.config.rowHeightRatio,
      this.viewportHeight * 0.9,
    );
    const cardW = this.viewportWidth * 0.78;
    const cardX = (this.viewportWidth - cardW) / 2;
    const wrapWidth = cardW * 0.78;

    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i];
      const option = this.options[i];
      const y = this.originY + i * rowHeight;
      const cardH = rowHeight * 0.86;
      const radius = Math.max(8, cardH * 0.18);
      const selected = i === this.selectedIndex;
      const hasDesc = Boolean(option.description);

      row.chrome.clear();
      row.chrome.fillStyle(this.config.panel, selected ? 0.96 : 0.82);
      row.chrome.fillRoundedRect(cardX, y, cardW, cardH, radius);
      row.chrome.lineStyle(
        selected ? 2.5 : 1.25,
        selected ? this.config.accent : this.config.panelStroke,
        selected ? 1 : 0.7,
      );
      row.chrome.strokeRoundedRect(cardX, y, cardW, cardH, radius);
      if (selected) {
        row.chrome.fillStyle(this.config.accent, 1);
        row.chrome.fillRect(cardX, y + cardH * 0.18, 4, cardH * 0.64);
      }

      const titleY = hasDesc ? y + cardH * 0.16 : y + cardH * 0.5 - titleSize * 0.55;
      row.title.setPosition(this.viewportWidth / 2, titleY);
      row.title.setFontSize(titleSize);
      row.description.setPosition(this.viewportWidth / 2, titleY + titleSize * 1.15);
      row.description.setFontSize(descriptionSize);
      row.description.setWordWrapWidth(wrapWidth);
      row.badge.setPosition(cardX + cardW - 14, y + cardH * 0.5);
      row.badge.setFontSize(Math.max(9, descriptionSize));

      row.hit.setPosition(this.viewportWidth / 2, y + cardH / 2);
      row.hit.setSize(cardW, cardH);
      row.hit.setDisplaySize(cardW, cardH);
    }
  }

  private refreshHighlight(): void {
    for (let i = 0; i < this.rows.length; i++) {
      const option = this.options[i];
      const row = this.rows[i];
      const selected = i === this.selectedIndex;
      row.title.setText(option.title);
      row.title.setColor(
        selected
          ? this.config.highlightColor
          : option.locked
            ? this.config.mutedColor
            : this.config.color,
      );
      row.description.setColor(
        selected && !option.locked ? this.config.descriptionColor : this.config.mutedColor,
      );
      row.badge.setVisible(Boolean(option.locked));
    }
    this.layout();
  }
}
