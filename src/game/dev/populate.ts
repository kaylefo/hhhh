import { DEV_FLAG } from '../constants';
import { generateRoll, pickScarceBinFromHistogram } from '../roll/generator';
import { placeTile, createEmptyStatistics, type BoardState } from '../board/placement';
import { FrontierSet } from '../hex/frontier';
import { ExactColorBitset, RgbCellBitset } from '../color/discovery';
import { createHueHistogram } from '../color/harmony';
import type { WorldMeta, RollRecipe } from '../types';

export function devPopulateBoard(meta: WorldMeta, count: number, board: BoardState): void {
  if (!DEV_FLAG) return;

  const coords = [{ q: 0, r: 0 }];
  const directions = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ];

  while (board.tiles.size < count && coords.length > 0) {
    const current = coords.shift()!;
    if (board.tiles.has(`${current.q},${current.r}`) && !(current.q === 0 && current.r === 0 && board.tiles.size === 0)) {
      continue;
    }

    const rollIndex = meta.rollCount + 1;
    const recipe: RollRecipe = generateRoll(
      {
        foundationAnchors: meta.foundationAnchors,
        foundationOrder: meta.foundationAnchors,
        foundationIndex: Math.min(6, meta.placementCount),
        expandedAnchors: meta.expandedAnchors,
        recentRing: meta.recentRing,
        reservoir: meta.reservoir,
        hueHistogram: meta.hueHistogram,
        rollCount: meta.rollCount,
        placementCount: meta.placementCount,
        exactBitset: board.exactBitset,
        rgbBitset: board.rgbBitset,
        recentRolls: [],
      },
      rollIndex,
      Date.now(),
      pickScarceBinFromHistogram,
    );

    try {
      placeTile(board, current, recipe, rollIndex);
      meta.placementCount++;
      meta.rollCount = rollIndex;
    } catch {
      break;
    }

    for (const d of directions) {
      coords.push({ q: current.q + d.q, r: current.r + d.r });
    }
  }
}

export function createDevBoardState(): BoardState {
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

if (typeof window !== 'undefined' && DEV_FLAG) {
  (window as unknown as { kulurDevPopulate?: (n: number) => void }).kulurDevPopulate = (n: number) => {
    console.info(`Dev populate requested for ${n} tiles — use from test harness only`);
  };
}
