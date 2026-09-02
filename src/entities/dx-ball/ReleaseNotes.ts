/**
 * entities/dx-ball/ReleaseNotes.ts
 *
 * Player-facing changelog copy for the What's New screen. Human-readable
 * milestone cards — not git history. Kept out of scenes the same way
 * `Version.ts` keeps product strings out of Hub / Credits.
 */

import { GAME_TITLE, GAME_VERSION } from '@entities/dx-ball/Version';

export interface ReleaseNote {
  version: string;
  title: string;
  highlights: readonly string[];
}

export const CURRENT_RELEASE_LABEL = `${GAME_TITLE} v${GAME_VERSION}`;

export const RELEASE_NOTES: readonly ReleaseNote[] = [
  {
    version: 'v0.28.0',
    title: 'Leaderboard Prep',
    highlights: [
      'Set a player name in Settings',
      'Shareable run summary after every finish',
      'Local leaderboards still save on this device',
      'Online leaderboards are marked Coming Soon',
    ],
  },
  {
    version: 'v0.27.0',
    title: 'How To & Paddles',
    highlights: [
      'How To is now live gameplay showcases',
      'Watch bricks, powerups, and modes in action',
      'Robot, Alien, Reactor, and Pulse paddles use real motion',
      'Garage previews show why each paddle is unique',
    ],
  },
  {
    version: 'v0.26.0',
    title: 'Player Presentation',
    highlights: [
      'Visual How To with live gameplay demos',
      'Classic always starts at Level 1',
      'Time Attack gives a fresh timer each level',
      'Pause menu audio controls',
      'Compact Credits and this What\'s New screen',
    ],
  },
  {
    version: 'v0.25.0',
    title: 'Balance & Feel',
    highlights: [
      'Fire Ball and Laser Paddle last 5 seconds',
      'Extra Life is extremely rare',
      'Stronger paddle cosmetics',
      'Gold completed-achievement cards',
    ],
  },
  {
    version: 'v0.24.0',
    title: 'Laser Paddle',
    highlights: [
      'Laser Paddle dual-bolt powerup',
      'Type-specific brick impact flashes',
      'Richer Classic level cards',
      'End-of-run score and unlock summaries',
    ],
  },
  {
    version: 'v0.23.0',
    title: 'Campaign & Cosmetics',
    highlights: [
      '10-level Classic campaign',
      'Named layouts with miniature previews',
      'Unique paddle silhouettes',
      'How To and Credits from the Hub',
    ],
  },
  {
    version: 'v0.22.0',
    title: 'Audio & Identity',
    highlights: [
      'Theme music beds',
      'Animated Garage cosmetics',
      'Catch flashes and stronger result cards',
    ],
  },
  {
    version: 'v0.19.0',
    title: 'Content Expansion',
    highlights: [
      'Six playable themes',
      'Eight paddles and eight balls',
      'Levels 6–10 close the Classic run',
    ],
  },
  {
    version: 'v0.18.0',
    title: 'Garage',
    highlights: [
      'Equip themes, paddles, and balls',
      'Live collection preview',
      'Favorites per catalog',
    ],
  },
  {
    version: 'v0.17.0',
    title: 'Records',
    highlights: [
      'Lifetime statistics',
      'Local Top 10 per mode',
      'Personal bests on one screen',
    ],
  },
  {
    version: 'v0.16.0',
    title: 'Achievements',
    highlights: [
      'Lifetime goals and unlock gates',
      'Theme, paddle, and ball rewards',
    ],
  },
  {
    version: 'v0.15.0',
    title: 'Themes',
    highlights: [
      'Neon Arcade, Space, and Laboratory',
      'Themed bricks, HUD, and overlays',
    ],
  },
  {
    version: 'v0.14.0',
    title: 'Game Modes',
    highlights: [
      'Classic campaign',
      'Time Attack',
      'Endless',
    ],
  },
  {
    version: 'v0.12.0',
    title: 'Advanced Powerups',
    highlights: [
      'Fire Ball, Multi Ball, Fast Ball, Small Paddle',
      'Positive and negative capsules',
    ],
  },
  {
    version: 'v0.11.0',
    title: 'Advanced Bricks',
    highlights: [
      'Normal, Cracked, Metal, and Bonus',
      'Type-specific hits and drops',
    ],
  },
];
