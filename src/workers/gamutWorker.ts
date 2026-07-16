import type { DiscoveryRecord } from '../game/types';
import { maxInGamutChroma } from '../game/color/gamut';

export type GamutWorkerInput = {
  discoveries: DiscoveryRecord[];
  lightness: number;
  tolerance: number;
  allLightness: boolean;
};

export type GamutAtlasPoint = {
  packed: number;
  hex: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
};

export function aggregateGamutPoints(input: GamutWorkerInput): GamutAtlasPoint[] {
  const points: GamutAtlasPoint[] = [];
  for (const d of input.discoveries) {
    const { L, C, h } = d.oklch;
    if (!input.allLightness && Math.abs(L - input.lightness) > input.tolerance) continue;

    const maxC = maxInGamutChroma(L, h);
    const normalizedRadius = maxC > 0 ? C / maxC : 0;
    const hueRad = (h * Math.PI) / 180 - Math.PI / 2;

    points.push({
      packed: d.packed,
      hex: d.hex,
      x: Math.cos(hueRad) * normalizedRadius,
      y: Math.sin(hueRad) * normalizedRadius,
      size: input.allLightness ? 2 : 2.5 + normalizedRadius * 1.5,
      opacity: input.allLightness ? 0.22 + L * 0.35 : 0.35 + L * 0.55,
    });
  }
  return points;
}

export function medianDiscoveryLightness(discoveries: DiscoveryRecord[]): number {
  if (discoveries.length === 0) return 0.5;
  const sorted = discoveries.map((d) => d.oklch.L).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}
