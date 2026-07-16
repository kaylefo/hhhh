import type { HighShaderBit } from './types';

/** GLSL fragment shader source with OKLab interpolation and procedural materials. */
export const tileFragmentSource = /* glsl */ `
in vec3 vOklab;
in vec2 vLocal;
in float vPattern;
in float vFlags;

uniform float uTime;
uniform float uMaterial;
uniform float uColorPatterns;
uniform float uReducedMotion;
uniform float uZoom;

vec3 oklabToLinear(vec3 lab) {
    float l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
    float m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
    float s_ = lab.x - 0.0894841775 * lab.y - 1.291485548 * lab.z;
    float l = l_ * l_ * l_;
    float m = m_ * m_ * m_;
    float s = s_ * s_ * s_;
    return vec3(
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
    );
}

vec3 linearToSrgb(vec3 c) {
    vec3 lo = c * 12.92;
    vec3 hi = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
    return mix(lo, hi, step(vec3(0.0031308), c));
}

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float softNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec3 applySoft(vec3 rgb, vec2 local) {
    float shade = 0.94 + 0.06 * dot(normalize(vec3(local, 0.65)), vec3(0.35, -0.25, 0.9));
    return rgb * shade;
}

vec3 applyGlass(vec3 rgb, vec2 local, float time) {
    float r = length(local);
    float spec = pow(max(0.0, 1.0 - r * 1.35), 3.0);
    float caustic = softNoise(local * 4.0 + time * 0.15) * 0.08;
    return mix(rgb * 0.88, rgb + vec3(0.18), spec + caustic);
}

vec3 applyInk(vec3 rgb, vec2 local) {
    float edge = smoothstep(0.15, 0.95, length(local));
    return rgb * mix(0.72, 1.0, edge);
}

vec3 applyNeon(vec3 rgb, vec2 local, float time) {
    float pulse = 0.85 + 0.15 * sin(time * 2.4 + vPattern * 6.283);
    float glow = exp(-length(local) * 2.2) * 0.35 * pulse;
    return rgb + rgb * glow;
}

vec3 applyPrism(vec3 rgb, vec2 local, float time) {
    float angle = atan(local.y, local.x);
    float hueShift = sin(angle * 3.0 + time * 0.8 + vPattern) * 0.12;
    return vec3(
        rgb.r + hueShift,
        rgb.g + hueShift * 0.5,
        rgb.b - hueShift
    );
}

vec3 colorPatternOverlay(vec3 rgb, vec2 local, float pattern, float enabled) {
    if (enabled < 0.5) return rgb;
    float stripe = sin((local.x + local.y) * 8.0 + pattern * 12.0);
    float dots = step(0.82, hash21(floor(local * 5.0 + pattern)));
    float overlay = mix(stripe * 0.04, dots * 0.08, 0.35);
    return rgb + overlay;
}
`;

export const tileFragmentMain = /* glsl */ `
vec3 linear = oklabToLinear(vOklab);
vec3 rgb = clamp(linearToSrgb(linear), 0.0, 1.0);

float matId = floor(uMaterial + 0.5);
float t = uReducedMotion > 0.5 ? 0.0 : uTime;

if (matId < 0.5) {
    rgb = applySoft(rgb, vLocal);
} else if (matId < 1.5) {
    rgb = applyGlass(rgb, vLocal, t);
} else if (matId < 2.5) {
    rgb = applyInk(rgb, vLocal);
} else if (matId < 3.5) {
    rgb = applyNeon(rgb, vLocal, t);
} else {
    rgb = applyPrism(rgb, vLocal, t);
}

rgb = colorPatternOverlay(rgb, vLocal, vPattern, uColorPatterns);

if (uZoom >= 0.6) {
    float dist = length(vLocal);
    float seam = smoothstep(0.84, 0.96, dist) * (1.0 - smoothstep(0.96, 1.0, dist));
    rgb = mix(rgb, vec3(1.0), seam * 0.07);
}

float selected = step(0.5, mod(vFlags, 2.0));
float highlighted = step(1.5, vFlags);
rgb = mix(rgb, rgb + vec3(0.12, 0.12, 0.08), selected * 0.35);
rgb = mix(rgb, rgb + vec3(0.18), highlighted * 0.45);

outColor = vec4(rgb, 1.0);
`;

export const tileFragmentBit: HighShaderBit = {
  name: 'kulur-tile-fragment',
  fragment: {
    header: tileFragmentSource,
    main: tileFragmentMain,
  },
};
