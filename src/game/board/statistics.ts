import type { TileRecord, WorldStatistics } from '../types';
import { axialDistance } from '../hex/axial';
import { getBoardBounds } from './placement';

export function computeBoardStatistics(tiles: Map<string, TileRecord>, _stats: WorldStatistics): {
  avgNeighbors: number;
  width: number;
  height: number;
  furthestDistance: number;
} {
  if (tiles.size === 0) {
    return { avgNeighbors: 0, width: 0, height: 0, furthestDistance: 0 };
  }

  let totalNeighbors = 0;
  let furthest = 0;
  for (const tile of tiles.values()) {
    totalNeighbors += tile.neighborCount;
    furthest = Math.max(furthest, axialDistance({ q: tile.q, r: tile.r }, { q: 0, r: 0 }));
  }

  const bounds = getBoardBounds(tiles);
  return {
    avgNeighbors: totalNeighbors / tiles.size,
    width: bounds.maxQ - bounds.minQ + 1,
    height: bounds.maxR - bounds.minR + 1,
    furthestDistance: furthest,
  };
}

export function formatPlayTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
