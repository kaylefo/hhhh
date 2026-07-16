import {
  CAMERA_DEBOUNCE_MS,
  ZOOM_MAX,
  ZOOM_MIN,
} from '@/game/constants';
import type { CameraState } from '@/game/types';

export type CameraControllerOptions = {
  onPanChange: (camera: CameraState) => void;
  getScreenSize: () => { width: number; height: number };
};

type PointerRecord = {
  id: number;
  x: number;
  y: number;
};

const FRICTION = 0.92;
const MIN_VELOCITY = 0.05;

export class CameraController {
  private camera: CameraState;
  private onPanChange: (camera: CameraState) => void;
  private getScreenSize: () => { width: number; height: number };
  private pointers = new Map<number, PointerRecord>();
  private panning = false;
  private pinchStartDistance = 0;
  private pinchStartZoom = 1;
  private lastPanX = 0;
  private lastPanY = 0;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private animating = false;
  private animationFrom: CameraState | null = null;
  private animationTo: CameraState | null = null;
  private animationStart = 0;
  private animationDuration = 0;

  constructor(initial: CameraState, options: CameraControllerOptions) {
    this.camera = { ...initial };
    this.onPanChange = options.onPanChange;
    this.getScreenSize = options.getScreenSize;
  }

  getCamera(): CameraState {
    return { ...this.camera };
  }

  setCamera(next: CameraState, emit = false): void {
    this.camera = {
      worldX: next.worldX,
      worldY: next.worldY,
      zoom: clampZoom(next.zoom),
      velocityX: next.velocityX ?? 0,
      velocityY: next.velocityY ?? 0,
    };
    if (emit) this.schedulePersist();
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const { width, height } = this.getScreenSize();
    const cx = width * 0.5;
    const cy = height * 0.5;
    return {
      x: (screenX - cx) / this.camera.zoom - this.camera.worldX,
      y: (screenY - cy) / this.camera.zoom - this.camera.worldY,
    };
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const { width, height } = this.getScreenSize();
    const cx = width * 0.5;
    const cy = height * 0.5;
    return {
      x: cx + (worldX + this.camera.worldX) * this.camera.zoom,
      y: cy + (worldY + this.camera.worldY) * this.camera.zoom,
    };
  }

  onPointerDown(id: number, x: number, y: number): void {
    this.pointers.set(id, { id, x, y });
    this.stopAnimation();
    if (this.pointers.size === 1) {
      this.panning = true;
      this.lastPanX = x;
      this.lastPanY = y;
      this.camera.velocityX = 0;
      this.camera.velocityY = 0;
    } else if (this.pointers.size === 2) {
      this.panning = false;
      this.pinchStartDistance = this.pointerDistance();
      this.pinchStartZoom = this.camera.zoom;
    }
  }

  onPointerMove(id: number, x: number, y: number): void {
    const prev = this.pointers.get(id);
    if (!prev) return;
    this.pointers.set(id, { id, x, y });

    if (this.pointers.size >= 2) {
      const dist = this.pointerDistance();
      if (this.pinchStartDistance > 0) {
        const scale = dist / this.pinchStartDistance;
        const nextZoom = clampZoom(this.pinchStartZoom * scale);
        const anchor = this.pointerMidpoint();
        this.zoomAround(anchor.x, anchor.y, nextZoom);
      }
      return;
    }

    if (!this.panning) return;
    const dx = x - this.lastPanX;
    const dy = y - this.lastPanY;
    this.lastPanX = x;
    this.lastPanY = y;
    this.camera.worldX += dx / this.camera.zoom;
    this.camera.worldY += dy / this.camera.zoom;
    this.camera.velocityX = dx / this.camera.zoom;
    this.camera.velocityY = dy / this.camera.zoom;
    this.schedulePersist(false);
  }

  onPointerUp(id: number): void {
    this.pointers.delete(id);
    if (this.pointers.size === 0) {
      this.panning = false;
      this.schedulePersist();
    } else if (this.pointers.size === 1) {
      const remaining = this.pointers.values().next().value as PointerRecord;
      this.panning = true;
      this.lastPanX = remaining.x;
      this.lastPanY = remaining.y;
    }
  }

