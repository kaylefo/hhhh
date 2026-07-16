import type { OKLab } from '../types';
import { gamutMapToPacked } from './gamut';
import { deltaEOK, linearRgbToOklab } from './oklab';
import { randomExp, randomUnit } from '../random';

export function mixOklab(colors: OKLab[], weights: number[]): OKLab {
  const total = weights.reduce((s, w) => s + w, 0);
  const normalized = weights.map((w) => w / total);
  let L = 0;
  let a = 0;
  let b = 0;
  for (let i = 0; i < colors.length; i++) {
    L += colors[i]!.L * normalized[i]!;
    a += colors[i]!.a * normalized[i]!;
    b += colors[i]!.b * normalized[i]!;
  }
  return { L, a, b };
}

export function mixPacked(colors: number[], weights: number[]): number {
  const oklabs = colors.map((c) => {
    const [r, g, b] = [
      ((c >> 16) & 0xff) / 255,
      ((c >> 8) & 0xff) / 255,
      (c & 0xff) / 255,
    ].map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return linearRgbToOklab(r, g, b);
  });
  const mixed = mixOklab(oklabs, weights);
  return gamutMapToPacked(mixed);
}

export function mixTwoPacked(a: number, b: number): number {
  return mixPacked([a, b], [0.5, 0.5]);
}

export function mixThreePacked(a: number, b: number, c: number): number {
  return mixPacked([a, b, c], [1 / 3, 1 / 3, 1 / 3]);
}

export function normalizeWeights(weights: number[]): number[] {
  const total = weights.reduce((s, w) => s + w, 0);
  return weights.map((w) => w / total);
}

export function generateDominantWeights(parentCount: number): number[] {
  const dominantIdx = Math.floor(randomUnit() * parentCount);
  const dominantWeight = randomUnit() * 0.3 + 0.52;
  const remaining = 1 - dominantWeight;
  const es = Array.from({ length: parentCount - 1 }, () => randomExp());
  const esTotal = es.reduce((s, e) => s + e, 0);
  const weights = new Array<number>(parentCount).fill(0);
  let ei = 0;
  for (let i = 0; i < parentCount; i++) {
    if (i === dominantIdx) {
      weights[i] = dominantWeight;
    } else {
      weights[i] = (es[ei]! / esTotal) * remaining;
      ei++;
    }
  }
  return weights;
}

export function generateBalancedWeights(parentCount: number): number[] {
  const es = Array.from({ length: parentCount }, () => randomExp());
  return normalizeWeights(es);
}

export function parentsTooSimilar(a: OKLab, b: OKLab): boolean {
  return deltaEOK(a, b) < 0.015;
}
