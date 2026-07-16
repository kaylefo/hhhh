import type { ColorRecord } from '../types';
import { oklabToOklch, packedToOklab } from './oklab';
import { formatHex, rgbToHsl, unpackRgb } from './srgb';
import { formatHslDisplay, formatOklchDisplay } from './oklch';

export function createColorRecord(packed: number): ColorRecord {
  const rgb = unpackRgb(packed);
  const hsl = rgbToHsl(rgb);
  const oklab = packedToOklab(packed);
  const oklch = oklabToOklch(oklab);
  return {
    packed,
    hex: formatHex(packed),
    rgb,
    hsl,
    oklab,
    oklch,
  };
}

export function formatRgbDisplay(rgb: { r: number; g: number; b: number }): string {
  return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
}

export { formatHslDisplay, formatOklchDisplay };

export function rgbCellIndex(packed: number): number {
  const { r, g, b } = unpackRgb(packed);
  const r5 = r >> 3;
  const g5 = g >> 3;
  const b5 = b >> 3;
  return (r5 << 10) | (g5 << 5) | b5;
}

export function rgbCellProgressPercent(count: number, total = 32768): string {
  const pct = (count / total) * 100;
  if (pct < 1) return pct.toFixed(2);
  if (pct <= 10) return pct.toFixed(1);
  return Math.round(pct).toString();
}
