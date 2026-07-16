import type { RollContext } from '../../src/game/roll/generator';
import {
  generateRoll,
  isExpansionRoll,
  updateRecentRing,
  updateReservoir,
  pickScarceBinFromHistogram,
} from '../../src/game/roll/generator';
import { createHueHistogram } from '../../src/game/color/harmony';
import { ExactColorBitset, RgbCellBitset } from '../../src/game/color/discovery';
import { generateFoundationAnchors } from '../../src/game/roll/palette';
import { createColorRecord } from '../../src/game/color/formatting';
import { RECENT_RING_SIZE, RESERVOIR_SIZE } from '../../src/game/constants';
import { mockRandomSequence } from '../helpers/random';

function makeContext(overrides: Partial<RollContext> = {}): RollContext {
  const foundationAnchors = generateFoundationAnchors(30);
  return {
    foundationAnchors,
    foundationOrder: foundationAnchors,
    foundationIndex: 0,
    expandedAnchors: [],
    recentRing: [],
    reservoir: [],
    hueHistogram: createHueHistogram(),
    rollCount: 0,
    placementCount: 0,
    exactBitset: new ExactColorBitset(),
    rgbBitset: new RgbCellBitset(),
    recentRolls: [],
    ...overrides,
  };
}

describe('roll generator basics', () => {
  it('identifies expansion rolls on multiples of 64 after foundation', () => {
    expect(isExpansionRoll(64, true)).toBe(true);
    expect(isExpansionRoll(128, true)).toBe(true);
    expect(isExpansionRoll(63, true)).toBe(false);
    expect(isExpansionRoll(64, false)).toBe(false);
  });

  it('returns foundation recipe while foundation index remains', () => {
    const ctx = makeContext();
    const recipe = generateRoll(ctx, 0, 1000, () => 0);
    expect(recipe.isFoundation).toBe(true);
    expect(recipe.parents).toHaveLength(1);
    expect(recipe.parents[0]!.type).toBe('foundation');
    expect(recipe.packedColor).toBe(ctx.foundationOrder[0]!.packed);
  });

  it('scores novelty using recent distance, hue scarcity, and bitsets', () => {
    const restore = mockRandomSequence(Array.from({ length: 200 }, () => 0.42));
    const ctx = makeContext({
      foundationIndex: 6,
      recentRolls: [0xff0000],
      placementCount: 20,
      recentRing: [0x00ff00],
      reservoir: [0x0000ff],
    });
    const recipe = generateRoll(ctx, 10, 2000, () => 0);
    restore();

    expect(recipe.isFoundation).toBe(false);
    expect(recipe.parents.length).toBeGreaterThanOrEqual(2);
    expect(recipe.oklab).toEqual(expect.objectContaining({ L: expect.any(Number), a: expect.any(Number), b: expect.any(Number) }));
    expect(recipe.hex).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('maintains recent ring and reservoir sizes', () => {
    const ring = updateRecentRing(Array.from({ length: RECENT_RING_SIZE }, (_, i) => i), 999);
    expect(ring).toHaveLength(RECENT_RING_SIZE);
    expect(ring[ring.length - 1]).toBe(999);

    const reservoir = updateReservoir(Array.from({ length: RESERVOIR_SIZE }, (_, i) => i), [42, 43]);
    expect(reservoir).toHaveLength(RESERVOIR_SIZE);
    expect(reservoir[reservoir.length - 1]).toBeDefined();
  });

  it('picks scarce hue bins from histogram', () => {
    const histogram = createHueHistogram();
    histogram[2] = 5;
    histogram[9] = 0;
    const bin = pickScarceBinFromHistogram(histogram);
    expect(bin).toBeGreaterThanOrEqual(0);
    expect(bin).toBeLessThan(histogram.length);
  });
});

describe('parent selection structure', () => {
  it('includes foundation fallback parents when pool is sparse', () => {
    const anchors = [createColorRecord(0xff0000), createColorRecord(0x00ff00)];
    const ctx = makeContext({
      foundationAnchors: anchors,
      foundationOrder: anchors,
      foundationIndex: 2,
      recentRing: [],
      reservoir: [],
      placementCount: 0,
    });
    const restore = mockRandomSequence(Array.from({ length: 100 }, () => 0.99));
    const recipe = generateRoll(ctx, 5, 3000, () => 0);
    restore();
    expect(recipe.parents.length).toBeGreaterThanOrEqual(2);
    expect(recipe.parents.every((p) => p.weight >= 0)).toBe(true);
  });
});
