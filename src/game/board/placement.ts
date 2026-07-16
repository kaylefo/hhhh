import type { TileRecord, PlacementResult, RollRecipe, DiscoveryRecord } from '../types';
import { axialKey, getNeighbors, neighborAt } from '../hex/axial';
import { isLegalPlacement, updateFrontierOnPlacement, FrontierSet } from '../hex/frontier';
import {
  dedupePackedColors,
  createDiscoveryRecord,
  ExactColorBitset,
  RgbCellBitset,
} from '../color/discovery';
import { mixTwoPacked, mixThreePacked } from '../color/mixing';
import { packedToOklab } from '../color/oklab';
import { createColorRecord } from '../color/formatting';
import { incrementHueHistogram } from '../color/harmony';
import { randomInt } from '../random';
import type { WorldStatistics, UndoSnapshot } from '../types';

export type BoardState = {
  tiles: Map<string, TileRecord>;
  frontier: FrontierSet;
  exactBitset: ExactColorBitset;
  rgbBitset: RgbCellBitset;
  discoveries: Map<number, DiscoveryRecord>;
  statistics: WorldStatistics;
  hueHistogram: Int32Array;
  recentRing: number[];
  reservoir: number[];
  expandedAnchors: ReturnType<typeof createColorRecord>[];
};

export function createEmptyStatistics(): WorldStatistics {
  return {
    rolls: 0,
    placedTiles: 0,
    exactColors: 0,
    rgbCells: 0,
    sharedEdges: 0,
    completedVertices: 0,
    paletteAnchors: 0,
    largestPlacementDiscovery: 0,
    totalPlayTimeMs: 0,
    sessionStartMs: Date.now(),
  };
}