  onWheel(deltaY: number, screenX: number, screenY: number): void {
    const factor = deltaY > 0 ? 0.9 : 1.1;
    const nextZoom = clampZoom(this.camera.zoom * factor);
    this.zoomAround(screenX, screenY, nextZoom);
    this.camera.velocityX = 0;
    this.camera.velocityY = 0;
    this.schedulePersist();
  }

  centerOrigin(animated = false): void {
    this.animateTo({ ...this.camera, worldX: 0, worldY: 0, velocityX: 0, velocityY: 0 }, animated ? 320 : 0);
  }

  centerOn(q: number, r: number, radius: number, animated = false): void {
    const worldX = -radius * Math.sqrt(3) * (q + r / 2);
    const worldY = -radius * 1.5 * r;
    this.animateTo({ ...this.camera, worldX, worldY, velocityX: 0, velocityY: 0 }, animated ? 320 : 0);
  }

  update(deltaMs: number): boolean {
    let changed = false;

    if (this.animating && this.animationFrom && this.animationTo) {
      const t = Math.min(1, (performance.now() - this.animationStart) / this.animationDuration);
      const eased = easeOutCubic(t);
      this.camera.worldX = lerp(this.animationFrom.worldX, this.animationTo.worldX, eased);
      this.camera.worldY = lerp(this.animationFrom.worldY, this.animationTo.worldY, eased);
      this.camera.zoom = lerp(this.animationFrom.zoom, this.animationTo.zoom, eased);
      changed = true;
      if (t >= 1) {
        this.animating = false;
        this.animationFrom = null;
        this.animationTo = null;
        this.schedulePersist();
      }
    } else if (!this.panning && this.pointers.size === 0) {
      if (Math.abs(this.camera.velocityX) > MIN_VELOCITY || Math.abs(this.camera.velocityY) > MIN_VELOCITY) {
        this.camera.worldX += this.camera.velocityX;
        this.camera.worldY += this.camera.velocityY;
        const decay = FRICTION ** (deltaMs / 16.67);
        this.camera.velocityX *= decay;
        this.camera.velocityY *= decay;
        changed = true;
        this.schedulePersist(false);
      }
    }

    return changed;
  }

  destroy(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.pointers.clear();
  }

  private zoomAround(screenX: number, screenY: number, nextZoom: number): void {
    const before = this.screenToWorld(screenX, screenY);
    this.camera.zoom = nextZoom;
    const after = this.screenToWorld(screenX, screenY);
    this.camera.worldX += after.x - before.x;
    this.camera.worldY += after.y - before.y;
  }

  private pointerDistance(): number {
    const pts = [...this.pointers.values()];
    if (pts.length < 2) return 0;
    const dx = pts[0]!.x - pts[1]!.x;
    const dy = pts[0]!.y - pts[1]!.y;
    return Math.hypot(dx, dy);
  }

  private pointerMidpoint(): { x: number; y: number } {
    const pts = [...this.pointers.values()];
    if (pts.length < 2) return pts[0] ?? { x: 0, y: 0 };
    return { x: (pts[0]!.x + pts[1]!.x) * 0.5, y: (pts[0]!.y + pts[1]!.y) * 0.5 };
  }

  private animateTo(target: CameraState, durationMs: number): void {
    if (durationMs <= 0) {
      this.setCamera(target, true);
      return;
    }
    this.animationFrom = { ...this.camera };
    this.animationTo = { ...target, zoom: clampZoom(target.zoom) };
    this.animationStart = performance.now();
    this.animationDuration = durationMs;
    this.animating = true;
  }

  private stopAnimation(): void {
    this.animating = false;
    this.animationFrom = null;
    this.animationTo = null;
  }

  private schedulePersist(force = true): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    if (!force) return;
    this.persistTimer = setTimeout(() => {
      this.onPanChange(this.getCamera());
      this.persistTimer = null;
    }, CAMERA_DEBOUNCE_MS);
  }
}

function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}
