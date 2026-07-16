import {
  createColorRecord,
  formatRgbDisplay,
  rgbCellIndex,
  rgbCellProgressPercent,
  formatHslDisplay,
  formatOklchDisplay,
} from '../../src/game/color/formatting';
import { packRgb } from '../../src/game/color/srgb';

describe('formatting helpers', () => {
  it('creates full color records', () => {
    const packed = packRgb(100, 150, 200);
    const record = createColorRecord(packed);
    expect(record.hex).toBe('#6496C8');
    expect(record.rgb).toEqual({ r: 100, g: 150, b: 200 });
    expect(record.hsl.h).toBeGreaterThanOrEqual(0);
    expect(record.oklab.L).toBeGreaterThan(0);
  });

  it('formats rgb display strings', () => {
    expect(formatRgbDisplay({ r: 1, g: 2, b: 3 })).toBe('1, 2, 3');
  });

  it('computes rgb cell index from 5-bit channels', () => {
    expect(rgbCellIndex(packRgb(255, 128, 0))).toBe((31 << 10) | (16 << 5) | 0);
    expect(rgbCellIndex(packRgb(0, 0, 0))).toBe(0);
  });

  it('formats rgb cell progress percentages', () => {
    expect(rgbCellProgressPercent(100, 10000)).toBe('1.0');
    expect(rgbCellProgressPercent(50, 10000)).toBe('0.50');
    expect(rgbCellProgressPercent(5000, 10000)).toBe('50');
  });

  it('formats HSL display for achromatic and chromatic colors', () => {
    expect(formatHslDisplay({ h: 0, s: 0, l: 50 })).toBe('—, 0%, 50%');
    expect(formatHslDisplay({ h: 200, s: 80, l: 40 })).toBe('200°, 80%, 40%');
  });

  it('formats OKLCH display with dash for zero chroma', () => {
    expect(formatOklchDisplay({ L: 0.5, C: 0, h: 0 })).toBe('50.0% 0.000 —');
    expect(formatOklchDisplay({ L: 0.7, C: 0.15, h: 120.4 })).toBe('70.0% 0.150 120.4°');
  });
});
