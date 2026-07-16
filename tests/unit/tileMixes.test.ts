import { describe, expect, it } from 'vitest';
import { mixTwoPacked } from '../../src/game/color/mixing';
import { computeTileEdgeMixes, computeTileVertexMixes } from '../../src/game/board/tileMixes';
import type { TileRecord, RollRecipe } from '../../src/game/types';

function makeTile(q: number, r: number, packed: number): TileRecord {
  const recipe: RollRecipe = {
    parents: [],
    oklab: { L: 0.5, a: 0, b: 0 },
    packedColor: packed,
    hex: `#${packed.toString(16).padStart(6, '0').toUpperCase()}`,
    includesWhite: false,
    includesBlack: false,
    rollIndex: 0,
    createdAt: 0,
    isFoundation: true,
    isPaletteExpansion: false,
  };
  return {
    q,
    r,
    packedColor: packed,
    hex: recipe.hex,
    rollIndex: 0,
    placedAt: 0,
    recipe,
    neighborCount: 0,
  };
}

describe('tileMixes', () => {
  it('computes edge mixes for occupied neighbors', () => {
    const center = makeTile(0, 0, 0xff0000);
    const neighbor = makeTile(1, 0, 0x0000ff);
    const getTileAt = (q: number, r: number) => {
      if (q === 0 && r === 0) return center;
      if (q === 1 && r === 0) return neighbor;
      return null;
    };

    const edges = computeTileEdgeMixes(center, getTileAt);
    expect(edges).toHaveLength(1);
    expect(edges[0]!.packed).toBe(mixTwoPacked(0xff0000, 0x0000ff));
  });

  it('computes vertex mixes when two neighbors complete a corner', () => {
    const center = makeTile(0, 0, 0xff0000);
    const n1 = makeTile(1, 0, 0x00ff00);
    const n2 = makeTile(1, -1, 0x0000ff);
    const getTileAt = (q: number, r: number) => {
      if (q === 0 && r === 0) return center;
      if (q === 1 && r === 0) return n1;
      if (q === 1 && r === -1) return n2;
      return null;
    };

    const vertices = computeTileVertexMixes(center, getTileAt);
    expect(vertices.length).toBeGreaterThan(0);
  });
});
