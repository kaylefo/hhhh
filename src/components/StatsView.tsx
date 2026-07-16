import { useMemo } from 'react';
import { formatPlayTime } from '../game/board/statistics';
import { rgbCellProgressPercent } from '../game/color/formatting';
import { hueBinCenter } from '../game/color/harmony';
import { HUE_BIN_COUNT, RGB_CELL_COUNT } from '../game/constants';
import { useGameStore } from '../state/gameStore';
import styles from './StatsView.module.css';

type StatsViewProps = {
  className?: string;
};

export function StatsView({ className }: StatsViewProps) {
  const meta = useGameStore((s) => s.meta);
  const exactColorCount = useGameStore((s) => s.exactColorCount);
  const rgbCellCount = useGameStore((s) => s.rgbCellCount);
  const setView = useGameStore((s) => s.setView);

  const stats = meta?.statistics;
  const histogram = meta?.hueHistogram;

  const histogramBars = useMemo(() => {
    if (!histogram) return [];
    let max = 1;
    for (let i = 0; i < HUE_BIN_COUNT; i++) {
      max = Math.max(max, histogram[i] ?? 0);
    }
    return Array.from({ length: HUE_BIN_COUNT }, (_, i) => ({
      bin: i,
      count: histogram[i] ?? 0,
      height: ((histogram[i] ?? 0) / max) * 100,
      hue: hueBinCenter(i),
    }));
  }, [histogram]);

  if (!stats) {
    return (
      <div className={[styles.view, className].filter(Boolean).join(' ')}>
        <header className={styles.header}>
          <button type="button" className={styles.backButton} onClick={() => setView('board')} aria-label="Back to board">
            ← Board
          </button>
          <h1 className={styles.title}>Statistics</h1>
        </header>
        <p className={styles.empty}>Statistics will appear once your world is initialized.</p>
      </div>
    );
  }

  return (
    <div className={[styles.view, className].filter(Boolean).join(' ')}>
      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={() => setView('board')} aria-label="Back to board">
          ← Board
        </button>
        <h1 className={styles.title}>Statistics</h1>
      </header>

      <section className={styles.grid} aria-label="World statistics">
        <StatCard label="Rolls" value={stats.rolls.toLocaleString()} />
        <StatCard label="Placed tiles" value={stats.placedTiles.toLocaleString()} />
        <StatCard label="Exact colors" value={exactColorCount.toLocaleString()} />
        <StatCard
          label="RGB cells"
          value={`${rgbCellCount.toLocaleString()} (${rgbCellProgressPercent(rgbCellCount, RGB_CELL_COUNT)}%)`}
        />
        <StatCard label="Shared edges" value={stats.sharedEdges.toLocaleString()} />
        <StatCard label="Completed vertices" value={stats.completedVertices.toLocaleString()} />
        <StatCard label="Palette anchors" value={stats.paletteAnchors.toLocaleString()} />
        <StatCard label="Largest discovery" value={stats.largestPlacementDiscovery.toLocaleString()} />
        <StatCard label="Play time" value={formatPlayTime(stats.totalPlayTimeMs)} />
      </section>

      <section className={styles.histogramSection} aria-label="Hue histogram">
        <h2 className={styles.sectionTitle}>Hue distribution</h2>
        <div className={styles.histogram}>
          {histogramBars.map((bar) => (
            <div key={bar.bin} className={styles.barWrap} title={`${Math.round(bar.hue)}° · ${bar.count}`}>
              <div
                className={styles.bar}
                style={{
                  height: `${Math.max(bar.height, bar.count > 0 ? 4 : 0)}%`,
                  backgroundColor: `hsl(${bar.hue} 65% 55%)`,
                }}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.card}>
      <span className={styles.cardLabel}>{label}</span>
      <span className={styles.cardValue}>{value}</span>
    </div>
  );
}
