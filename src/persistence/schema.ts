import { z } from 'zod';
import type { Settings, WorldMeta, TileRecord, DiscoveryRecord, UndoSnapshot } from '../game/types';

export const settingsSchema = z.object({
  sound: z.boolean(),
  haptics: z.boolean(),
  reducedMotion: z.boolean().nullable(),
  colorPatterns: z.boolean(),
  highContrast: z.boolean(),
  material: z.enum(['soft', 'glass', 'ink', 'neon', 'prism']),
  dieStyle: z.enum(['cube', 'orb', 'facet', 'halo']),
  onboardingComplete: z.boolean(),
});

export type KulurDB = {
  meta: {
    key: 'world';
    value: WorldMeta;
  };
  chunks: {
    key: string;
    value: TileRecord;
  };
  discoveries: {
    key: number;
    value: DiscoveryRecord;
  };
  exactBitsetPages: {
    key: number;
    value: Uint8Array;
  };
  rgbCellBitset: {
    key: 'main';
    value: Uint8Array;
  };
  settings: {
    key: 'app';
    value: Settings;
  };
  undo: {
    key: 'current';
    value: UndoSnapshot | null;
  };
  session: {
    key: string;
    value: {
      lastVisibleAt: number;
      lastPlayTickAt: number;
      appVersion: number;
    };
  };
};

export const STORE_NAMES = [
  'meta',
  'chunks',
  'discoveries',
  'exactBitsetPages',
  'rgbCellBitset',
  'settings',
  'undo',
  'session',
] as const;
