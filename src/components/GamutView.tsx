import { useState } from 'react';
import { rgbCellProgressPercent } from '../game/color/formatting';
import { EXACT_COLOR_UNIVERSE, RGB_CELL_COUNT } from '../game/constants';
import { useGameStore } from '../state/gameStore';
import { GamutHexSearch } from './GamutHexSearch';
import { GamutAtlas } from './GamutAtlas';
import { SwatchGrid } from './SwatchGrid';
import styles from './GamutView.module.css';

type GamutTab = 'atlas' | 'swatches';

type GamutViewProps = {
  className?: string;
};

export function GamutView({ className }: GamutViewProps) {
  const exactColorCount = useGameStore((s) => s.exactColorCount);
  const rgbCellCount = useGameStore((s) => s.rgbCellCount);
  const discoveries = useGameStore((s) => s.discoveries);
  const setView = useGameStore((s) => s.setView);
  const [tab, setTab] = useState<GamutTab>('atlas');

  const rgbPct = rgbCellProgressPercent(rgbCellCount, RGB_CELL_COUNT);

  return (
    <div className={[styles.view, className].filter(Boolean).join(' ')}>
      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={() => setView('board')} aria-label="Back to board">
          ← Board
        </button>
        <h1 className={styles.title}>Gamut</h1>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Exact</span>
            <span className={styles.statValue}>
              {exactColorCount.toLocaleString()} / {EXACT_COLOR_UNIVERSE.toLocaleString()}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>RGB map</span>
            <span className={styles.statValue}>
              {rgbCellCount.toLocaleString()} / {RGB_CELL_COUNT.toLocaleString()} ({rgbPct}%)
            </span>
          </div>
        </div>
      </header>

      <GamutHexSearch discoveries={discoveries} />

      <div className={styles.tabs} role="tablist" aria-label="Gamut views">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'atlas'}
          className={[styles.tab, tab === 'atlas' ? styles.tabActive : ''].join(' ')}
          onClick={() => setTab('atlas')}
        >
          Atlas
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'swatches'}
          className={[styles.tab, tab === 'swatches' ? styles.tabActive : ''].join(' ')}
          onClick={() => setTab('swatches')}
        >
          Swatches
        </button>
      </div>

      <div className={styles.panel} role="tabpanel">
        {tab === 'atlas' ? <GamutAtlas discoveries={discoveries} /> : <SwatchGrid discoveries={discoveries} />}
      </div>
    </div>
  );
}
