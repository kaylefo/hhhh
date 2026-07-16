import {
  Container,
  Geometry,
  Mesh,
  State,
  type Shader,
} from 'pixi.js';
import { HEX_RADIUS } from '@/game/constants';
import type { AxialCoordinate } from '@/game/types';
import { hexCorners } from '@/game/hex/axial';
import { getHexCenter } from './TileGeometry';
import { updateOutlineShaderUniforms } from './shaders/createShaders';

const OUTLINE_WIDTH = 3;
const SEGMENTS_PER_EDGE = 4;

export class FrontierRenderer {
  readonly container = new Container();
  private mesh: Mesh<Geometry, Shader> | null = null;
  private geometry: Geometry | null = null;
  private frontier: AxialCoordinate[] = [];
  private pendingColor: number | null = null;

  constructor(private shader: Shader) {
    this.container.label = 'frontier';
  }

  setFrontier(frontier: AxialCoordinate[]): void {
    this.frontier = frontier;
    this.rebuild();
  }

  setPendingColor(color: number | null): void {
    this.pendingColor = color;
  }

  update(timeSec: number, reducedMotion: boolean, pulse = 1): void {
    updateOutlineShaderUniforms(this.shader, {
      uTime: timeSec,
      uPulse: pulse,
      uOutlineColor: pendingColorToUniform(this.pendingColor),
      uReducedMotion: reducedMotion ? 1 : 0,
    });
  }

  rebuild(): void {
    if (this.mesh) {
      this.container.removeChild(this.mesh);
      this.mesh.destroy();
      this.geometry?.destroy();
      this.mesh = null;
      this.geometry = null;
    }

    if (this.frontier.length === 0) return;

    const positions: number[] = [];
    const sides: number[] = [];
    const phases: number[] = [];
    const indices: number[] = [];
    let vertex = 0;

    for (let fi = 0; fi < this.frontier.length; fi++) {
      const coord = this.frontier[fi]!;
      const center = getHexCenter(coord.q, coord.r, HEX_RADIUS);
      const corners = hexCorners(center.x, center.y, HEX_RADIUS * 1.02);
      const phase = (coord.q * 0.17 + coord.r * 0.23) * Math.PI;

      for (let edge = 0; edge < 6; edge++) {
        const a = corners[edge]!;
        const b = corners[(edge + 1) % 6]!;
        for (let s = 0; s < SEGMENTS_PER_EDGE; s++) {
          const t0 = s / SEGMENTS_PER_EDGE;
          const t1 = (s + 1) / SEGMENTS_PER_EDGE;
          const ax = a.x + (b.x - a.x) * t0;
          const ay = a.y + (b.y - a.y) * t0;
          const bx = a.x + (b.x - a.x) * t1;
          const by = a.y + (b.y - a.y) * t1;
          const nx = -(b.y - a.y);
          const ny = b.x - a.x;
          const len = Math.hypot(nx, ny) || 1;
          const ox = (nx / len) * OUTLINE_WIDTH;
          const oy = (ny / len) * OUTLINE_WIDTH;

          positions.push(ax - ox, ay - oy, ax + ox, ay + oy, bx + ox, by + oy, bx - ox, by - oy);
          for (let i = 0; i < 4; i++) {
            sides.push(i / 3);
            phases.push(phase);
          }
          indices.push(vertex, vertex + 1, vertex + 2, vertex, vertex + 2, vertex + 3);
          vertex += 4;
        }
      }
    }

    this.geometry = new Geometry({
      attributes: {
        aPosition: new Float32Array(positions),
        aUV: new Float32Array(positions.length),
        aSide: new Float32Array(sides),
        aPhase: new Float32Array(phases),
      },
      indexBuffer: new Uint32Array(indices),
    });

    const state = State.for2d();
    state.blend = true;

    this.mesh = new Mesh({
      geometry: this.geometry,
      shader: this.shader,
      state,
    });
    this.mesh.eventMode = 'none';
    this.container.addChild(this.mesh);
  }

  destroy(): void {
    if (this.mesh) this.mesh.destroy();
    this.geometry?.destroy();
    this.container.destroy({ children: true });
  }
}

function pendingColorToUniform(color: number | null): Float32Array {
  if (color == null) return new Float32Array([1, 1, 1, 0.85]);
  const r = ((color >> 16) & 0xff) / 255;
  const g = ((color >> 8) & 0xff) / 255;
  const b = (color & 0xff) / 255;
  return new Float32Array([r, g, b, 0.9]);
}
