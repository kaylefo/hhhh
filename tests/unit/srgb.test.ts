import {
  srgbToLinear,
  linearToSrgb,
  packRgb,
  unpackRgb,
  rgbToPacked,
  formatHex,
  parseHex,
  linearRgbFromPacked,
  packedFromLinearRgb,
  WHITE_PACKED,
  BLACK_PACKED,
} from '../../src/game/color/srgb';

describe('srgb linearization', () => {
  it('linearizes black and white endpoints', () => {
    expect(srgbToLinear(0)).toBe(0);
    expect(srgbToLinear(255)).toBeCloseTo(1, 5);
  });

  it('round-trips channel companding', () => {
    for (const channel of [0, 1, 32, 128, 200, 255]) {
      expect(linearToSrgb(srgbToLinear(channel))).toBe(channel);
    }
  });

  it('packs and unpacks rgb channels', () => {
    const packed = packRgb(0x12, 0x34, 0x56);
    expect(unpackRgb(packed)).toEqual({ r: 0x12, g: 0x34, b: 0x56 });
    expect(rgbToPacked({ r: 255, g: 0, b: 128 })).toBe(packRgb(255, 0, 128));
  });

  it('formats and parses hex strings', () => {
    expect(formatHex(WHITE_PACKED)).toBe('#FFFFFF');
    expect(formatHex(BLACK_PACKED)).toBe('#000000');
    expect(parseHex('#ff8040')).toBe(0xff8040);
    expect(parseHex('F00')).toBe(0xff0000);
    expect(parseHex('not-a-color')).toBeNull();
  });

  it('round-trips packed linear rgb', () => {
    const packed = packRgb(180, 64, 220);
    const [r, g, b] = linearRgbFromPacked(packed);
    const roundTrip = packedFromLinearRgb(r, g, b);
    expect(roundTrip).toBe(packed);
  });
});
