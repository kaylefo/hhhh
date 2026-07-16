import {
  hueBinFromPacked,
  hueBinCenter,
  createHueHistogram,
  incrementHueHistogram,
  decrementHueHistogram,
  findScarcestHueBin,
  hueScarcity,
  histogramDelta,
  applyHistogramDelta,
} from '../../src/game/color/harmony';
import { packRgb } from '../../src/game/color/srgb';
import { HUE_BIN_COUNT, MIN_CHROMA_FOR_HUE } from '../../src/game/constants';

describe('hue histogram', () => {
  it('returns null for low-chroma colors', () => {
    const gray = packRgb(128, 128, 128);
    expect(hueBinFromPacked(gray)).toBeNull();
  });

  it('bins saturated colors into 24 bins', () => {
    const red = packRgb(255, 0, 0);
    const bin = hueBinFromPacked(red);
    expect(bin).not.toBeNull();
    expect(bin!).toBeGreaterThanOrEqual(0);
    expect(bin!).toBeLessThan(HUE_BIN_COUNT);
    expect(hueBinCenter(bin!)).toBeCloseTo(((bin! + 0.5) / HUE_BIN_COUNT) * 360, 0);
  });

  it('increments and decrements histogram counts', () => {
    const histogram = createHueHistogram();
    const color = packRgb(0, 180, 255);
    incrementHueHistogram(histogram, color);
    const bin = hueBinFromPacked(color);
    if (bin !== null) {
      expect(histogram[bin]).toBe(1);
      decrementHueHistogram(histogram, color);
      expect(histogram[bin]).toBe(0);
    } else {
      expect(MIN_CHROMA_FOR_HUE).toBeGreaterThan(0);
    }
  });

  it('finds scarcest bins with deterministic picker', () => {
    const histogram = createHueHistogram();
    histogram.fill(5);
    histogram[7] = 0;
    histogram[11] = 0;
    const pick = findScarcestHueBin(histogram, () => 1);
    expect([7, 11]).toContain(pick);
  });

  it('computes scarcity relative to max bin count', () => {
    const histogram = createHueHistogram();
    histogram[2] = 10;
    histogram[5] = 2;
    expect(hueScarcity(histogram, 5)).toBeCloseTo(1 - 2 / 10, 5);
    expect(hueScarcity(histogram, null)).toBe(0);
  });

  it('applies histogram deltas forward and backward', () => {
    const from = createHueHistogram();
    const to = createHueHistogram();
    to[4] = 3;
    to[8] = 1;
    const delta = histogramDelta(from, to);
    const working = createHueHistogram();
    applyHistogramDelta(working, delta, 1);
    expect(working[4]).toBe(3);
    applyHistogramDelta(working, delta, -1);
    expect(working[4]).toBe(0);
  });
});
