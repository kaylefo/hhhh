import { srgbToLinear } from './srgb';

export function relativeLuminance(packed: number): number {
  const r = srgbToLinear((packed >> 16) & 0xff);
  const g = srgbToLinear((packed >> 8) & 0xff);
  const b = srgbToLinear(packed & 0xff);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function textColorForBackground(packed: number): '#000000' | '#FFFFFF' {
  const bgLum = relativeLuminance(packed);
  const whiteContrast = contrastRatio(1, bgLum);
  const blackContrast = contrastRatio(bgLum, 0);
  return whiteContrast >= blackContrast ? '#FFFFFF' : '#000000';
}
