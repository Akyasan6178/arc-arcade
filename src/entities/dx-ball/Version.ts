/**
 * entities/dx-ball/Version.ts
 *
 * Visible DX-Ball product version and creator attribution. Kept out of
 * `package.json` (that file versions the arcade foundation) so Hub /
 * Credits can show a product string without coupling Phaser scenes to
 * npm metadata.
 *
 * Versioning scheme (DXB-25): `0.<DXB-task>.0`. This pass is DXB-25, so
 * the product is `DX-Ball v0.25.0`. v1.0.0 was a placeholder from the
 * DXB-23 release-candidate chrome and did not match project history.
 */

export const GAME_TITLE = 'DX-Ball';
export const GAME_VERSION = '0.25.0';
export const CREATOR_NAME = 'Akif Yasan';
export const STUDIO_NAME = 'Marka Mutfağı';

export function formatGameVersion(): string {
  return `${GAME_TITLE} v${GAME_VERSION}`;
}

export function formatCreatorCredit(): string {
  return `Created by ${CREATOR_NAME}`;
}

export function formatStudioCredit(): string {
  return `Powered by ${STUDIO_NAME}`;
}
