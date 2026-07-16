import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DiscoveryRecord } from '../game/types';
import { useGameStore } from '../state/gameStore';
import styles from './SwatchGrid.module.css';

const CELL_SIZE = 56;
const GAP = 6;
const OVERSCAN_ROWS = 2;

type SwatchGridProps = {
  discoveries: DiscoveryRecord[];
  className?: string;
};

export function SwatchGrid({ discoveries, className }: SwatchGridProps) {
  const copyToClipboard = useGameStore((s) => s.copyToClipboard);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(320);

  const sorted = useMemo(
    () => [...discoveries].sort((a, b) => b.firstSeenAt - a.firstSeenAt),
    [discoveries],
  );

  const columns = Math.max(1, Math.floor((containerWidth + GAP) / (CELL_SIZE + GAP)));
  const rowCount = Math.ceil(sorted.length / columns);
  const totalHeight = rowCount * (CELL_SIZE + GAP);

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    setContainerWidth(el.clientWidth);
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => onScroll());
    observer.observe(node);
    return () => observer.disconnect();
  }, [onScroll]);

  const viewportHeight = containerRef.current?.clientHeight ?? 400;
  const startRow = Math.max(0, Math.floor(scrollTop / (CELL_SIZE + GAP)) - OVERSCAN_ROWS);
  const endRow = Math.min(
    rowCount,
    Math.ceil((scrollTop + viewportHeight) / (CELL_SIZE + GAP)) + OVERSCAN_ROWS,
  );

  const visible: { item: DiscoveryRecord; index: number }[] = [];
  for (let row = startRow; row < endRow; row++) {
    for (let col = 0; col < columns; col++) {
      const index = row * columns + col;
      const item = sorted[index];
      if (item) visible.push({ item, index });
    }
  }

  return (
    <div
      ref={containerRef}
      className={[styles.grid, className].filter(Boolean).join(' ')}
      onScroll={onScroll}
      role="list"
      aria-label="Discovery swatches"
    >
      <div className={styles.spacer} style={{ height: totalHeight }}>
        {visible.map(({ item, index }) => {
          const row = Math.floor(index / columns);
          const col = index % columns;
          const top = row * (CELL_SIZE + GAP);
          const left = col * (CELL_SIZE + GAP);
          return (
            <button
              key={item.packed}
              type="button"
              className={styles.cell}
              style={{ transform: `translate(${left}px, ${top}px)`, backgroundColor: item.hex }}
              onClick={() => void copyToClipboard(item.hex, 'hex')}
              aria-label={`Copy ${item.hex}`}
              title={item.hex.toUpperCase()}
              role="listitem"
            />
          );
        })}
      </div>
      {sorted.length === 0 ? <p className={styles.empty}>No discoveries yet.</p> : null}
    </div>
  );
}
