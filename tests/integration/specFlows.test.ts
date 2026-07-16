import { describe, expect, it, beforeEach } from 'vitest';
import { FrontierSet } from '../../src/game/hex/frontier';
import { ExactColorBitset, RgbCellBitset } from '../../src/game/color/discovery';
import { createHueHistogram } from '../../src/game/color/harmony';
import {
  createEmptyStatistics,
  placeTile,
  type BoardState,
} from '../../src/game/board/placement';
import { generateRoll } from '../../src/game/roll/generator';
import { generateFoundationAnchors } from '../../src/game/roll/palette';
import { MATERIAL_UNLOCKS, DIE_STYLE_UNLOCKS } from '../../src/game/constants';
import { buildExportPayload, recalculateDerivedFromImport } from '../../src/persistence/exportImport';
import { DEFAULT_SETTINGS } from '../../src/game/constants';
import { mockRandomSequence } from '../helpers/random';
import type { WorldMeta } from '../../src/game/types';

function createBoardState(): BoardState {
  return {
    tiles: new Map(),
    frontier: new FrontierSet([{ q: 0, r: 0 }]),
    exactBitset: new ExactColorBitset(),
    rgbBitset: new RgbCellBitset(),
    discoveries: new Map(),
    statistics: createEmptyStatistics(),
    hueHistogram: createHueHistogram(),
    recentRing: [],
    reservoir: [],
    expandedAnchors: [],
  };
}

describe('spec integration flows', () => {
  beforeEach(() => {
    // ensure deterministic rolls
  });

  it('discovers edge mixes for neighboring tiles and vertex mixes for completed corners', () => {
    const restore = mockRandomSequence(Array.from({ length: 400 }, (_, i) => (i * 0.017) % 1));
    const board = createBoardState();
    const foundationAnchors = generateFoundationAnchors(90);

    const roll = (index: number, foundationIndex: number) =>
      generateRoll(
        {
          foundationAnchors,
          foundationOrder: foundationAnchors,
          foundationIndex,
          expandedAnchors: [],
          recentRing: board.recentRing,
          reservoir: board.reservoir,
          hueHistogram: board.hueHistogram,
          rollCount: index,
          placementCount: board.tiles.size,
          exactBitset: board.exactBitset,
          rgbBitset: board.rgbBitset,
          recentRolls: [],
        },
        index,
        Date.now(),
        () => 0,
      );

    const first = placeTile(board, { q: 0, r: 0 }, roll(0, 0), 0);
    expect(first.newDiscoveries.some((d) => d.sourceKind === 'source')).toBe(true);

    const second = placeTile(board, { q: 1, r: 0 }, roll(1, 1), 1);
    expect(second.newDiscoveries.some((d) => d.sourceKind === 'edge')).toBe(true);
    expect(board.statistics.sharedEdges).toBeGreaterThanOrEqual(1);

    const third = placeTile(board, { q: 1, r: -1 }, roll(2, 2), 2);
    expect(third.newDiscoveries.some((d) => d.sourceKind === 'vertex')).toBe(true);
    expect(board.statistics.completedVertices).toBeGreaterThanOrEqual(1);
    expect(board.exactBitset.count).toBeGreaterThanOrEqual(3);

    restore();
  });

  it('reports material and die unlock thresholds from RGB cell progress', () => {
    expect(MATERIAL_UNLOCKS.glass).toBe(128);
    expect(MATERIAL_UNLOCKS.ink).toBe(512);
    expect(MATERIAL_UNLOCKS.neon).toBe(2048);
    expect(MATERIAL_UNLOCKS.prism).toBe(8192);
    expect(DIE_STYLE_UNLOCKS.orb).toBe(64);
    expect(DIE_STYLE_UNLOCKS.facet).toBe(512);
    expect(DIE_STYLE_UNLOCKS.halo).toBe(4096);

    const rgbBitset = new RgbCellBitset();
    let added = 0;
    for (let r5 = 0; r5 < 32 && added < 64; r5++) {
      for (let g5 = 0; g5 < 32 && added < 64; g5++) {
        const packed = ((r5 << 3) << 16) | ((g5 << 3) << 8) | (added << 3);
        if (rgbBitset.add(packed)) added++;
      }
    }
    expect(rgbBitset.count).toBe(64);
    expect(rgbBitset.count >= DIE_STYLE_UNLOCKS.orb).toBe(true);
  });

  it('builds export payload and recalculates derived state on import', () => {
    const restore = mockRandomSequence(Array.from({ length: 200 }, (_, i) => (i * 0.021) % 1));
    const board = createBoardState();
    const foundationAnchors = generateFoundationAnchors(12);
    const recipe = generateRoll(
      {
        foundationAnchors,
        foundationOrder: foundationAnchors,
        foundationIndex: 0,
        expandedAnchors: [],
        recentRing: [],
        reservoir: [],
        hueHistogram: board.hueHistogram,
        rollCount: 0,
        placementCount: 0,
        exactBitset: board.exactBitset,
        rgbBitset: board.rgbBitset,
        recentRolls: [],
      },
      0,
      Date.now(),
      () => 0,
    );
    placeTile(board, { q: 0, r: 0 }, recipe, 0);

    const meta = {
      worldId: 'test-world',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      baseHue: 12,
      foundationAnchors,
      expandedAnchors: [],
      rollCount: 1,
      placementCount: 1,
      pendingRoll: null,
      camera: { worldX: 0, worldY: 0, zoom: 1, velocityX: 0, velocityY: 0 },
      frontier: board.frontier.toArray(),
      recentRing: board.recentRing,
      reservoir: board.reservoir,
      hueHistogram: board.hueHistogram,
      statistics: board.statistics,
      unlockedMaterials: ['soft'],
      unlockedDieStyles: ['cube'],
    } as unknown as WorldMeta;

    const tiles = Array.from(board.tiles.values());
    const discoveries = Array.from(board.discoveries.values());
    const payload = buildExportPayload(meta, DEFAULT_SETTINGS, tiles, discoveries);
    expect(payload.format).toBe('kulur');
    expect(payload.version).toBe(1);
    expect(payload.appName).toBe('Kulur');
    expect(payload.world.tiles).toHaveLength(1);

    const derived = recalculateDerivedFromImport(tiles, discoveries);
    expect(derived.frontier.size()).toBe(6);
    expect(derived.exactBitset.count).toBe(discoveries.length);

    restore();
  });
});
