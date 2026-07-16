import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DiscoveryRecord } from '../game/types';
import { textColorForBackground } from '../game/color/contrast';
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
  const goToDiscovery = useGameStore((s) => s.goToDiscovery);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(320);
  const [selected, setSelected] = useState<DiscoveryRecord | null>(null);

  const sorted = useMemo(
    () =>
      [...discoveries].sort((a, b) => {
        const aNeutral = a.oklch.C < 0.03;
        const bNeutral = b.oklch.C < 0.03;
        if (aNeutral !== bNeutral) return aNeutral ? 1 : -1;
        if (aNeutral && bNeutral) return b.oklch.L - a.oklch.L;
        if (a.oklch.h !== b.oklch.h) return a.oklch.h - b.oklch.h;
        if (a.oklch.C !== b.oklch.C) return b.oklch.C - a.oklch.C;
        return b.oklch.L - a.oklch.L;
      }),
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
    <>
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
            const textColor = textColorForBackground(item.packed);
            return (
              <button
                key={item.packed}
                type="button"
                className={styles.cell}
                style={{
                  transform: `translate(${left}px, ${top}px)`,
                  backgroundColor: item.hex,
                  color: textColor,
                }}
                onClick={() => setSelected(item)}
                aria-label={`${item.hex.toUpperCase()} discovery`}
                role="listitem"
              >
                <span className={styles.hexLabel}>{item.hex.slice(1).toUpperCase()}</span>
              </button>
            );
          })}
        </div>
        {sorted.length === 0 ? <p className={styles.empty}>No discoveries yet.</p> : null}
      </div>

      {selected ? (
        <div className={styles.detailBar}>
          <span>{selected.hex.toUpperCase()}</span>
          <button type="button" onClick={() => goToDiscovery(selected)}>
            Go to tile
          </button>
          <button type="button" onClick={() => setSelected(null)}>
            Close
          </button>
        </div>
      ) : null}
    </>
  );
}
