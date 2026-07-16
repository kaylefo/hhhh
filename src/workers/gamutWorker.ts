import type { DiscoveryRecord } from '../game/types';
import { oklabToOklch } from '../game/color/oklab';

export type GamutWorkerInput = {
  discoveries: DiscoveryRecord[];
  lightness: number;
  tolerance: number;
};

export type GamutWorkerPoint = {
  packed: number;
  x: number;
  y: number;
};

export function aggregateGamutPoints(input: GamutWorkerInput): GamutWorkerPoint[] {
  const points: GamutWorkerPoint[] = [];
  for (const d of input.discoveries) {
    const oklch = oklabToOklch(d.oklab);
    if (Math.abs(oklch.L - input.lightness) > input.tolerance) continue;
    const angle = (oklch.h * Math.PI) / 180;
    const radius = oklch.C * 180;
    points.push({
      packed: d.packed,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  }
  return points;
}
