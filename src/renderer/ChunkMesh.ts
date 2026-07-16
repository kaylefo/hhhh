import {
  Geometry,
  Mesh,
  State,
  type Shader,
} from 'pixi.js';
import { CHUNK_SIZE } from '@/game/constants';
import type { TileRecord } from '@/game/types';
import { axialKey } from '@/game/hex/axial';
import {
  buildTileIndices,
  buildTileOklabColors,
  chunkKey,
  getHexCenter,
  getTileVertexPositions,
  INDICES_PER_TILE,
  oklabFromPacked,
  TILE_LOCAL_TEMPLATE,
  tileChunkCoord,
  tileFlags,
  tilePatternSeed,
  VERTICES_PER_TILE,
  type TileLookup,
} from './TileGeometry';

export type ChunkMeshOptions = {
  chunkQ: number;
  chunkR: number;
  shader: Shader;
};

export class ChunkMesh {
  readonly chunkQ: number;
  readonly chunkR: number;
  readonly key: string;
  readonly mesh: Mesh<Geometry, Shader>;

  private geometry: Geometry;
  private revision = 0;

  constructor(options: ChunkMeshOptions) {
    this.chunkQ = options.chunkQ;
    this.chunkR = options.chunkR;
    this.key = chunkKey(options.chunkQ, options.chunkR);

    this.geometry = new Geometry({
      attributes: {
        aPosition: new Float32Array(0),
        aUV: new Float32Array(0),
        aOklab: new Float32Array(0),
        aLocal: new Float32Array(0),
        aPattern: new Float32Array(0),
        aFlags: new Float32Array(0),
      },
      indexBuffer: new Uint32Array(0),
    });

    const state = State.for2d();
    state.blend = true;

    this.mesh = new Mesh({
      geometry: this.geometry,
      shader: options.shader,
      state,
    });
    this.mesh.label = `chunk-${this.key}`;
  }

  getRevision(): number {
    return this.revision;
  }

  rebuild(
    tiles: Map<string, TileRecord>,
    lookup: TileLookup,
    selectedKey: string | null,
    highlightedKey: string | null,
  ): void {
    const chunkTiles: TileRecord[] = [];
    for (const tile of tiles.values()) {
      const { chunkQ, chunkR } = tileChunkCoord(tile.q, tile.r, CHUNK_SIZE);
      if (chunkQ === this.chunkQ && chunkR === this.chunkR) {
        chunkTiles.push(tile);
      }
    }

    chunkTiles.sort((a, b) => (a.q === b.q ? a.r - b.r : a.q - b.q));

    const count = chunkTiles.length;
    this.revision++;

    if (count === 0) {
      const emptyPositions = this.geometry.getBuffer('aPosition');
      emptyPositions.data = new Float32Array(0);
      emptyPositions.update();
      const emptyIndices = this.geometry.getIndex();
      emptyIndices.data = new Uint32Array(0);
      emptyIndices.update();
      this.mesh.visible = false;
      return;
    }

    const positions = new Float32Array(count * VERTICES_PER_TILE * 2);
    const uvs = new Float32Array(count * VERTICES_PER_TILE * 2);
    const oklabs = new Float32Array(count * VERTICES_PER_TILE * 3);
    const locals = new Float32Array(count * VERTICES_PER_TILE * 2);
    const patterns = new Float32Array(count * VERTICES_PER_TILE);
    const flags = new Float32Array(count * VERTICES_PER_TILE);
    const indices = new Uint32Array(count * INDICES_PER_TILE);

    for (let i = 0; i < count; i++) {
      const tile = chunkTiles[i]!;
      const key = axialKey(tile);
      const center = getHexCenter(tile.q, tile.r);
      const tilePositions = getTileVertexPositions(center.x, center.y);
      const tileOklabs = buildTileOklabColors(tile.q, tile.r, oklabFromPacked(tile.packedColor), lookup);
      const pattern = tilePatternSeed(tile.q, tile.r);
      const flag = tileFlags(key === selectedKey, key === highlightedKey);

      const base = i * VERTICES_PER_TILE;
      positions.set(tilePositions, base * 2);
      oklabs.set(tileOklabs, base * 3);
      locals.set(TILE_LOCAL_TEMPLATE, base * 2);
      for (let v = 0; v < VERTICES_PER_TILE; v++) {
        patterns[base + v] = pattern;
        flags[base + v] = flag;
      }

      const tileIndices = buildTileIndices(base);
      indices.set(tileIndices, i * INDICES_PER_TILE);
    }

    const positionBuffer = this.geometry.getBuffer('aPosition');
    positionBuffer.data = positions;
    positionBuffer.update();
    const uvBuffer = this.geometry.getBuffer('aUV');
    uvBuffer.data = uvs;
    uvBuffer.update();
    const oklabBuffer = this.geometry.getBuffer('aOklab');
    oklabBuffer.data = oklabs;
    oklabBuffer.update();
    const localBuffer = this.geometry.getBuffer('aLocal');
    localBuffer.data = locals;
    localBuffer.update();
    const patternBuffer = this.geometry.getBuffer('aPattern');
    patternBuffer.data = patterns;
    patternBuffer.update();
    const flagsBuffer = this.geometry.getBuffer('aFlags');
    flagsBuffer.data = flags;
    flagsBuffer.update();
    const indexBuffer = this.geometry.getIndex();
    indexBuffer.data = indices;
    indexBuffer.update();
    this.mesh.visible = true;
  }

  destroy(): void {
    this.mesh.destroy({ children: true, texture: false, textureSource: false });
    this.geometry.destroy();
  }
}

export function collectChunkKeys(tiles: Map<string, TileRecord>): Set<string> {
  const keys = new Set<string>();
  for (const tile of tiles.values()) {
    const { chunkQ, chunkR } = tileChunkCoord(tile.q, tile.r, CHUNK_SIZE);
    keys.add(chunkKey(chunkQ, chunkR));
  }
  return keys;
}

export function chunkWorldBounds(chunkQ: number, chunkR: number, radius: number): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  const minQ = chunkQ * CHUNK_SIZE;
  const minR = chunkR * CHUNK_SIZE;
  const maxQ = minQ + CHUNK_SIZE - 1;
  const maxR = minR + CHUNK_SIZE - 1;
  const corners = [
    getHexCenter(minQ, minR, radius),
    getHexCenter(maxQ, minR, radius),
    getHexCenter(minQ, maxR, radius),
    getHexCenter(maxQ, maxR, radius),
  ];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of corners) {
    minX = Math.min(minX, c.x - radius);
    minY = Math.min(minY, c.y - radius);
    maxX = Math.max(maxX, c.x + radius);
    maxY = Math.max(maxY, c.y + radius);
  }
  return { minX, minY, maxX, maxY };
}
