import type { OKLab } from '../types';
import { oklabToLinearRgb, oklabToOklch, oklchToOklab } from './oklab';
import { packedFromLinearRgb } from './srgb';

export function isLinearRgbInGamut(r: number, g: number, b: number): boolean {
  return r >= -0.0000001 && r <= 1.0000001 && g >= -0.0000001 && g <= 1.0000001 && b >= -0.0000001 && b <= 1.0000001;
}

export function isOklabInGamut(oklab: OKLab): boolean {
  const [r, g, b] = oklabToLinearRgb(oklab);
  return isLinearRgbInGamut(r, g, b);
}

export function gamutMapOklab(oklab: OKLab): OKLab {
  const oklch = oklabToOklch(oklab);
  const L = Math.min(1, Math.max(0, oklch.L));
  const h = oklch.h;
  const originalC = oklch.C;

  const testOklch = (c: number): boolean => {
    const [r, g, b] = oklabToLinearRgb(oklchToOklab({ L, C: c, h }));
    return isLinearRgbInGamut(r, g, b);
  };

  if (testOklch(originalC)) {
    return oklchToOklab({ L, C: originalC, h });
  }

  let low = 0;
  let high = originalC;
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    if (testOklch(mid)) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return oklchToOklab({ L, C: low, h });
}

export function gamutMapToPacked(oklab: OKLab): number {
  const mapped = gamutMapOklab(oklab);
  const [r, g, b] = oklabToLinearRgb(mapped);
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return packedFromLinearRgb(clamp(r), clamp(g), clamp(b));
}

export function maxInGamutChroma(L: number, h: number, maxSearch = 0.4): number {
  let low = 0;
  let high = maxSearch;
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    const oklab = oklchToOklab({ L, C: mid, h });
    if (isOklabInGamut(oklab)) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return low;
}

export function normalizeChromaAtHue(L: number, h: number, C: number): number {
  const maxC = maxInGamutChroma(L, h);
  return maxC > 0 ? C / maxC : 0;
}
