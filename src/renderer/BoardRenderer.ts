import {
  Application,
  Container,
  Graphics,
  RenderTexture,
  Text,
  type FederatedPointerEvent,
} from 'pixi.js';
import {
  CHUNK_SIZE,
  HEX_RADIUS,
  ZOOM_DETAIL_THRESHOLD,
} from '@/game/constants';
import type {
  AxialCoordinate,
  CameraState,
  MaterialId,
  Settings,
  TileRecord,
} from '@/game/types';
import { axialFromWorld, axialKey } from '@/game/hex/axial';
import { CameraController } from './CameraController';
import { ChunkMesh, chunkWorldBounds, collectChunkKeys } from './ChunkMesh';
import { ChunkTextureCache } from './ChunkTextureCache';
import { FrontierRenderer } from './FrontierRenderer';
import { ParticleRenderer } from './ParticleRenderer';
import {
  chunkKey,
  getHexCenter,
  oklabFromPacked,
  tileChunkCoord,
  type TileLookup,
} from './TileGeometry';
import {
  createOutlineShader,
  createTileShader,
  materialToUniform,
  updateTileShaderUniforms,
} from './shaders/createShaders';

export type BoardRendererOptions = {
  onTileTap: (q: number, r: number) => void;
  onFrontierTap: (q: number, r: number) => void;
  onPanChange: (camera: CameraState) => void;
  getSettings: () => Settings;
};

type HighlightState = {
  key: string;
  until: number;
};

const OVERVIEW_TEXTURE_SCALE = 0.35;

export class BoardRenderer {
  private app: Application;
  private options: BoardRendererOptions;
  private world = new Container();
  private detailLayer = new Container();
  private overviewLayer = new Container();
  private tiles = new Map<string, TileRecord>();
  private frontier: AxialCoordinate[] = [];
  private chunks = new Map<string, ChunkMesh>();
  private textureCache = new ChunkTextureCache();
  private tileShader = createTileShader();
  private outlineShader = createOutlineShader();
  private frontierRenderer: FrontierRenderer;
  private particleRenderer: ParticleRenderer;
  private cameraController: CameraController;
  private selectedKey: string | null = null;
  private highlight: HighlightState | null = null;
  private pendingColor: number | null = null;
  private material: MaterialId = 'soft';
  private colorPatterns = false;
  private reducedMotion = false;
  private interactionEnabled = true;
  private dirty = true;
  private detailMode = true;
  private tickerBound: (ticker: { deltaMS: number; lastTime: number }) => void;
  private pointerDown: { x: number; y: number; time: number } | null = null;
  private screenWidth = 1;
  private screenHeight = 1;

  constructor(app: Application, options: BoardRendererOptions) {
    this.app = app;
    this.options = options;

    this.world.label = 'world';
    this.detailLayer.label = 'detail';
    this.overviewLayer.label = 'overview';
    this.world.addChild(this.detailLayer, this.overviewLayer);

    this.frontierRenderer = new FrontierRenderer(this.outlineShader);
    this.particleRenderer = new ParticleRenderer();
    this.world.addChild(this.frontierRenderer.container, this.particleRenderer.container);

    this.cameraController = new CameraController(
      { worldX: 0, worldY: 0, zoom: 1, velocityX: 0, velocityY: 0 },
      {
        onPanChange: options.onPanChange,
        getScreenSize: () => ({ width: this.screenWidth, height: this.screenHeight }),
      },
    );

    app.stage.addChild(this.world);
    this.bindEvents();

    this.tickerBound = (ticker) => this.onTick(ticker.deltaMS);
    app.ticker.add(this.tickerBound);
    this.applyCameraTransform();
    this.invalidate();
  }

  setTiles(tiles: Map<string, TileRecord>): void {
    this.tiles = new Map(tiles);
    this.syncChunks();
    this.textureCache.invalidateAll();
    this.invalidate();
  }

  setFrontier(frontier: AxialCoordinate[]): void {
    this.frontier = frontier;
    this.frontierRenderer.setFrontier(frontier);
    this.invalidate();
  }

  setPendingColor(color: number | null): void {
    this.pendingColor = color;
    this.frontierRenderer.setPendingColor(color);
    this.invalidate();
  }

