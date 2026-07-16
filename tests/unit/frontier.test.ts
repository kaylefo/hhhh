import {
  FrontierSet,
  updateFrontierOnPlacement,
  rebuildFrontier,
  isLegalPlacement,
} from '../../src/game/hex/frontier';
import { axialKey, getNeighbors } from '../../src/game/hex/axial';

describe('frontier set', () => {
  it('inserts and removes coordinates by key', () => {
    const frontier = new FrontierSet();
    const coord = { q: 1, r: 0 };
    expect(frontier.has(coord)).toBe(false);
    frontier.add(coord);
    expect(frontier.has(coord)).toBe(true);
    expect(frontier.size()).toBe(1);
    frontier.remove(coord);
    expect(frontier.has(coord)).toBe(false);
    expect(frontier.size()).toBe(0);
  });

  it('clones independently', () => {
    const frontier = new FrontierSet([{ q: 0, r: 1 }]);
    const clone = frontier.clone();
    clone.add({ q: 2, r: 0 });
    expect(frontier.has({ q: 2, r: 0 })).toBe(false);
    expect(clone.has({ q: 2, r: 0 })).toBe(true);
  });

  it('updates frontier on placement', () => {
    const frontier = new FrontierSet([{ q: 0, r: 0 }]);
    const occupied = new Set<string>();
    updateFrontierOnPlacement(frontier, { q: 0, r: 0 }, occupied, getNeighbors);
    expect(frontier.has({ q: 0, r: 0 })).toBe(false);
    for (const n of getNeighbors({ q: 0, r: 0 })) {
      expect(frontier.has(n)).toBe(true);
    }
  });

  it('rebuilds frontier from occupied tiles', () => {
    const tiles = new Map<string, { q: number; r: number }>([
      [axialKey({ q: 0, r: 0 }), { q: 0, r: 0 }],
    ]);
    const frontier = rebuildFrontier(tiles);
    expect(frontier.has({ q: 0, r: 0 })).toBe(false);
    expect(frontier.size()).toBe(6);
  });
});

describe('legal placement', () => {
  it('allows only origin on empty board', () => {
    const occupied = new Set<string>();
    expect(isLegalPlacement({ q: 0, r: 0 }, occupied, true)).toBe(true);
    expect(isLegalPlacement({ q: 1, r: 0 }, occupied, true)).toBe(false);
  });

  it('requires adjacency when board is non-empty', () => {
    const occupied = new Set([axialKey({ q: 0, r: 0 })]);
    expect(isLegalPlacement({ q: 1, r: 0 }, occupied, false)).toBe(true);
    expect(isLegalPlacement({ q: 3, r: 0 }, occupied, false)).toBe(false);
    expect(isLegalPlacement({ q: 0, r: 0 }, occupied, false)).toBe(false);
  });
});
