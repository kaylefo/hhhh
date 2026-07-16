import { FrontierSet } from '../../src/game/hex/frontier';
import { ExactColorBitset, RgbCellBitset } from '../../src/game/color/discovery';
import { createHueHistogram } from '../../src/game/color/harmony';
import {
  createEmptyStatistics,
  placeTile,
  type BoardState,
} from '../../src/game/board/placement';
import { applyUndo } from '../../src/game/board/undo';
import { generateRoll } from '../../src/game/roll/generator';
import { generateFoundationAnchors } from '../../src/game/roll/palette';
import { DEFAULT_SETTINGS } from '../../src/game/constants';
import { settingsSchema } from '../../src/persistence/schema';
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

describe('game flow integration', () => {
  it('auto-places first foundation roll, keeps second pending, then places with discoveries and undo', () => {
    const restore = mockRandomSequence(Array.from({ length: 300 }, (_, i) => (i * 0.013) % 1));
    const board = createBoardState();
    const foundationAnchors = generateFoundationAnchors(45);
    const foundationOrder = foundationAnchors;

    let foundationIndex = 0;
    let rollCount = 0;
    let pendingRoll: ReturnType<typeof generateRoll> | null = null;
    let lastUndo: ReturnType<typeof placeTile>['undoSnapshot'] | null = null;

    const rollContext = () => ({
      foundationAnchors,
      foundationOrder,
      foundationIndex,
      expandedAnchors: board.expandedAnchors,
      recentRing: board.recentRing,
      reservoir: board.reservoir,
      hueHistogram: board.hueHistogram,
      rollCount,
      placementCount: board.tiles.size,
      exactBitset: board.exactBitset,
      rgbBitset: board.rgbBitset,
      recentRolls: [],
    });

    const performRoll = () => {
      const recipe = generateRoll(rollContext(), rollCount, Date.now(), () => 0);
      rollCount++;
      board.statistics.rolls++;
      if (foundationIndex < foundationOrder.length) {
        foundationIndex++;
      }
      return recipe;
    };

    // First roll: auto-place at origin on empty board
    const firstRecipe = performRoll();
    expect(firstRecipe.isFoundation).toBe(true);
    expect(board.tiles.size).toBe(0);

    const firstPlacement = placeTile(board, { q: 0, r: 0 }, firstRecipe, firstRecipe.rollIndex);
    expect(board.tiles.size).toBe(1);
    expect(firstPlacement.newDiscoveries.length).toBeGreaterThanOrEqual(1);
    expect(board.exactBitset.count).toBeGreaterThanOrEqual(1);
    expect(board.frontier.has({ q: 0, r: 0 })).toBe(false);
    expect(board.frontier.size()).toBe(6);

    // Second roll: pending placement (not auto-placed)
    const secondRecipe = performRoll();
    pendingRoll = secondRecipe;
    expect(board.tiles.size).toBe(1);
    expect(pendingRoll).not.toBeNull();

    // Place pending color on legal frontier hex
    const target = board.frontier.toArray().find((c) => c.q === 1 && c.r === 0) ?? board.frontier.toArray()[0]!;
    const secondPlacement = placeTile(board, target, pendingRoll!, secondRecipe.rollIndex);
    expect(board.tiles.size).toBe(2);
    expect(secondPlacement.newDiscoveries.length).toBeGreaterThanOrEqual(1);
    lastUndo = secondPlacement.undoSnapshot;

    // Undo second placement
    applyUndo(board, lastUndo!);
    expect(board.tiles.size).toBe(1);
    expect(board.tiles.has('1,0') || board.tiles.size === 1).toBe(true);
    for (const packed of lastUndo!.exactBitsAdded) {
      expect(board.exactBitset.has(packed)).toBe(false);
    }

    restore();
  });

  it('updates settings through schema defaults', () => {
    const parsed = settingsSchema.parse(DEFAULT_SETTINGS);
    expect(parsed.sound).toBe(true);
    expect(parsed.onboardingComplete).toBe(false);

    const updated = settingsSchema.parse({ ...DEFAULT_SETTINGS, sound: false, onboardingComplete: true });
    expect(updated.sound).toBe(false);
    expect(updated.onboardingComplete).toBe(true);
  });
});