  setSelectedTile(key: string | null): void {
    if (this.selectedKey === key) return;
    this.selectedKey = key;
    this.rebuildAllChunks();
    this.invalidate();
  }

  setCamera(camera: CameraState): void {
    this.cameraController.setCamera(camera);
    this.applyCameraTransform();
    this.updateDetailMode();
    this.invalidate();
  }

  getCamera(): CameraState {
    return this.cameraController.getCamera();
  }

  setMaterial(material: MaterialId): void {
    this.material = material;
    this.invalidate();
  }

  setColorPatterns(enabled: boolean): void {
    this.colorPatterns = enabled;
    this.textureCache.invalidateAll();
    this.invalidate();
  }

  setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
    this.invalidate();
  }

  setInteractionEnabled(enabled: boolean): void {
    this.interactionEnabled = enabled;
  }

  invalidate(): void {
    this.dirty = true;
  }

  centerOrigin(animated = false): void {
    this.cameraController.centerOrigin(animated);
    this.invalidate();
  }

  centerOn(q: number, r: number, animated = false): void {
    this.cameraController.centerOn(q, r, HEX_RADIUS, animated);
    this.invalidate();
  }

  highlightTile(q: number, r: number, durationMs: number): void {
    this.highlight = { key: axialKey({ q, r }), until: performance.now() + durationMs };
    this.rebuildAllChunks();
    this.invalidate();
  }

  async captureViewport(options: {
    width: number;
    height: number;
    includeCount?: boolean;
    colorCount?: number;
  }): Promise<Blob> {
    const texture = RenderTexture.create({
      width: options.width,
      height: options.height,
      resolution: 1,
    });

    const prevWidth = this.screenWidth;
    const prevHeight = this.screenHeight;
    this.screenWidth = options.width;
    this.screenHeight = options.height;
    this.applyCameraTransform();

    this.app.renderer.render({
      container: this.world,
      target: texture,
      clear: true,
    });

    if (options.includeCount && options.colorCount != null) {
      const overlay = new Container();
      const badge = new Graphics()
        .roundRect(options.width - 120, options.height - 48, 108, 36, 8)
        .fill({ color: 0x07080a, alpha: 0.72 });
      const label = new Text({
        text: `${options.colorCount} colors`,
        style: { fill: 0xffffff, fontSize: 14, fontFamily: 'system-ui, sans-serif' },
      });
      label.position.set(options.width - 112, options.height - 40);
      overlay.addChild(badge, label);
      this.app.renderer.render({ container: overlay, target: texture, clear: false });
      overlay.destroy({ children: true });
    }

    this.screenWidth = prevWidth;
    this.screenHeight = prevHeight;
    this.applyCameraTransform();

    const dataUrl = await this.app.renderer.extract.base64({ target: texture, format: 'png' });
    texture.destroy(true);
    const response = await fetch(dataUrl);
    return response.blob();
  }

  resize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
    this.invalidate();
  }

  destroy(): void {
    this.app.ticker.remove(this.tickerBound);
    this.unbindEvents();
    for (const chunk of this.chunks.values()) chunk.destroy();
    this.chunks.clear();
    this.textureCache.destroy();
    this.frontierRenderer.destroy();
    this.particleRenderer.destroy();
    this.cameraController.destroy();
    this.tileShader.destroy(true);
    this.outlineShader.destroy(true);
    this.world.destroy({ children: true });
  }

  private onTick(deltaMs: number): void {
    const cameraChanged = this.cameraController.update(deltaMs);
    if (cameraChanged) {
      this.applyCameraTransform();
      this.updateDetailMode();
    }

    const now = performance.now();
    const timeSec = now / 1000;
    let animating = false;

    if (this.highlight && now >= this.highlight.until) {
      this.highlight = null;
      this.rebuildAllChunks();
      this.dirty = true;
    }

    updateTileShaderUniforms(this.tileShader, {
      uTime: timeSec,
      uMaterial: materialToUniform(this.material),
      uColorPatterns: this.colorPatterns ? 1 : 0,
      uReducedMotion: this.reducedMotion ? 1 : 0,
    });

    this.frontierRenderer.update(timeSec, this.reducedMotion, this.pendingColor != null ? 1.15 : 1);
    if (this.particleRenderer.update(deltaMs)) animating = true;

    if (cameraChanged || this.dirty || animating || !this.reducedMotion) {
      this.renderVisibleChunks();
      this.cullLayers();
      this.dirty = false;
    }

  }

  private renderVisibleChunks(): void {
    const visible = this.getVisibleChunkKeys();

    if (this.detailMode) {
      this.overviewLayer.removeChildren();
      for (const key of visible) {
        const chunk = this.ensureChunk(key);
        chunk.rebuild(this.tiles, this.createLookup(), this.selectedKey, this.getHighlightKey());
        if (!chunk.mesh.parent) this.detailLayer.addChild(chunk.mesh);
        chunk.mesh.visible = true;
      }
      for (const [key, chunk] of this.chunks) {
        if (!visible.has(key)) {
          chunk.mesh.visible = false;
        }
      }
    } else {
      this.detailLayer.removeChildren();
      this.overviewLayer.removeChildren();
      for (const key of visible) {
        const chunk = this.ensureChunk(key);
        chunk.rebuild(this.tiles, this.createLookup(), this.selectedKey, this.getHighlightKey());
        const bounds = chunkWorldBounds(chunk.chunkQ, chunk.chunkR, HEX_RADIUS);
        const width = (bounds.maxX - bounds.minX) * OVERVIEW_TEXTURE_SCALE;
        const height = (bounds.maxY - bounds.minY) * OVERVIEW_TEXTURE_SCALE;
        void this.textureCache.ensure(
          key,
          chunk.getRevision(),
          this.app,
          (container) => {
            chunk.mesh.position.set(-bounds.minX, -bounds.minY);
            chunk.mesh.scale.set(OVERVIEW_TEXTURE_SCALE);
            container.addChild(chunk.mesh);
          },
          width,
          height,
        ).then((sprite) => {
          sprite.position.set(bounds.minX, bounds.minY);
          sprite.scale.set(1 / OVERVIEW_TEXTURE_SCALE);
          if (!sprite.parent) this.overviewLayer.addChild(sprite);
        });
      }
    }
  }

  private cullLayers(): void {
    const margin = HEX_RADIUS * 4;
    const topLeft = this.cameraController.screenToWorld(-margin, -margin);
    const bottomRight = this.cameraController.screenToWorld(this.screenWidth + margin, this.screenHeight + margin);

    for (const chunk of this.chunks.values()) {
      const bounds = chunkWorldBounds(chunk.chunkQ, chunk.chunkR, HEX_RADIUS);
      const visible =
        bounds.maxX >= topLeft.x &&
        bounds.minX <= bottomRight.x &&
        bounds.maxY >= topLeft.y &&
        bounds.minY <= bottomRight.y;
      chunk.mesh.renderable = visible;
    }
  }

  private getVisibleChunkKeys(): Set<string> {
    const margin = HEX_RADIUS * 6;
    const topLeft = this.cameraController.screenToWorld(-margin, -margin);
    const bottomRight = this.cameraController.screenToWorld(this.screenWidth + margin, this.screenHeight + margin);

    const keys = new Set<string>();
    for (const tile of this.tiles.values()) {
      const center = getHexCenter(tile.q, tile.r);
      if (
        center.x + HEX_RADIUS >= topLeft.x &&
        center.x - HEX_RADIUS <= bottomRight.x &&
        center.y + HEX_RADIUS >= topLeft.y &&
        center.y - HEX_RADIUS <= bottomRight.y
      ) {
        const { chunkQ, chunkR } = tileChunkCoord(tile.q, tile.r, CHUNK_SIZE);
        keys.add(chunkKey(chunkQ, chunkR));
      }
    }

    if (keys.size === 0 && this.tiles.size === 0) {
      keys.add(chunkKey(0, 0));
    }

    return keys;
  }

  private syncChunks(): void {
    const needed = collectChunkKeys(this.tiles);
    for (const key of needed) this.ensureChunk(key);
    for (const [key, chunk] of this.chunks) {
      if (!needed.has(key)) {
        chunk.destroy();
        this.chunks.delete(key);
        this.textureCache.invalidate(key);
      }
    }
  }

  private ensureChunk(key: string): ChunkMesh {
    const existing = this.chunks.get(key);
    if (existing) return existing;
    const [chunkQ, chunkR] = key.split(',').map(Number);
    const chunk = new ChunkMesh({
      chunkQ: chunkQ!,
      chunkR: chunkR!,
      shader: this.tileShader,
    });
    this.chunks.set(key, chunk);
    return chunk;
  }

  private rebuildAllChunks(): void {
    for (const chunk of this.chunks.values()) {
      chunk.rebuild(this.tiles, this.createLookup(), this.selectedKey, this.getHighlightKey());
      this.textureCache.invalidate(chunk.key);
    }
  }

  private createLookup(): TileLookup {
    const map = new Map<string, ReturnType<typeof oklabFromPacked>>();
    for (const tile of this.tiles.values()) {
      map.set(axialKey(tile), oklabFromPacked(tile.packedColor));
    }
    return (q, r) => map.get(axialKey({ q, r })) ?? null;
  }

  private getHighlightKey(): string | null {
    if (!this.highlight) return null;
    if (performance.now() >= this.highlight.until) return null;
    return this.highlight.key;
  }

  private updateDetailMode(): void {
    const next = this.cameraController.getCamera().zoom >= ZOOM_DETAIL_THRESHOLD;
    if (next !== this.detailMode) {
      this.detailMode = next;
      this.detailLayer.visible = next;
      this.overviewLayer.visible = !next;
      this.textureCache.invalidateAll();
      this.dirty = true;
    }
  }

  private applyCameraTransform(): void {
    const camera = this.cameraController.getCamera();
    this.world.position.set(
      this.screenWidth * 0.5 + camera.worldX * camera.zoom,
      this.screenHeight * 0.5 + camera.worldY * camera.zoom,
    );
    this.world.scale.set(camera.zoom);
  }

  private bindEvents(): void {
    const canvas = this.app.canvas;
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerUp);
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on('pointertap', this.onStageTap);
  }

  private unbindEvents(): void {
    const canvas = this.app.canvas;
    canvas.removeEventListener('wheel', this.onWheel);
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('pointercancel', this.onPointerUp);
    canvas.removeEventListener('pointerleave', this.onPointerUp);
    this.app.stage.off('pointertap', this.onStageTap);
  }

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    if (!this.interactionEnabled) return;
    const rect = this.app.canvas.getBoundingClientRect();
    this.cameraController.onWheel(event.deltaY, event.clientX - rect.left, event.clientY - rect.top);
    this.invalidate();
  };

  private onPointerDown = (event: PointerEvent): void => {
    if (!this.interactionEnabled) return;
    const rect = this.app.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    this.cameraController.onPointerDown(event.pointerId, x, y);
    this.pointerDown = { x, y, time: performance.now() };
    this.invalidate();
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.interactionEnabled) return;
    const rect = this.app.canvas.getBoundingClientRect();
    this.cameraController.onPointerMove(event.pointerId, event.clientX - rect.left, event.clientY - rect.top);
    this.invalidate();
  };

  private onPointerUp = (event: PointerEvent): void => {
    this.cameraController.onPointerUp(event.pointerId);
    this.invalidate();
  };

  private onStageTap = (event: FederatedPointerEvent): void => {
    if (!this.interactionEnabled || !this.pointerDown) return;
    const elapsed = performance.now() - this.pointerDown.time;
    const dx = event.global.x - this.pointerDown.x;
    const dy = event.global.y - this.pointerDown.y;
    this.pointerDown = null;
    if (elapsed > 450 || Math.hypot(dx, dy) > 12) return;

    const world = this.cameraController.screenToWorld(event.global.x, event.global.y);
    const axial = axialFromWorld(world.x, world.y, HEX_RADIUS);
    const key = axialKey(axial);

    if (this.frontier.some((c) => axialKey(c) === key)) {
      this.options.onFrontierTap(axial.q, axial.r);
      return;
    }
    if (this.tiles.has(key)) {
      this.options.onTileTap(axial.q, axial.r);
    }
  };

  spawnPlacementParticles(q: number, r: number, color: number): void {
    const center = getHexCenter(q, r);
    this.particleRenderer.emit(center.x, center.y, color);
    this.invalidate();
  }
}
