import {
  isLinearRgbInGamut,
  isOklabInGamut,
  gamutMapOklab,
  gamutMapToPacked,
  maxInGamutChroma,
  normalizeChromaAtHue,
} from '../../src/game/color/gamut';
import { oklchToOklab, packedToOklab } from '../../src/game/color/oklab';
import { packRgb } from '../../src/game/color/srgb';

describe('gamut detection', () => {
  it('accepts in-gamut linear rgb', () => {
    expect(isLinearRgbInGamut(0.2, 0.4, 0.6)).toBe(true);
    expect(isLinearRgbInGamut(1.2, 0.4, 0.6)).toBe(false);
    expect(isLinearRgbInGamut(0.2, -0.01, 0.6)).toBe(false);
  });

  it('detects common srgb colors as in gamut', () => {
    expect(isOklabInGamut(packedToOklab(packRgb(128, 64, 200)))).toBe(true);
  });

  it('detects hyper-saturated OKLCH as out of gamut', () => {
    const out = oklchToOklab({ L: 0.7, C: 0.5, h: 20 });
    expect(isOklabInGamut(out)).toBe(false);
  });
});

describe('gamut mapping', () => {
  it('leaves in-gamut colors unchanged', () => {
    const inGamut = packedToOklab(packRgb(100, 150, 80));
    const mapped = gamutMapOklab(inGamut);
    expect(mapped.L).toBeCloseTo(inGamut.L, 4);
    expect(mapped.a).toBeCloseTo(inGamut.a, 4);
    expect(mapped.b).toBeCloseTo(inGamut.b, 4);
  });

  it('reduces chroma for out-of-gamut colors', () => {
    const out = oklchToOklab({ L: 0.65, C: 0.45, h: 10 });
    const mapped = gamutMapOklab(out);
    expect(isOklabInGamut(mapped)).toBe(true);
    const mappedChroma = Math.hypot(mapped.a, mapped.b);
    const originalChroma = Math.hypot(out.a, out.b);
    expect(mappedChroma).toBeLessThan(originalChroma);
  });

  it('maps to a packable srgb value', () => {
    const out = oklchToOklab({ L: 0.8, C: 0.35, h: 300 });
    const packed = gamutMapToPacked(out);
    expect(packed).toBeGreaterThanOrEqual(0);
    expect(packed).toBeLessThanOrEqual(0xffffff);
    expect(isOklabInGamut(packedToOklab(packed))).toBe(true);
  });

  it('finds max in-gamut chroma and normalizes requested chroma', () => {
    const maxC = maxInGamutChroma(0.6, 140);
    expect(maxC).toBeGreaterThan(0);
    expect(isOklabInGamut(oklchToOklab({ L: 0.6, C: maxC, h: 140 }))).toBe(true);
    expect(normalizeChromaAtHue(0.6, 140, maxC / 2)).toBeCloseTo(0.5, 3);
    expect(normalizeChromaAtHue(0.6, 140, 0)).toBe(0);
  });
});
