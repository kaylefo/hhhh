import type { RGB, HSL } from '../types';

export function srgbToLinear(c: number): number {
  const n = c / 255;
  if (n <= 0.04045) return n / 12.92;
  return ((n + 0.055) / 1.055) ** 2.4;
}

export function linearToSrgb(linear: number): number {
  let srgb: number;
  if (linear <= 0.0031308) {
    srgb = 12.92 * linear;
  } else {
    srgb = 1.055 * linear ** (1 / 2.4) - 0.055;
  }
  return Math.round(Math.min(1, Math.max(0, srgb)) * 255);
}

export function unpackRgb(packed: number): RGB {
  return {
    r: (packed >> 16) & 0xff,
    g: (packed >> 8) & 0xff,
    b: packed & 0xff,
  };
}

export function packRgb(r: number, g: number, b: number): number {
  return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}

export function rgbToPacked(rgb: RGB): number {
  return packRgb(rgb.r, rgb.g, rgb.b);
}

export function formatHex(packed: number): string {
  return `#${packed.toString(16).padStart(6, '0').toUpperCase()}`;
}

export function parseHex(input: string): number | null {
  let hex = input.trim().toUpperCase();
  if (hex.startsWith('#')) hex = hex.slice(1);
  if (!/^[0-9A-F]{3}$|^[0-9A-F]{6}$/.test(hex)) return null;
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return parseInt(hex, 16);
}

export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    case b:
      h = ((r - g) / d + 4) / 6;
      break;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function linearRgbFromPacked(packed: number): [number, number, number] {
  const { r, g, b } = unpackRgb(packed);
  return [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
}

export function packedFromLinearRgb(r: number, g: number, b: number): number {
  return packRgb(linearToSrgb(r), linearToSrgb(g), linearToSrgb(b));
}

export const WHITE_PACKED = 0xffffff;
export const BLACK_PACKED = 0x000000;
