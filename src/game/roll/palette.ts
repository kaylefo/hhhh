import type { ColorRecord } from '../types';
import { gamutMapToPacked, maxInGamutChroma } from '../color/gamut';
import { oklchToOklab } from '../color/oklab';
import { createColorRecord } from '../color/formatting';
import { randomRange, shuffleInPlace } from '../random';

const FOUNDATION_SPECS = [
  { L: 0.66, C: 0.24, hOffset: 0 },
  { L: 0.74, C: 0.2, hOffset: 60 },
  { L: 0.79, C: 0.18, hOffset: 120 },
  { L: 0.7, C: 0.21, hOffset: 180 },
  { L: 0.62, C: 0.24, hOffset: 240 },
  { L: 0.71, C: 0.22, hOffset: 300 },
];

export function generateBaseHue(): number {
  return randomRange(0, 360);
}

export function generateFoundationAnchors(baseHue: number): ColorRecord[] {
  const anchors = FOUNDATION_SPECS.map(({ L, C, hOffset }) => {
    const h = ((baseHue + hOffset) % 360 + 360) % 360;
    const packed = gamutMapToPacked(oklchToOklab({ L, C, h }));
    return createColorRecord(packed);
  });
  return shuffleInPlace(anchors);
}

export function createExpansionAnchor(hue: number): ColorRecord {
  const L = randomRange(0.58, 0.8);
  const h = hue;
  const maxC = maxInGamutChroma(L, h);
  const C = maxC * 0.88;
  const packed = gamutMapToPacked(oklchToOklab({ L, C, h }));
  return createColorRecord(packed);
}
