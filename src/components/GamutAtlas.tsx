import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DiscoveryRecord } from '../game/types';
import { createColorRecord, formatRgbDisplay } from '../game/color/formatting';
import { formatOklchDisplay } from '../game/color/oklch';
import { useGameStore } from '../state/gameStore';
import { medianDiscoveryLightness, type GamutAtlasPoint } from '../workers/gamutWorker';
import styles from './GamutAtlas.module.css';

const LIGHTNESS_TOLERANCE = 0.04;

type GamutAtlasProps = {
  discoveries: DiscoveryRecord[];
  className?: string;
};

type ViewTransform = {
  zoom: number;
  panX: number;
  panY: number;
};

export function GamutAtlas({ discoveries, className }: GamutAtlasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const goToDiscovery = useGameStore((s) => s.goToDiscovery);
  const copyToClipboard = useGameStore((s) => s.copyToClipboard);

  const medianL = useMemo(() => medianDiscoveryLightness(discoveries), [discoveries]);
  const [lightness, setLightness] = useState(medianL);
  const [allLightness, setAllLightness] = useState(false);
  const [points, setPoints] = useState<GamutAtlasPoint[]>([]);
  const [selected, setSelected] = useState<DiscoveryRecord | null>(null);
  const [view, setView] = useState<ViewTransform>({ zoom: 1, panX: 0, panY: 0 });

  const gestureRef = useRef<{
    mode: 'none' | 'pan' | 'pinch';
    lastX: number;
    lastY: number;
    startDist: number;
    startZoom: number;
    moved: boolean;
  }>({ mode: 'none', lastX: 0, lastY: 0, startDist: 0, startZoom: 1, moved: false });

  useEffect(() => {
    setLightness(medianL);
  }, [medianL]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const input = {
      discoveries,
      lightness,
      tolerance: LIGHTNESS_TOLERANCE,
      allLightness,
    };

    if (discoveries.length < 800) {
      void import('../workers/gamutWorker').then(({ aggregateGamutPoints }) => {
        setPoints(aggregateGamutPoints(input));
      });
      return;
    }

    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('../workers/gamutAtlasWorker.ts', import.meta.url), {
        type: 'module',
      });
      workerRef.current.onmessage = (event: MessageEvent<GamutAtlasPoint[]>) => {
        setPoints(event.data);
      };
    }

    workerRef.current.postMessage(input);
  }, [discoveries, lightness, allLightness]);

  const discoveryByPacked = useMemo(() => {
    const map = new Map<number, DiscoveryRecord>();
    for (const d of discoveries) map.set(d.packed, d);
    return map;
  }, [discoveries]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = container.clientWidth;
    const height = Math.max(280, container.clientHeight);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = width / 2 + view.panX;
    const cy = height / 2 + view.panY;
    const maxRadius = Math.min(width, height) * 0.38 * view.zoom;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0a0c10';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let ring = 1; ring <= 4; ring++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (maxRadius * ring) / 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * maxRadius, cy + Math.sin(angle) * maxRadius);
      ctx.stroke();
    }

    for (const p of points) {
      const x = cx + p.x * maxRadius;
      const y = cy + p.y * maxRadius;
      ctx.beginPath();
      ctx.fillStyle = p.hex;
      ctx.globalAlpha = p.opacity;
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (selected) {
      const sel = points.find((p) => p.packed === selected.packed);
      if (sel) {
        const x = cx + sel.x * maxRadius;
        const y = cy + sel.y * maxRadius;
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, sel.size + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }, [points, selected, view]);

  useEffect(() => {
    draw();
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  const hitTest = useCallback(
    (clientX: number, clientY: number): DiscoveryRecord | null => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container || points.length === 0) return null;

      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const cx = rect.width / 2 + view.panX;
      const cy = rect.height / 2 + view.panY;
      const maxRadius = Math.min(rect.width, rect.height) * 0.38 * view.zoom;

      let best: { dist: number; packed: number } | null = null;
      for (const p of points) {
        const px = cx + p.x * maxRadius;
        const py = cy + p.y * maxRadius;
        const dist = Math.hypot(x - px, y - py);
        const threshold = p.size + 6;
        if (dist <= threshold && (!best || dist < best.dist)) {
          best = { dist, packed: p.packed };
        }
      }

      return best ? discoveryByPacked.get(best.packed) ?? null : null;
    },
    [points, view, discoveryByPacked],
  );

  const onPointerDown = (event: React.PointerEvent) => {
    gestureRef.current = {
      mode: 'pan',
      lastX: event.clientX,
      lastY: event.clientY,
      startDist: 0,
      startZoom: view.zoom,
      moved: false,
    };
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const g = gestureRef.current;
    if (g.mode === 'none') return;

    if (event.pointerType === 'touch' && event.isPrimary === false) return;

    const dx = event.clientX - g.lastX;
    const dy = event.clientY - g.lastY;
    if (Math.hypot(dx, dy) > 4) g.moved = true;

    setView((prev) => ({
      ...prev,
      panX: prev.panX + dx,
      panY: prev.panY + dy,
    }));
    g.lastX = event.clientX;
    g.lastY = event.clientY;
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const g = gestureRef.current;
    if (!g.moved) {
      const hit = hitTest(event.clientX, event.clientY);
      setSelected(hit);
    }
    gestureRef.current = { mode: 'none', lastX: 0, lastY: 0, startDist: 0, startZoom: 1, moved: false };
  };

  const onWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 0.92 : 1.08;
    setView((prev) => ({
      ...prev,
      zoom: Math.min(3.5, Math.max(0.5, prev.zoom * factor)),
    }));
  };

  return (
    <div className={[styles.wrapper, className].filter(Boolean).join(' ')}>
      <div className={styles.controls}>
        <label className={styles.controlLabel} htmlFor="gamut-lightness">
          Lightness
        </label>
        <input
          id="gamut-lightness"
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(lightness * 100)}
          disabled={allLightness}
          onChange={(e) => setLightness(Number(e.target.value) / 100)}
          className={styles.slider}
        />
        <span className={styles.lightnessValue}>{(lightness * 100).toFixed(0)}%</span>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={allLightness}
            onChange={(e) => setAllLightness(e.target.checked)}
          />
          All lightness
        </label>
      </div>

      <div
        ref={containerRef}
        className={styles.container}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <canvas ref={canvasRef} className={styles.canvas} aria-label="Polar OKLCH gamut atlas" role="img" />
        {discoveries.length === 0 ? (
          <p className={styles.empty}>Place tiles to populate your gamut atlas.</p>
        ) : null}
      </div>

      {selected ? (
        <div className={styles.detail}>
          <DiscoveryDetail
            discovery={selected}
            onGoToTile={() => goToDiscovery(selected)}
            onCopy={(text, label) => void copyToClipboard(text, label)}
            onClose={() => setSelected(null)}
          />
        </div>
      ) : null}
    </div>
  );
}

function DiscoveryDetail({
  discovery,
  onGoToTile,
  onCopy,
  onClose,
}: {
  discovery: DiscoveryRecord;
  onGoToTile: () => void;
  onCopy: (text: string, label: string) => void;
  onClose: () => void;
}) {
  const color = createColorRecord(discovery.packed);
  return (
    <div className={styles.detailCard}>
      <div className={styles.detailHeader}>
        <span className={styles.detailSwatch} style={{ backgroundColor: color.hex }} aria-hidden="true" />
        <div>
          <p className={styles.detailHex}>{color.hex.toUpperCase()}</p>
          <p className={styles.detailMeta}>
            RGB {formatRgbDisplay(color.rgb)} · OKLCH {formatOklchDisplay(color.oklch)}
          </p>
        </div>
        <button type="button" className={styles.detailClose} onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <div className={styles.detailActions}>
        <button type="button" className={styles.detailButton} onClick={onGoToTile}>
          Go to tile
        </button>
        <button type="button" className={styles.detailButton} onClick={() => onCopy(color.hex, 'hex')}>
          Copy
        </button>
      </div>
    </div>
  );
}
