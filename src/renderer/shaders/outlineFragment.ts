import type { HighShaderBit } from './types';

/** GLSL fragment shader for pulsing frontier hex outlines. */
export const outlineFragmentSource = /* glsl */ `
in float vSide;
in float vPhase;

uniform float uTime;
uniform float uPulse;
uniform vec4 uOutlineColor;
uniform float uReducedMotion;
`;

export const outlineFragmentMain = /* glsl */ `
float pulse = uReducedMotion > 0.5
  ? 0.24
  : 0.24 + 0.18 * (0.5 + 0.5 * sin(uTime * 2.1 + vPhase));
float edge = smoothstep(0.35, 0.0, abs(vSide - 0.5) * 2.0);
float alpha = edge * uPulse * pulse;
outColor = vec4(uOutlineColor.rgb, uOutlineColor.a * alpha);
`;

export const outlineFragmentBit: HighShaderBit = {
  name: 'kulur-outline-fragment',
  fragment: {
    header: outlineFragmentSource,
    main: outlineFragmentMain,
  },
};
