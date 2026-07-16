import { NEIGHBOR_DIRECTIONS } from '../constants';
import { mixTwoPacked, mixThreePacked } from '../color/mixing';
import { createColorRecord } from '../color/formatting';
import { neighborAt } from '../hex/axial';
import type { TileRecord } from '../types';

export type EdgeMix = {
  direction: number;
  neighborQ: number;
  neighborR: number;
  packed: number;
  hex: string;
};

export type VertexMix = {
  direction: number;
  packed: number;
  hex: string;
};

export function computeTileEdgeMixes(
  tile: TileRecord,
  getTileAt: (q: number, r: number) => TileRecord | null,
): EdgeMix[] {
  const coord = { q: tile.q, r: tile.r };
  const edges: EdgeMix[] = [];

  for (let d = 0; d < 6; d++) {
    const neighbor = neighborAt(coord, d);
    const neighborTile = getTileAt(neighbor.q, neighbor.r);
    if (!neighborTile) continue;
    const packed = mixTwoPacked(tile.packedColor, neighborTile.packedColor);
    edges.push({
      direction: d,
      neighborQ: neighbor.q,
      neighborR: neighbor.r,
      packed,
      hex: createColorRecord(packed).hex,
    });
  }

  return edges;
}

export function computeTileVertexMixes(
  tile: TileRecord,
  getTileAt: (q: number, r: number) => TileRecord | null,
): VertexMix[] {
  const coord = { q: tile.q, r: tile.r };
  const vertices: VertexMix[] = [];

  for (let d = 0; d < 6; d++) {
    const n1 = neighborAt(coord, d);
    const n2 = neighborAt(coord, (d + 1) % 6);
    const t1 = getTileAt(n1.q, n1.r);
    const t2 = getTileAt(n2.q, n2.r);
    if (!t1 || !t2) continue;
    const packed = mixThreePacked(tile.packedColor, t1.packedColor, t2.packedColor);
    vertices.push({
      direction: d,
      packed,
      hex: createColorRecord(packed).hex,
    });
  }

  return vertices;
}

export function formatParentType(type: string): string {
  switch (type) {
    case 'foundation':
      return 'Foundation';
    case 'recent':
      return 'Recent tile';
    case 'palette':
      return 'Palette anchor';
    case 'reservoir':
      return 'Board reservoir';
    case 'white':
      return 'White tint';
    case 'black':
      return 'Black shade';
    default:
      return type;
  }
}

export { NEIGHBOR_DIRECTIONS };
