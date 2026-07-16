import type { AxialCoordinate } from '../types';
import { axialKey } from './axial';

export class FrontierSet {
  private coords = new Map<string, AxialCoordinate>();

  constructor(initial: AxialCoordinate[] = []) {
    for (const c of initial) {
      this.coords.set(axialKey(c), c);
    }
  }

  has(coord: AxialCoordinate): boolean {
    return this.coords.has(axialKey(coord));
  }

  add(coord: AxialCoordinate): void {
    this.coords.set(axialKey(coord), coord);
  }

  remove(coord: AxialCoordinate): void {
    this.coords.delete(axialKey(coord));
  }

  toArray(): AxialCoordinate[] {
    return Array.from(this.coords.values());
  }

  clone(): FrontierSet {
    return new FrontierSet(this.toArray());
  }

  size(): number {
    return this.coords.size;
  }
}

export function updateFrontierOnPlacement(
  frontier: FrontierSet,
  placed: AxialCoordinate,
  occupied: Set<string>,
  getNeighbors: (c: AxialCoordinate) => AxialCoordinate[],
): void {
  frontier.remove(placed);
  for (const neighbor of getNeighbors(placed)) {
    const key = axialKey(neighbor);
    if (!occupied.has(key)) {
      frontier.add(neighbor);
    }
  }
}

export function rebuildFrontier(tiles: Map<string, AxialCoordinate>): FrontierSet {
  const occupied = new Set(tiles.keys());
  const frontier = new FrontierSet();
  for (const coord of tiles.values()) {
    for (const n of [
      { q: coord.q + 1, r: coord.r },
      { q: coord.q + 1, r: coord.r - 1 },
      { q: coord.q, r: coord.r - 1 },
      { q: coord.q - 1, r: coord.r },
      { q: coord.q - 1, r: coord.r + 1 },
      { q: coord.q, r: coord.r + 1 },
    ]) {
      if (!occupied.has(axialKey(n))) {
        frontier.add(n);
      }
    }
  }
  return frontier;
}

export function isLegalPlacement(
  coord: AxialCoordinate,
  occupied: Set<string>,
  isEmpty: boolean,
): boolean {
  const key = axialKey(coord);
  if (occupied.has(key)) return false;
  if (isEmpty) return coord.q === 0 && coord.r === 0;
  const neighbors = [
    { q: coord.q + 1, r: coord.r },
    { q: coord.q + 1, r: coord.r - 1 },
    { q: coord.q, r: coord.r - 1 },
    { q: coord.q - 1, r: coord.r },
    { q: coord.q - 1, r: coord.r + 1 },
    { q: coord.q, r: coord.r + 1 },
  ];
  return neighbors.some((n) => occupied.has(axialKey(n)));
}
