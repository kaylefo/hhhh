import {
  mixOklab,
  mixPacked,
  mixTwoPacked,
  mixThreePacked,
  normalizeWeights,
  parentsTooSimilar,
} from '../../src/game/color/mixing';
import { packedToOklab, deltaEOK } from '../../src/game/color/oklab';
import { packRgb, formatHex } from '../../src/game/color/srgb';

describe('color mixing', () => {
  const red = packRgb(255, 0, 0);
  const blue = packRgb(0, 0, 255);
  const green = packRgb(0, 255, 0);

  it('mixes two colors at equal weight in OKLab', () => {
    const mixed = mixTwoPacked(red, blue);
    const manual = mixOklab([packedToOklab(red), packedToOklab(blue)], [0.5, 0.5]);
    expect(formatHex(mixed)).toMatch(/^#[0-9A-F]{6}$/);
    expect(deltaEOK(packedToOklab(mixed), manual)).toBeLessThan(0.05);
  });

  it('mixes three colors with equal thirds', () => {
    const mixed = mixThreePacked(red, green, blue);
    const manual = mixOklab(
      [packedToOklab(red), packedToOklab(green), packedToOklab(blue)],
      [1 / 3, 1 / 3, 1 / 3],
    );
    expect(deltaEOK(packedToOklab(mixed), manual)).toBeLessThan(0.05);
  });

  it('normalizes arbitrary weights to sum to one', () => {
    const normalized = normalizeWeights([2, 3, 5]);
    expect(normalized.reduce((s, w) => s + w, 0)).toBeCloseTo(1, 10);
    expect(normalized).toEqual([0.2, 0.3, 0.5]);
  });

  it('respects custom weights in mixPacked', () => {
    const mixed = mixPacked([red, blue], [0.75, 0.25]);
    const manual = mixOklab([packedToOklab(red), packedToOklab(blue)], [0.75, 0.25]);
    expect(deltaEOK(packedToOklab(mixed), manual)).toBeLessThan(0.05);
  });

  it('detects overly similar parents', () => {
    const a = packedToOklab(red);
    const b = packedToOklab(packRgb(254, 1, 0));
    expect(parentsTooSimilar(a, b)).toBe(true);
    expect(parentsTooSimilar(a, packedToOklab(blue))).toBe(false);
  });
});
