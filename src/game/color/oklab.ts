import type { OKLab, OKLCH } from '../types';
import { linearRgbFromPacked, packedFromLinearRgb, srgbToLinear } from './srgb';

export function linearRgbToOklab(r: number, g: number, b: number): OKLab {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);

  return {
    L: 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot,
    a: 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot,
    b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot,
  };
}

export function oklabToLinearRgb(oklab: OKLab): [number, number, number] {
  const lRoot = oklab.L + 0.3963377774 * oklab.a + 0.2158037573 * oklab.b;
  const mRoot = oklab.L - 0.1055613458 * oklab.a - 0.0638541728 * oklab.b;
  const sRoot = oklab.L - 0.0894841775 * oklab.a - 1.291485548 * oklab.b;

  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function packedToOklab(packed: number): OKLab {
  const [r, g, b] = linearRgbFromPacked(packed);
  return linearRgbToOklab(r, g, b);
}

export function oklabToPacked(oklab: OKLab): number {
  const [r, g, b] = oklabToLinearRgb(oklab);
  return packedFromLinearRgb(r, g, b);
}

export function rgbChannelToOklab(r: number, g: number, b: number): OKLab {
  return linearRgbToOklab(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b));
}

export function deltaEOK(a: OKLab, b: OKLab): number {
  const dL = a.L - b.L;
  const da = a.a - b.a;
  const db = a.b - b.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

export function oklabToOklch(oklab: OKLab): OKLCH {
  const C = Math.sqrt(oklab.a * oklab.a + oklab.b * oklab.b);
  let h = (Math.atan2(oklab.b, oklab.a) * 180) / Math.PI;
  h = ((h % 360) + 360) % 360;
  return { L: oklab.L, C, h };
}

export function oklchToOklab(oklch: OKLCH): OKLab {
  const hRad = (oklch.h * Math.PI) / 180;
  return {
    L: oklch.L,
    a: oklch.C * Math.cos(hRad),
    b: oklch.C * Math.sin(hRad),
  };
}
