import type { AxialCoordinate } from '../types';
import { NEIGHBOR_DIRECTIONS } from '../constants';

export function axialKey(coord: AxialCoordinate): string {
  return `${coord.q},${coord.r}`;
}

export function parseAxialKey(key: string): AxialCoordinate {
  const [q, r] = key.split(',').map(Number);
  return { q: q!, r: r! };
}

export function addAxial(a: AxialCoordinate, b: AxialCoordinate): AxialCoordinate {
  return { q: a.q + b.q, r: a.r + b.r };
}

export function neighborAt(coord: AxialCoordinate, direction: number): AxialCoordinate {
  const d = NEIGHBOR_DIRECTIONS[direction]!;
  return { q: coord.q + d.q, r: coord.r + d.r };
}

export function getNeighbors(coord: AxialCoordinate): AxialCoordinate[] {
  return NEIGHBOR_DIRECTIONS.map((d) => ({ q: coord.q + d.q, r: coord.r + d.r }));
}

export function axialDistance(a: AxialCoordinate, b: AxialCoordinate): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  const ds = -dq - dr;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
}

export function chunkCoord(q: number, r: number, chunkSize: number): { chunkQ: number; chunkR: number } {
  return {
    chunkQ: Math.floor(q / chunkSize),
    chunkR: Math.floor(r / chunkSize),
  };
}

export function localChunkCoord(q: number, r: number, chunkSize: number): { localQ: number; localR: number } {
  const mod = (n: number, m: number) => ((n % m) + m) % m;
  return {
    localQ: mod(q, chunkSize),
    localR: mod(r, chunkSize),
  };
}

export function worldFromAxial(q: number, r: number, radius: number): { x: number; y: number } {
  return {
    x: radius * Math.sqrt(3) * (q + r / 2),
    y: radius * 1.5 * r,
  };
}

export function axialFromWorld(x: number, y: number, radius: number): AxialCoordinate {
  const r = y / (radius * 1.5);
  const q = x / (radius * Math.sqrt(3)) - r / 2;
  return axialRound(q, r);
}

function axialRound(q: number, r: number): AxialCoordinate {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);
  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }
  return { q: rq, r: rr };
}

export function hexCorners(cx: number, cy: number, radius: number): { x: number; y: number }[] {
  const corners: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    corners.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  }
  return corners;
}
