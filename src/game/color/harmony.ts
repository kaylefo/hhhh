import { HUE_BIN_COUNT, MIN_CHROMA_FOR_HUE } from '../constants';
import { oklabToOklch, packedToOklab } from './oklab';

export function hueBinFromPacked(packed: number): number | null {
  const oklch = oklabToOklch(packedToOklab(packed));
  if (oklch.C < MIN_CHROMA_FOR_HUE) return null;
  return Math.floor((oklch.h / 360) * HUE_BIN_COUNT) % HUE_BIN_COUNT;
}

export function hueBinCenter(bin: number): number {
  return ((bin + 0.5) / HUE_BIN_COUNT) * 360;
}

export function createHueHistogram(): Int32Array {
  return new Int32Array(HUE_BIN_COUNT);
}

export function incrementHueHistogram(histogram: Int32Array, packed: number): void {
  const bin = hueBinFromPacked(packed);
  if (bin !== null) histogram[bin]!++;
}

export function decrementHueHistogram(histogram: Int32Array, packed: number): void {
  const bin = hueBinFromPacked(packed);
  if (bin !== null && histogram[bin]! > 0) histogram[bin]!--;
}

export function findScarcestHueBin(histogram: Int32Array, randomPick: (count: number) => number): number {
  let minCount = Infinity;
  for (let i = 0; i < HUE_BIN_COUNT; i++) {
    if (histogram[i]! < minCount) minCount = histogram[i]!;
  }
  const candidates: number[] = [];
  for (let i = 0; i < HUE_BIN_COUNT; i++) {
    if (histogram[i] === minCount) candidates.push(i);
  }
  return candidates[randomPick(candidates.length)]!;
}

export function hueScarcity(histogram: Int32Array, bin: number | null): number {
  if (bin === null) return 0;
  let max = 0;
  for (let i = 0; i < HUE_BIN_COUNT; i++) {
    if (histogram[i]! > max) max = histogram[i]!;
  }
  const binCount = histogram[bin] ?? 0;
  return 1 - binCount / Math.max(1, max);
}

export function histogramDelta(from: Int32Array, to: Int32Array): Int32Array {
  const delta = new Int32Array(HUE_BIN_COUNT);
  for (let i = 0; i < HUE_BIN_COUNT; i++) {
    delta[i] = to[i]! - from[i]!;
  }
  return delta;
}

export function applyHistogramDelta(histogram: Int32Array, delta: Int32Array, sign: 1 | -1): void {
  for (let i = 0; i < HUE_BIN_COUNT; i++) {
    histogram[i]! += delta[i]! * sign;
  }
}
