import { JsonStore } from '@systems/JsonStore';

/**
 * entities/dx-ball/PlayerProfile.ts
 *
 * DXB-28: Local player-name setting used by future leaderboard
 * submissions. Not an account — no authentication, cloud save, or
 * online identity. Persistence is a sibling `dx-ball-player-profile`
 * key so a malformed name cannot wipe progress or boards.
 */

export const DEFAULT_PLAYER_NAME = 'Player';
export const MAX_PLAYER_NAME_LENGTH = 16;

const PLAYER_PROFILE_STORAGE_KEY = 'dx-ball-player-profile';

export interface PlayerProfile {
  playerName: string;
}

function normalizeName(raw: unknown): string {
  if (typeof raw !== 'string') {
    return DEFAULT_PLAYER_NAME;
  }

  const trimmed = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_PLAYER_NAME_LENGTH);
  return trimmed.length > 0 ? trimmed : DEFAULT_PLAYER_NAME;
}

function normalizeProfile(raw: Partial<PlayerProfile> | null | undefined): PlayerProfile {
  return {
    playerName: normalizeName(raw?.playerName),
  };
}

export function sanitizePlayerName(raw: string): string {
  return normalizeName(raw);
}

export function loadPlayerProfile(): PlayerProfile {
  return normalizeProfile(JsonStore.get<Partial<PlayerProfile>>(PLAYER_PROFILE_STORAGE_KEY));
}

export function savePlayerProfile(profile: PlayerProfile): PlayerProfile {
  const next = normalizeProfile(profile);
  JsonStore.set(PLAYER_PROFILE_STORAGE_KEY, next);
  return next;
}

export function loadPlayerName(): string {
  return loadPlayerProfile().playerName;
}

export function savePlayerName(name: string): string {
  return savePlayerProfile({ playerName: name }).playerName;
}
