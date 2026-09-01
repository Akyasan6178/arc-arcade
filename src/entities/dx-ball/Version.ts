/**
 * entities/dx-ball/Version.ts
 *
 * DXB-23: Visible DX-Ball product version. Kept out of `package.json`
 * (that file versions the arcade foundation) so Hub / Credits can show
 * `DX-Ball v1.0.0` without coupling Phaser scenes to npm metadata.
 */

export const GAME_TITLE = 'DX-Ball';
export const GAME_VERSION = '1.0.0';

export function formatGameVersion(): string {
  return `${GAME_TITLE} v${GAME_VERSION}`;
}
