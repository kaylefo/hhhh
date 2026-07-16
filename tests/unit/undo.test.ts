import { ExactColorBitset, RgbCellBitset } from '../../src/game/color/discovery';
import { createHueHistogram } from '../../src/game/color/harmony';
import { FrontierSet } from '../../src/game/hex/frontier';
import {
  createEmptyStatistics,
  placeTile,
  type BoardState,
} from '../../src/game/board/placement';
import { applyUndo } from '../../src/game/board/undo';
import { generateRoll } from '../../src/game/roll/generator';
import { generateFoundationAnchors } from '../../src/game/roll/palette';
import { mockRandomSequence } from '../helpers/random';

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

describe('undo', () => {
  it('reverses exact and RGB bits added by a placement', () => {
    const restore = mockRandomSequence(Array.from({ length: 200 }, (_, i) => (i * 0.017) % 1));
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
      1,
      Date.now(),
      () => 0,
    );

    const placement = placeTile(board, { q: 0, r: 0 }, recipe, 1);
    const exactBeforeUndo = board.exactBitset.count;
    const rgbBeforeUndo = board.rgbBitset.count;

    applyUndo(board, placement.undoSnapshot);

    expect(board.tiles.size).toBe(0);
    expect(board.exactBitset.count).toBeLessThan(exactBeforeUndo);
    for (const packed of placement.undoSnapshot.exactBitsAdded) {
      expect(board.exactBitset.has(packed)).toBe(false);
    }
    for (const cell of placement.undoSnapshot.rgbCellsAdded) {
      expect(board.rgbBitset.has(cell)).toBe(false);
    }
    expect(board.rgbBitset.count).toBeLessThanOrEqual(rgbBeforeUndo);

    restore();
  });
});
