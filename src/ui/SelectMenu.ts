import Phaser from 'phaser';
import { fittedRowHeight } from '@ui/menuLayout';

/**
 * ui/SelectMenu.ts
 *
 * DXB-14: A reusable vertical option list (keyboard + pointer). Not
 * DX-Ball-specific — the caller supplies `{ id, title, description }`
 * rows and an `onSelect` callback. Arrow keys move the highlight;
 * Space / Enter / a click confirm. Shares the HUD typeface/stroke
 * language from DXB-13. DXB-16: an option may set `locked` so it stays
 * highlightable (to show a requirement) but Space / click will not
 * confirm it.
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
  titleFontSizeRatio: 0.042,
  descriptionFontSizeRatio: 0.022,
  rowHeightRatio: 0.11,
  depth: HUD_DEPTH,
};

interface SelectMenuRow {
  title: Phaser.GameObjects.Text;
  description: Phaser.GameObjects.Text;
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
        .setPadding(8, 6, 8, 6)
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
        .setDepth(this.config.depth);

      if (option.description) {
        description.setInteractive({ useHandCursor: true });
      } else {
        description.setVisible(false);
      }

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
      row.title.destroy();
      row.description.destroy();
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
    const titleSize = Math.max(14, Math.round(this.viewportHeight * this.config.titleFontSizeRatio));
    const descriptionSize = Math.max(
      11,
      Math.round(this.viewportHeight * this.config.descriptionFontSizeRatio),
    );
    const rowHeight = fittedRowHeight(
      this.viewportHeight,
      this.originY,
      this.rows.length,
      this.config.rowHeightRatio,
      this.viewportHeight * 0.9,
    );
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
      const prefix = option.locked ? '[LOCKED] ' : '';
      const label = `${prefix}${option.title}`;
      row.title.setText(selected ? `>  ${label}  <` : label);
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
    }
  }
}
