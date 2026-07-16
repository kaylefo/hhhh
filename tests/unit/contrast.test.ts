import { textColorForBackground, contrastRatio, relativeLuminance } from '../../src/game/color/contrast';
import { packRgb } from '../../src/game/color/srgb';

describe('contrast selection', () => {
  it('chooses white text on dark backgrounds', () => {
    expect(textColorForBackground(packRgb(20, 20, 20))).toBe('#FFFFFF');
    expect(textColorForBackground(packRgb(0, 0, 128))).toBe('#FFFFFF');
  });

  it('chooses black text on light backgrounds', () => {
    expect(textColorForBackground(packRgb(240, 240, 240))).toBe('#000000');
    expect(textColorForBackground(packRgb(255, 255, 0))).toBe('#000000');
  });

  it('computes WCAG contrast ratio with lighter/darker ordering', () => {
    const whiteLum = relativeLuminance(packRgb(255, 255, 255));
    const blackLum = relativeLuminance(packRgb(0, 0, 0));
    expect(contrastRatio(whiteLum, blackLum)).toBeCloseTo(21, 0);
    expect(contrastRatio(blackLum, whiteLum)).toBeCloseTo(21, 0);
  });
});
