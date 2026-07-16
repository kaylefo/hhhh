import {
  axialKey,
  parseAxialKey,
  addAxial,
  neighborAt,
  getNeighbors,
  axialDistance,
  chunkCoord,
  localChunkCoord,
  worldFromAxial,
  axialFromWorld,
  hexCorners,
} from '../../src/game/hex/axial';
import { HEX_RADIUS, NEIGHBOR_DIRECTIONS } from '../../src/game/constants';

describe('axial coordinates', () => {
  it('round-trips coordinate keys', () => {
    const coord = { q: -3, r: 7 };
    expect(parseAxialKey(axialKey(coord))).toEqual(coord);
  });

  it('adds axial coordinates', () => {
    expect(addAxial({ q: 1, r: 2 }, { q: -1, r: 3 })).toEqual({ q: 0, r: 5 });
  });

  it('returns six neighbors in direction order', () => {
    const origin = { q: 0, r: 0 };
    const neighbors = getNeighbors(origin);
    expect(neighbors).toHaveLength(6);
    NEIGHBOR_DIRECTIONS.forEach((d, i) => {
      expect(neighbors[i]).toEqual({ q: d.q, r: d.r });
    });
  });

  it('neighborAt matches direction constants', () => {
    const coord = { q: 2, r: -1 };
    expect(neighborAt(coord, 0)).toEqual({ q: 3, r: -1 });
    expect(neighborAt(coord, 3)).toEqual({ q: 1, r: -1 });
  });

  it('computes axial distance symmetrically', () => {
    const a = { q: 0, r: 0 };
    const b = { q: 3, r: -2 };
    expect(axialDistance(a, b)).toBe(3);
    expect(axialDistance(b, a)).toBe(3);
  });

  it('uses floor division for negative chunk coordinates', () => {
    expect(chunkCoord(-1, 0, 24)).toEqual({ chunkQ: -1, chunkR: 0 });
    expect(chunkCoord(-25, -25, 24)).toEqual({ chunkQ: -2, chunkR: -2 });
  });

  it('wraps negative locals with positive modulo', () => {
    expect(localChunkCoord(-1, -1, 24)).toEqual({ localQ: 23, localR: 23 });
    expect(localChunkCoord(-25, 0, 24)).toEqual({ localQ: 23, localR: 0 });
  });

  it('converts between world and axial space', () => {
    const radius = HEX_RADIUS;
    const world = worldFromAxial(2, -1, radius);
    expect(world.x).toBeCloseTo(radius * Math.sqrt(3) * (2 + -1 / 2));
    expect(world.y).toBeCloseTo(radius * 1.5 * -1);

    const roundTrip = axialFromWorld(world.x, world.y, radius);
    expect(roundTrip).toEqual({ q: 2, r: -1 });
  });

  it('rounds near-boundary world points to nearest hex', () => {
    const radius = 44;
    const { x, y } = worldFromAxial(0, 0, radius);
    const nudged = axialFromWorld(x + radius * 0.2, y, radius);
    expect(axialDistance({ q: 0, r: 0 }, nudged)).toBeLessThanOrEqual(1);
  });

  it('produces six hex corners', () => {
    const corners = hexCorners(100, 200, 10);
    expect(corners).toHaveLength(6);
    for (const corner of corners) {
      const dx = corner.x - 100;
      const dy = corner.y - 200;
      expect(Math.hypot(dx, dy)).toBeCloseTo(10, 5);
    }
  });
});
