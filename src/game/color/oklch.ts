export { oklabToOklch } from './oklab';

export function formatOklchDisplay(oklch: { L: number; C: number; h: number }): string {
  const lPct = (oklch.L * 100).toFixed(1);
  const c = oklch.C.toFixed(3);
  if (oklch.C < 0.000001) return `${lPct}% ${c} —`;
  return `${lPct}% ${c} ${oklch.h.toFixed(1)}°`;
}

export function formatHslDisplay(hsl: { h: number; s: number; l: number }): string {
  if (hsl.s < 0.5) return `—, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%`;
  return `${Math.round(hsl.h)}°, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%`;
}
