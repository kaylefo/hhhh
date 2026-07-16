import {
  compileHighShaderGlProgram,
  localUniformBitGl,
  Shader,
  UniformGroup,
} from 'pixi.js';
import { tileFragmentBit } from './tileFragment';
import { tileVertexBit } from './tileVertex';
import { outlineFragmentBit } from './outlineFragment';
import { outlineVertexBit } from './outlineVertex';
import type { MaterialId } from '@/game/types';

const MATERIAL_INDEX: Record<MaterialId, number> = {
  soft: 0,
  glass: 1,
  ink: 2,
  neon: 3,
  prism: 4,
};

export type TileShaderUniforms = {
  uTime: number;
  uMaterial: number;
  uColorPatterns: number;
  uReducedMotion: number;
};

export function createTileShader(): Shader {
  const glProgram = compileHighShaderGlProgram({
    name: 'kulur-tile',
    bits: [localUniformBitGl, tileVertexBit, tileFragmentBit],
  });

  return new Shader({
    glProgram,
    resources: {
      tileUniforms: new UniformGroup({
        uTime: { value: 0, type: 'f32' },
        uMaterial: { value: 0, type: 'f32' },
        uColorPatterns: { value: 0, type: 'f32' },
        uReducedMotion: { value: 0, type: 'f32' },
      }),
    },
  });
}

export function createOutlineShader(): Shader {
  const glProgram = compileHighShaderGlProgram({
    name: 'kulur-outline',
    bits: [localUniformBitGl, outlineVertexBit, outlineFragmentBit],
  });

  return new Shader({
    glProgram,
    resources: {
      outlineUniforms: new UniformGroup({
        uTime: { value: 0, type: 'f32' },
        uPulse: { value: 1, type: 'f32' },
        uOutlineColor: { value: new Float32Array([1, 1, 1, 0.85]), type: 'vec4<f32>' },
        uReducedMotion: { value: 0, type: 'f32' },
      }),
    },
  });
}

export function materialToUniform(material: MaterialId): number {
  return MATERIAL_INDEX[material];
}

export function updateTileShaderUniforms(
  shader: Shader,
  uniforms: TileShaderUniforms,
): void {
  const group = shader.resources.tileUniforms as UniformGroup;
  group.uniforms.uTime = uniforms.uTime;
  group.uniforms.uMaterial = uniforms.uMaterial;
  group.uniforms.uColorPatterns = uniforms.uColorPatterns;
  group.uniforms.uReducedMotion = uniforms.uReducedMotion;
  group.update();
}

export function updateOutlineShaderUniforms(
  shader: Shader,
  uniforms: {
    uTime: number;
    uPulse: number;
    uOutlineColor: Float32Array;
    uReducedMotion: number;
  },
): void {
  const group = shader.resources.outlineUniforms as UniformGroup;
  group.uniforms.uTime = uniforms.uTime;
  group.uniforms.uPulse = uniforms.uPulse;
  group.uniforms.uOutlineColor = uniforms.uOutlineColor;
  group.uniforms.uReducedMotion = uniforms.uReducedMotion;
  group.update();
}
