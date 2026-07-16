import type { HighShaderBit } from './types';

/** GLSL vertex shader for frontier hex outlines. */
export const outlineVertexSource = /* glsl */ `
in float aSide;
in float aPhase;

out float vSide;
out float vPhase;
`;

export const outlineVertexMain = /* glsl */ `
vSide = aSide;
vPhase = aPhase;
`;

export const outlineVertexBit: HighShaderBit = {
  name: 'kulur-outline-vertex',
  vertex: {
    header: outlineVertexSource,
    main: outlineVertexMain,
  },
};
