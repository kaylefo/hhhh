import {
  exportSchema,
  validateImport,
  validateUniqueTiles,
} from '../../src/game/board/serialization';
import {
  buildExportPayload,
  compressExport,
  decompressImport,
  recalculateDerivedFromImport,
} from '../../src/persistence/exportImport';
import { foundationRecipe } from '../../src/game/roll/recipes';
import { createColorRecord } from '../../src/game/color/formatting';
import { DEFAULT_SETTINGS } from '../../src/game/constants';
import type { WorldMeta, TileRecord, DiscoveryRecord } from '../../src/game/types';
import { createEmptyStatistics } from '../../src/game/board/placement';
import { createHueHistogram } from '../../src/game/color/harmony';
import { rebuildFrontier } from '../../src/game/hex/frontier';

function minimalWorldMeta(): WorldMeta {
  const anchor = createColorRecord(0xff8040);
  return {
    worldId: 'test-world',
    createdAt: 1000,
    updatedAt: 2000,
    baseHue: 42,
    foundationAnchors: [anchor],
    expandedAnchors: [],
    rollCount: 1,
    placementCount: 1,
    pendingRoll: null,
    camera: { worldX: 0, worldY: 0, zoom: 1, velocityX: 0, velocityY: 0 },
    frontier: [{ q: 1, r: 0 }],
    recentRing: [anchor.packed],
    reservoir: [],
    hueHistogram: createHueHistogram(),
    statistics: createEmptyStatistics(),
    unlockedMaterials: ['soft'],
    unlockedDieStyles: ['cube'],
  };
}

describe('import validation', () => {
  it('accepts valid export payloads via zod schema', () => {
    const anchor = createColorRecord(0x336699);
    const recipe = foundationRecipe(anchor, 0, 1000);
    const tile: TileRecord = {
      q: 0,
      r: 0,
      packedColor: anchor.packed,
      hex: anchor.hex,
      rollIndex: 0,
      placedAt: 1000,
      recipe,
      neighborCount: 0,
    };
    const payload = buildExportPayload(minimalWorldMeta(), DEFAULT_SETTINGS, [tile], []);
    expect(() => validateImport(payload)).not.toThrow();
    expect(exportSchema.parse(payload).format).toBe('kulur');
  });

  it('rejects malformed payloads', () => {
    expect(() => validateImport({ format: 'other', version: 1 })).toThrow();
    expect(() => validateImport({ format: 'kulur', version: 2 })).toThrow();
  });

  it('rejects duplicate tile coordinates', () => {
    const anchor = createColorRecord(0x112233);
    const recipe = foundationRecipe(anchor, 0, 1000);
    const tile: TileRecord = {
      q: 0,
      r: 0,
      packedColor: anchor.packed,
      hex: anchor.hex,
      rollIndex: 0,
      placedAt: 1000,
      recipe,
      neighborCount: 0,
    };
    expect(() => validateUniqueTiles([tile, { ...tile }])).toThrow(/Duplicate tile/);
  });

  it('round-trips compressed exports', () => {
    const meta = minimalWorldMeta();
    const anchor = createColorRecord(0xabcdef);
    const recipe = foundationRecipe(anchor, 0, 1000);
    const tile: TileRecord = {
      q: 0,
      r: 0,
      packedColor: anchor.packed,
      hex: anchor.hex,
      rollIndex: 0,
      placedAt: 1000,
      recipe,
      neighborCount: 0,
    };
    const payload = buildExportPayload(meta, DEFAULT_SETTINGS, [tile], []);
    const compressed = compressExport(payload);
    const restored = decompressImport(compressed);
    expect(restored.world.tiles).toHaveLength(1);
    expect(restored.world.tiles[0]!.q).toBe(0);
  });
});

describe('frontier reconstruction helper', () => {
  it('rebuilds bitsets, frontier, and statistics from import data', () => {
    const anchor = createColorRecord(0xff0000);
    const recipe = foundationRecipe(anchor, 0, 1000);
    const tile: TileRecord = {
      q: 0,
      r: 0,
      packedColor: anchor.packed,
      hex: anchor.hex,
      rollIndex: 0,
      placedAt: 1000,
      recipe,
      neighborCount: 0,
    };
    const discovery: DiscoveryRecord = {
      packed: anchor.packed,
      hex: anchor.hex,
      firstSeenAt: 1000,
      rollIndex: 0,
      sourceKind: 'source',
      coordinate: { q: 0, r: 0 },
      parentColors: [anchor.packed],
      parentWeights: [1],
      oklab: anchor.oklab,
      oklch: anchor.oklch,
    };

    const derived = recalculateDerivedFromImport([tile], [discovery]);
    expect(derived.exactBitset.has(anchor.packed)).toBe(true);
    expect(derived.rgbBitset.has(anchor.packed)).toBe(true);
    expect(derived.statistics.placedTiles).toBe(1);
    expect(derived.frontier.size()).toBe(6);

    const tileMap = new Map([[`${tile.q},${tile.r}`, { q: tile.q, r: tile.r }]]);
    expect(rebuildFrontier(tileMap).size()).toBe(derived.frontier.size());
  });
});