export function placeTile(
  state: BoardState,
  coord: { q: number; r: number },
  recipe: RollRecipe,
  rollIndex: number,
): PlacementResult {
  const key = axialKey(coord);
  const occupied = new Set(state.tiles.keys());
  const isEmpty = state.tiles.size === 0;

  if (!isLegalPlacement(coord, occupied, isEmpty)) {
    throw new Error('Illegal placement');
  }

  const frontierBefore = state.frontier.toArray();
  const statsBefore = { ...state.statistics };
  const recentRingBefore = [...state.recentRing];
  const reservoirBefore = [...state.reservoir];
  const histogramBefore = new Int32Array(state.hueHistogram);

  const neighbors = getNeighbors(coord);
  const occupiedNeighbors = neighbors.filter((n) => occupied.has(axialKey(n)));

  const tile: TileRecord = {
    q: coord.q,
    r: coord.r,
    packedColor: recipe.packedColor,
    hex: recipe.hex,
    rollIndex,
    placedAt: Date.now(),
    recipe,
    neighborCount: occupiedNeighbors.length,
  };

  const canonicalColors: { packed: number; kind: 'source' | 'edge' | 'vertex'; parents: number[]; weights: number[] }[] = [];

  canonicalColors.push({
    packed: recipe.packedColor,
    kind: 'source',
    parents: recipe.parents.map((p) => p.packedColor),
    weights: recipe.parents.map((p) => p.weight),
  });

  for (let d = 0; d < 6; d++) {
    const n = neighborAt(coord, d);
    const nKey = axialKey(n);
    const neighborTile = state.tiles.get(nKey);
    if (neighborTile) {
      const edgeColor = mixTwoPacked(recipe.packedColor, neighborTile.packedColor);
      canonicalColors.push({
        packed: edgeColor,
        kind: 'edge',
        parents: [recipe.packedColor, neighborTile.packedColor],
        weights: [0.5, 0.5],
      });
    }
  }

  for (let d = 0; d < 6; d++) {
    const n1 = neighborAt(coord, d);
    const n2 = neighborAt(coord, (d + 1) % 6);
    const t1 = state.tiles.get(axialKey(n1));
    const t2 = state.tiles.get(axialKey(n2));
    if (t1 && t2) {
      const vertexColor = mixThreePacked(recipe.packedColor, t1.packedColor, t2.packedColor);
      canonicalColors.push({
        packed: vertexColor,
        kind: 'vertex',
        parents: [recipe.packedColor, t1.packedColor, t2.packedColor],
        weights: [1 / 3, 1 / 3, 1 / 3],
      });
    }
  }

  const uniqueCanonical = dedupePackedColors(canonicalColors.map((c) => c.packed));
  const exactBitsAdded: number[] = [];
  const rgbCellsAdded: number[] = [];
  const discoveriesAdded: number[] = [];
  const newDiscoveries: DiscoveryRecord[] = [];

  for (const packed of uniqueCanonical) {
    const meta = canonicalColors.find((c) => c.packed === packed)!;
    if (state.exactBitset.add(packed)) {
      exactBitsAdded.push(packed);
      const record = createDiscoveryRecord(
        packed,
        packedToOklab(packed),
        meta.kind,
        coord,
        rollIndex,
        meta.parents,
        meta.weights,
        Date.now(),
      );
      state.discoveries.set(packed, record);
      discoveriesAdded.push(packed);
      newDiscoveries.push(record);
    }
    if (state.rgbBitset.add(packed)) {
      rgbCellsAdded.push(packed);
    }
  }

  state.tiles.set(key, tile);
  updateFrontierOnPlacement(state.frontier, coord, new Set(state.tiles.keys()), getNeighbors);

  for (const n of occupiedNeighbors) {
    const nTile = state.tiles.get(axialKey(n));
    if (nTile) {
      nTile.neighborCount = getNeighbors(n).filter((nn) => state.tiles.has(axialKey(nn))).length;
    }
  }

  incrementHueHistogram(state.hueHistogram, recipe.packedColor);
  state.recentRing.push(recipe.packedColor);
  if (state.recentRing.length > 32) state.recentRing.shift();

  const boardColors = Array.from(state.tiles.values()).map((t) => t.packedColor);
  if (boardColors.length > 0) {
    const sample = boardColors[randomInt(boardColors.length)]!;
    state.reservoir.push(sample);
    if (state.reservoir.length > 256) state.reservoir.shift();
  }

  let paletteAnchorAdded: number | null = null;
  if (recipe.isPaletteExpansion) {
    const anchor = createColorRecord(recipe.packedColor);
    state.expandedAnchors.push(anchor);
    paletteAnchorAdded = recipe.packedColor;
  }

  const sharedEdgesDelta = occupiedNeighbors.length;
  const verticesDelta = canonicalColors.filter((c) => c.kind === 'vertex').length;

  state.statistics.placedTiles++;
  state.statistics.exactColors = state.exactBitset.count;
  state.statistics.rgbCells = state.rgbBitset.count;
  state.statistics.sharedEdges += sharedEdgesDelta;
  state.statistics.completedVertices += verticesDelta;
  state.statistics.paletteAnchors = state.expandedAnchors.length + 6;
  state.statistics.largestPlacementDiscovery = Math.max(
    state.statistics.largestPlacementDiscovery,
    newDiscoveries.length,
  );

  const undoSnapshot: UndoSnapshot = {
    tile,
    frontierBefore,
    frontierAfter: state.frontier.toArray(),
    exactBitsAdded,
    rgbCellsAdded,
    discoveriesAdded,
    sharedEdgesDelta,
    verticesDelta,
    histogramDelta: histogramBefore,
    recentRingBefore,
    reservoirBefore,
    paletteAnchorAdded,
    statsBefore,
    cameraBefore: null,
    pendingRecipe: recipe,
  };

  return {
    tile,
    newDiscoveries,
    newExactCount: exactBitsAdded.length,
    newRgbCellCount: rgbCellsAdded.length,
    isPaletteExpansion: recipe.isPaletteExpansion,
    undoSnapshot,
  };
}

export function getBoardBounds(tiles: Map<string, TileRecord>): {
  minQ: number;
  maxQ: number;
  minR: number;
  maxR: number;
} {
  let minQ = 0;
  let maxQ = 0;
  let minR = 0;
  let maxR = 0;
  let first = true;
  for (const t of tiles.values()) {
    if (first) {
      minQ = maxQ = t.q;
      minR = maxR = t.r;
      first = false;
    } else {
      minQ = Math.min(minQ, t.q);
      maxQ = Math.max(maxQ, t.q);
      minR = Math.min(minR, t.r);
      maxR = Math.max(maxR, t.r);
    }
  }
  return { minQ, maxQ, minR, maxR };
}
