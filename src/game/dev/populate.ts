import { DEV_FLAG } from '../constants';
import { generateRoll, pickScarceBinFromHistogram } from '../roll/generator';
import { placeTile, createEmptyStatistics, type BoardState } from '../board/placement';
import { FrontierSet } from '../hex/frontier';
import { ExactColorBitset, RgbCellBitset } from '../color/discovery';
import { createHueHistogram } from '../color/harmony';
import { axialKey } from '../hex/axial';
import type { WorldMeta } from '../types';

export function devPopulateBoard(meta: WorldMeta, count: number, board: BoardState): number {
  if (!DEV_FLAG) return 0;

  const queue: { q: number; r: number }[] = [{ q: 0, r: 0 }];
  const seen = new Set<string>();
  let placed = 0;

  while (board.tiles.size < count && queue.length > 0) {
    const current = queue.shift()!;
    const key = axialKey(current);
    if (seen.has(key)) continue;
    seen.add(key);

    const occupied = new Set(board.tiles.keys());
    const isEmpty = board.tiles.size === 0;
    const legal =
      isEmpty
        ? current.q === 0 && current.r === 0
        : !occupied.has(key) &&
          [
            { q: 1, r: 0 },
            { q: 1, r: -1 },
            { q: 0, r: -1 },
            { q: -1, r: 0 },
            { q: -1, r: 1 },
            { q: 0, r: 1 },
          ].some((d) => occupied.has(axialKey({ q: current.q + d.q, r: current.r + d.r })));

    if (!legal) continue;

    const rollIndex = meta.rollCount + 1;
    const recipe = generateRoll(
      {
        foundationAnchors: meta.foundationAnchors,
        foundationOrder: meta.foundationAnchors,
        foundationIndex: Math.min(6, meta.placementCount),
        expandedAnchors: meta.expandedAnchors,
        recentRing: board.recentRing,
        reservoir: board.reservoir,
        hueHistogram: board.hueHistogram,
        rollCount: meta.rollCount,
        placementCount: board.tiles.size,
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
      placed++;
    } catch {
      continue;
    }

    for (const d of [
      { q: 1, r: 0 },
      { q: 1, r: -1 },
      { q: 0, r: -1 },
      { q: -1, r: 0 },
      { q: -1, r: 1 },
      { q: 0, r: 1 },
    ]) {
      queue.push({ q: current.q + d.q, r: current.r + d.r });
    }
  }

  return placed;
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
  (window as unknown as { kulurDevPopulate?: (n: number) => Promise<number> }).kulurDevPopulate = async (
    n: number,
  ) => {
    const { useGameStore } = await import('../../state/gameStore');
    const state = useGameStore.getState();
    const meta = state.meta;
    if (!meta) return 0;
    const board = {
      tiles: new Map(state.tiles),
      frontier: state.frontier.clone(),
      exactBitset: state.exactBitset,
      rgbBitset: state.rgbBitset,
      discoveries: new Map(state.discoveries.map((d) => [d.packed, d])),
      statistics: { ...meta.statistics },
      hueHistogram: meta.hueHistogram,
      recentRing: [...meta.recentRing],
      reservoir: [...meta.reservoir],
      expandedAnchors: [...meta.expandedAnchors],
    };
    const placed = devPopulateBoard(meta, n, board);
    useGameStore.setState({
      tiles: board.tiles,
      frontier: board.frontier,
      discoveries: Array.from(board.discoveries.values()),
      exactColorCount: board.exactBitset.count,
      rgbCellCount: board.rgbBitset.count,
      exactBitset: board.exactBitset,
      rgbBitset: board.rgbBitset,
      meta: { ...meta },
    });
    console.info(`Dev populate placed ${placed} tiles (target ${n})`);
    return placed;
  };
}
