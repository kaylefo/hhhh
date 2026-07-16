import { useCallback, useEffect, useRef } from 'react';
import type { DiscoveryRecord } from '../game/types';
import { maxInGamutChroma } from '../game/color/gamut';
import styles from './GamutAtlas.module.css';

type GamutAtlasProps = {
  discoveries: DiscoveryRecord[];
  className?: string;
};

export function GamutAtlas({ discoveries, className }: GamutAtlasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = Math.max(280, container.clientHeight);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = width / 2;
    const cy = height / 2;
    const maxRadius = Math.min(width, height) * 0.42;

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

    for (const d of discoveries) {
      const { L, C, h } = d.oklch;
      const hueRad = (h * Math.PI) / 180 - Math.PI / 2;
      const maxC = maxInGamutChroma(L, h);
      const radius = maxC > 0 ? (C / maxC) * maxRadius : 0;
      const x = cx + Math.cos(hueRad) * radius;
      const y = cy + Math.sin(hueRad) * radius;

      ctx.beginPath();
      ctx.fillStyle = d.hex;
      ctx.globalAlpha = 0.35 + L * 0.55;
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('Chroma →', cx + maxRadius + 8, cy + 4);
    ctx.save();
    ctx.translate(12, cy);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Hue', 0, 0);
    ctx.restore();
  }, [discoveries]);

  useEffect(() => {
    draw();
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  return (
    <div ref={containerRef} className={[styles.container, className].filter(Boolean).join(' ')}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label="Polar OKLCH gamut atlas" role="img" />
      {discoveries.length === 0 ? (
        <p className={styles.empty}>Place tiles to populate your gamut atlas.</p>
      ) : null}
    </div>
  );
}
