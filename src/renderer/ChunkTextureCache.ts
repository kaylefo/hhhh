import {
  Container,
  RenderTexture,
  Sprite,
  type Application,
  type Renderer,
} from 'pixi.js';

export type CachedChunkTexture = {
  texture: RenderTexture;
  sprite: Sprite;
  revision: number;
  width: number;
  height: number;
};

export class ChunkTextureCache {
  private cache = new Map<string, CachedChunkTexture>();
  private invalid = new Set<string>();

  invalidate(key: string): void {
    this.invalid.add(key);
  }

  invalidateAll(): void {
    this.invalid.clear();
    for (const key of this.cache.keys()) {
      this.invalid.add(key);
    }
  }

  clear(): void {
    for (const entry of this.cache.values()) {
      entry.texture.destroy(true);
      entry.sprite.destroy();
    }
    this.cache.clear();
    this.invalid.clear();
  }

  isStale(key: string, revision: number): boolean {
    const entry = this.cache.get(key);
    return !entry || entry.revision !== revision || this.invalid.has(key);
  }

  getSprite(key: string): Sprite | null {
    return this.cache.get(key)?.sprite ?? null;
  }

  async ensure(
    key: string,
    revision: number,
    app: Application,
    renderFn: (container: Container, width: number, height: number) => void,
    width: number,
    height: number,
  ): Promise<Sprite> {
    if (!this.isStale(key, revision)) {
      this.invalid.delete(key);
      return this.cache.get(key)!.sprite;
    }

    const existing = this.cache.get(key);
    if (existing) {
      existing.texture.destroy(true);
      existing.sprite.destroy();
      this.cache.delete(key);
    }

    const texture = RenderTexture.create({
      width: Math.max(1, Math.ceil(width)),
      height: Math.max(1, Math.ceil(height)),
      resolution: 1,
    });

    const container = new Container();
    renderFn(container, width, height);

    const renderer = app.renderer as Renderer;
    renderer.render({
      container,
      target: texture,
      clear: true,
    });
    container.destroy({ children: true });

    const sprite = new Sprite(texture);
    sprite.label = `overview-${key}`;
    this.cache.set(key, { texture, sprite, revision, width, height });
    this.invalid.delete(key);
    return sprite;
  }

  destroy(): void {
    this.clear();
  }
}
