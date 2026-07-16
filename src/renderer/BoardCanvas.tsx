import { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';
import type { AxialCoordinate, CameraState, Settings, TileRecord } from '@/game/types';
import { BoardRenderer } from './BoardRenderer';

export type BoardCanvasProps = {
  tiles: Map<string, TileRecord>;
  frontier: AxialCoordinate[];
  camera: CameraState;
  pendingColor?: number | null;
  selectedTileKey?: string | null;
  interactionEnabled?: boolean;
  onTileTap: (q: number, r: number) => void;
  onFrontierTap: (q: number, r: number) => void;
  onPanChange: (camera: CameraState) => void;
  getSettings: () => Settings;
  className?: string;
  onRendererReady?: (bridge: {
    centerOrigin: (animated?: boolean) => void;
    centerOn: (q: number, r: number, animated?: boolean) => void;
    highlightTile: (q: number, r: number, durationMs: number) => void;
    setCamera: (camera: CameraState) => void;
    captureViewport: (opts: {
      width: number;
      height: number;
      includeCount?: boolean;
      colorCount?: number;
    }) => Promise<Blob>;
  }) => void;
};

export function BoardCanvas({
  tiles,
  frontier,
  camera,
  pendingColor = null,
  selectedTileKey = null,
  interactionEnabled = true,
  onTileTap,
  onFrontierTap,
  onPanChange,
  getSettings,
  className,
  onRendererReady,
}: BoardCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const rendererRef = useRef<BoardRenderer | null>(null);
  const onTileTapRef = useRef(onTileTap);
  const onFrontierTapRef = useRef(onFrontierTap);
  const onPanChangeRef = useRef(onPanChange);
  const getSettingsRef = useRef(getSettings);

  onTileTapRef.current = onTileTap;
  onFrontierTapRef.current = onFrontierTap;
  onPanChangeRef.current = onPanChange;
  getSettingsRef.current = getSettings;

  /* eslint-disable react-hooks/exhaustive-deps -- Pixi mounts once; props sync in effects below */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    const app = new Application();
    appRef.current = app;

    const setup = async () => {
      await app.init({
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
        preference: 'webgl',
      });

      if (disposed) {
        app.destroy(true);
        return;
      }

      host.appendChild(app.canvas);
      app.canvas.style.touchAction = 'none';

      const rect = host.getBoundingClientRect();
      app.renderer.resize(Math.max(1, rect.width), Math.max(1, rect.height));

      const renderer = new BoardRenderer(app, {
        onTileTap: (q, r) => onTileTapRef.current(q, r),
        onFrontierTap: (q, r) => onFrontierTapRef.current(q, r),
        onPanChange: (cameraState) => onPanChangeRef.current(cameraState),
        getSettings: () => getSettingsRef.current(),
      });
      rendererRef.current = renderer;
      renderer.resize(rect.width, rect.height);
      renderer.setCamera(camera);
      renderer.setTiles(tiles);
      renderer.setFrontier(frontier);
      renderer.setPendingColor(pendingColor);
      renderer.setSelectedTile(selectedTileKey);
      renderer.setInteractionEnabled(interactionEnabled);

      const settings = getSettings();
      renderer.setMaterial(settings.material);
      renderer.setColorPatterns(settings.colorPatterns);
      renderer.setReducedMotion(settings.reducedMotion ?? false);

      onRendererReady?.({
        centerOrigin: (animated) => renderer.centerOrigin(animated),
        centerOn: (q, r, animated) => renderer.centerOn(q, r, animated),
        highlightTile: (q, r, ms) => renderer.highlightTile(q, r, ms),
        setCamera: (c) => renderer.setCamera(c),
        captureViewport: (opts) => renderer.captureViewport(opts),
      });

      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const { width, height } = entry.contentRect;
        app.renderer.resize(Math.max(1, width), Math.max(1, height));
        renderer.resize(width, height);
        renderer.invalidate();
      });
      observer.observe(host);

      return () => {
        observer.disconnect();
      };
    };

    let cleanupResize: (() => void) | undefined;
    void setup().then((cleanup) => {
      cleanupResize = cleanup;
    });

    return () => {
      disposed = true;
      cleanupResize?.();
      rendererRef.current?.destroy();
      rendererRef.current = null;
      appRef.current?.destroy(true);
      appRef.current = null;
      host.replaceChildren();
    };
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.setTiles(tiles);
  }, [tiles]);

  useEffect(() => {
    rendererRef.current?.setFrontier(frontier);
  }, [frontier]);

  useEffect(() => {
    rendererRef.current?.setCamera(camera);
  }, [camera]);

  useEffect(() => {
    rendererRef.current?.setPendingColor(pendingColor ?? null);
  }, [pendingColor]);

  useEffect(() => {
    rendererRef.current?.setSelectedTile(selectedTileKey ?? null);
  }, [selectedTileKey]);

  useEffect(() => {
    rendererRef.current?.setInteractionEnabled(interactionEnabled);
  }, [interactionEnabled]);

  useEffect(() => {
    const settings = getSettings();
    rendererRef.current?.setMaterial(settings.material);
    rendererRef.current?.setColorPatterns(settings.colorPatterns);
    rendererRef.current?.setReducedMotion(settings.reducedMotion ?? false);
  }, [getSettings]);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
    />
  );
}

export { BoardRenderer };
