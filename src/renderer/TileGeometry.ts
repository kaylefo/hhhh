import { HEX_RADIUS } from '@/game/constants';
import { hexCorners, neighborAt } from '@/game/hex/axial';
import { packedToOklab } from '@/game/color/oklab';
import type { OKLab } from '@/game/types';

export const VERTICES_PER_TILE = 13;
export const TRIANGLES_PER_TILE = 12;
export const INDICES_PER_TILE = TRIANGLES_PER_TILE * 3;

/** Perimeter order: corner0, edge0, corner1, edge1, … corner5, edge5. */
export const PERIMETER_VERTEX_COUNT = 12;

const CORNER_NEIGHBOR_DIRS: ReadonlyArray<[number, number]> = [
  [0, 5],
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
];

export type TileLookup = (q: number, r: number) => OKLab | null;

export function chunkKey(chunkQ: number, chunkR: number): string {
  return `${chunkQ},${chunkR}`;
}

export function tileChunkCoord(q: number, r: number, chunkSize: number): { chunkQ: number; chunkR: number } {
  return {
    chunkQ: Math.floor(q / chunkSize),
    chunkR: Math.floor(r / chunkSize),
  };
}

export function getHexCenter(q: number, r: number, radius = HEX_RADIUS): { x: number; y: number } {
  return {
    x: radius * Math.sqrt(3) * (q + r / 2),
    y: radius * 1.5 * r,
  };
}

export function getTileVertexPositions(
  cx: number,
  cy: number,
  radius = HEX_RADIUS,
): Float32Array {
  const positions = new Float32Array(VERTICES_PER_TILE * 2);
  positions[0] = cx;
  positions[1] = cy;

  const corners = hexCorners(cx, cy, radius);
  for (let i = 0; i < 6; i++) {
    const corner = corners[i]!;
    const next = corners[(i + 1) % 6]!;
    const perimeterCorner = 1 + i * 2;
    const perimeterEdge = perimeterCorner + 1;
    positions[perimeterCorner * 2] = corner.x;
    positions[perimeterCorner * 2 + 1] = corner.y;
    positions[perimeterEdge * 2] = (corner.x + next.x) * 0.5;
    positions[perimeterEdge * 2 + 1] = (corner.y + next.y) * 0.5;
  }
  return positions;
}

export function getTileLocalCoords(): Float32Array {
  const locals = new Float32Array(VERTICES_PER_TILE * 2);
  locals[0] = 0;
  locals[1] = 0;

  for (let i = 0; i < 6; i++) {
    const angleCorner = (Math.PI / 180) * (60 * i - 30);
    const angleNext = (Math.PI / 180) * (60 * ((i + 1) % 6) - 30);
    const perimeterCorner = 1 + i * 2;
    const perimeterEdge = perimeterCorner + 1;
    locals[perimeterCorner * 2] = Math.cos(angleCorner) * 0.95;
    locals[perimeterCorner * 2 + 1] = Math.sin(angleCorner) * 0.95;
    locals[perimeterEdge * 2] = (Math.cos(angleCorner) + Math.cos(angleNext)) * 0.47;
    locals[perimeterEdge * 2 + 1] = (Math.sin(angleCorner) + Math.sin(angleNext)) * 0.47;
  }
  return locals;
}

export function buildTileIndices(baseVertex: number): Uint32Array {
  const indices = new Uint32Array(INDICES_PER_TILE);
  for (let i = 0; i < PERIMETER_VERTEX_COUNT; i++) {
    const next = (i + 1) % PERIMETER_VERTEX_COUNT;
    const tri = i * 3;
    indices[tri] = baseVertex;
    indices[tri + 1] = baseVertex + 1 + i;
    indices[tri + 2] = baseVertex + 1 + next;
  }
  return indices;
}

function averageOklab(colors: OKLab[]): OKLab {
  if (colors.length === 0) return { L: 0.5, a: 0, b: 0 };
  let L = 0;
  let a = 0;
  let b = 0;
  for (const c of colors) {
    L += c.L;
    a += c.a;
    b += c.b;
  }
  const n = colors.length;
  return { L: L / n, a: a / n, b: b / n };
}

export function buildTileOklabColors(
  q: number,
  r: number,
  center: OKLab,
  lookup: TileLookup,
): Float32Array {
  const colors = new Float32Array(VERTICES_PER_TILE * 3);
  colors[0] = center.L;
  colors[1] = center.a;
  colors[2] = center.b;

  const coord = { q, r };
  for (let i = 0; i < 6; i++) {
    const [dirA, dirB] = CORNER_NEIGHBOR_DIRS[i]!;
    const cornerSamples = [center];
    const na = neighborAt(coord, dirA);
    const nb = neighborAt(coord, dirB);
    const nA = lookup(na.q, na.r);
    const nB = lookup(nb.q, nb.r);
    if (nA) cornerSamples.push(nA);
    if (nB) cornerSamples.push(nB);
    const corner = averageOklab(cornerSamples);

    const edgeSamples = [center];
    const edgeCoord = neighborAt(coord, i);
    const edgeNeighbor = lookup(edgeCoord.q, edgeCoord.r);
    if (edgeNeighbor) edgeSamples.push(edgeNeighbor);
    const edge = averageOklab(edgeSamples);

    const perimeterCorner = 1 + i * 2;
    const perimeterEdge = perimeterCorner + 1;
    colors[perimeterCorner * 3] = corner.L;
    colors[perimeterCorner * 3 + 1] = corner.a;
    colors[perimeterCorner * 3 + 2] = corner.b;
    colors[perimeterEdge * 3] = edge.L;
    colors[perimeterEdge * 3 + 1] = edge.a;
    colors[perimeterEdge * 3 + 2] = edge.b;
  }

  return colors;
}

export function tilePatternSeed(q: number, r: number): number {
  return ((q * 73856093) ^ (r * 19349663)) * 0.000001;
}

export function tileFlags(selected: boolean, highlighted: boolean): number {
  return (selected ? 1 : 0) + (highlighted ? 2 : 0);
}

export function oklabFromPacked(packed: number): OKLab {
  return packedToOklab(packed);
}

export const TILE_LOCAL_TEMPLATE = getTileLocalCoords();
