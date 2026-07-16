import type { HighShaderBit } from './types';

/** GLSL vertex shader source (Pixi high-shader bit). */
export const tileVertexSource = /* glsl */ `
in vec3 aOklab;
in vec2 aLocal;
in float aPattern;
in float aFlags;

out vec3 vOklab;
out vec2 vLocal;
out float vPattern;
out float vFlags;
`;

export const tileVertexMain = /* glsl */ `
vOklab = aOklab;
vLocal = aLocal;
vPattern = aPattern;
vFlags = aFlags;
`;

export const tileVertexBit: HighShaderBit = {
  name: 'kulur-tile-vertex',
  vertex: {
    header: tileVertexSource,
    main: tileVertexMain,
  },
};
