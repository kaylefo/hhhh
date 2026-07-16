import { z } from 'zod';
import type { TileRecord, DiscoveryRecord, Settings, WorldMeta } from '../types';

const recipeParentSchema = z.object({
  type: z.enum(['foundation', 'recent', 'palette', 'reservoir', 'white', 'black']),
  sourceId: z.string(),
  packedColor: z.number().int().min(0).max(16777215),
  hex: z.string(),
  weight: z.number().positive(),
});

const rollRecipeSchema = z.object({
  parents: z.array(recipeParentSchema),
  oklab: z.object({ L: z.number(), a: z.number(), b: z.number() }),
  packedColor: z.number().int().min(0).max(16777215),
  hex: z.string(),
  includesWhite: z.boolean(),
  includesBlack: z.boolean(),
  rollIndex: z.number().int().min(0),
  createdAt: z.number(),
  isFoundation: z.boolean(),
  isPaletteExpansion: z.boolean(),
});

const tileSchema = z.object({
  q: z.number().int(),
  r: z.number().int(),
  packedColor: z.number().int().min(0).max(16777215),
  hex: z.string(),
  rollIndex: z.number().int().min(0),
  placedAt: z.number(),
  recipe: rollRecipeSchema,
  neighborCount: z.number().int().min(0).max(6),
});

const discoverySchema = z.object({
  packed: z.number().int().min(0).max(16777215),
  hex: z.string(),
  firstSeenAt: z.number(),
  rollIndex: z.number().int().min(0),
  sourceKind: z.enum(['source', 'edge', 'vertex']),
  coordinate: z.object({ q: z.number().int(), r: z.number().int() }),
  parentColors: z.array(z.number().int()),
  parentWeights: z.array(z.number()),
  oklab: z.object({ L: z.number(), a: z.number(), b: z.number() }),
  oklch: z.object({ L: z.number(), C: z.number(), h: z.number() }),
});

export const exportSchema = z.object({
  format: z.literal('kulur'),
  version: z.literal(1),
  exportedAt: z.string(),
  appName: z.literal('Kulur'),
  world: z.object({
    metadata: z.record(z.unknown()),
    settings: z.record(z.unknown()),
    tiles: z.array(tileSchema),
    discoveries: z.array(discoverySchema),
    statistics: z.record(z.unknown()),
  }),
});

export type ExportPayload = z.infer<typeof exportSchema>;

export function validateImport(data: unknown): ExportPayload {
  return exportSchema.parse(data);
}

export function validateUniqueTiles(tiles: TileRecord[]): void {
  const seen = new Set<string>();
  for (const t of tiles) {
    const key = `${t.q},${t.r}`;
    if (seen.has(key)) throw new Error('Duplicate tile coordinates in import');
    seen.add(key);
  }
}

export function tilesFromRecords(records: TileRecord[]): Map<string, TileRecord> {
  const map = new Map<string, TileRecord>();
  for (const t of records) {
    map.set(`${t.q},${t.r}`, t);
  }
  return map;
}

export function discoveriesFromRecords(records: DiscoveryRecord[]): Map<number, DiscoveryRecord> {
  const map = new Map<number, DiscoveryRecord>();
  for (const d of records) {
    map.set(d.packed, d);
  }
  return map;
}

export function serializeTiles(tiles: Map<string, TileRecord>): TileRecord[] {
  return Array.from(tiles.values());
}

export function serializeDiscoveries(discoveries: Map<number, DiscoveryRecord>): DiscoveryRecord[] {
  return Array.from(discoveries.values());
}

export type { Settings, WorldMeta };
