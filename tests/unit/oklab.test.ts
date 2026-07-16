import {
  linearRgbToOklab,
  oklabToLinearRgb,
  packedToOklab,
  oklabToPacked,
  deltaEOK,
  oklabToOklch,
  oklchToOklab,
} from '../../src/game/color/oklab';
import { BLACK_PACKED, WHITE_PACKED, packRgb } from '../../src/game/color/srgb';

describe('OKLab color space', () => {
  it('maps white and black to expected lightness', () => {
    const white = packedToOklab(WHITE_PACKED);
    const black = packedToOklab(BLACK_PACKED);
    expect(white.L).toBeCloseTo(1, 2);
    expect(black.L).toBeCloseTo(0, 2);
    expect(Math.hypot(white.a, white.b)).toBeLessThan(0.01);
    expect(Math.hypot(black.a, black.b)).toBeLessThan(0.01);
  });

  it('round-trips linear rgb through OKLab', () => {
    const packed = packRgb(120, 180, 40);
    const oklab = packedToOklab(packed);
    const roundTrip = oklabToPacked(oklab);
    expect(roundTrip).toBe(packed);
  });

  it('round-trips oklab via linear rgb directly', () => {
    const sample = linearRgbToOklab(0.3, 0.5, 0.2);
    const [r, g, b] = oklabToLinearRgb(sample);
    const roundTrip = linearRgbToOklab(r, g, b);
    expect(roundTrip.L).toBeCloseTo(sample.L, 4);
    expect(roundTrip.a).toBeCloseTo(sample.a, 4);
    expect(roundTrip.b).toBeCloseTo(sample.b, 4);
  });

  it('computes deltaEOK as Euclidean distance', () => {
    const a = { L: 0.5, a: 0.1, b: -0.05 };
    const b = { L: 0.52, a: 0.08, b: -0.02 };
    expect(deltaEOK(a, b)).toBeCloseTo(Math.sqrt(0.02 ** 2 + 0.02 ** 2 + 0.03 ** 2), 6);
    expect(deltaEOK(a, a)).toBe(0);
  });

  it('converts between OKLab and OKLCH', () => {
    const oklab = packedToOklab(packRgb(200, 50, 100));
    const oklch = oklabToOklch(oklab);
    expect(oklch.L).toBeCloseTo(oklab.L, 6);
    expect(oklch.C).toBeCloseTo(Math.hypot(oklab.a, oklab.b), 6);
    const back = oklchToOklab(oklch);
    expect(back.L).toBeCloseTo(oklab.L, 4);
    expect(back.a).toBeCloseTo(oklab.a, 4);
    expect(back.b).toBeCloseTo(oklab.b, 4);
  });
});
