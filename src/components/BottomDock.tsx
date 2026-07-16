import { useGameStore } from '../state/gameStore';
import { RollDie } from './RollDie';
import styles from './BottomDock.module.css';

function GamutIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M11 3v16M3 11h16"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <circle cx="11" cy="11" r="3" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

function InspectorIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 14l2-3 2 2 3-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

type BottomDockProps = {
  className?: string;
};

export function BottomDock({ className }: BottomDockProps) {
  const setView = useGameStore((s) => s.setView);
  const view = useGameStore((s) => s.view);
  const selectedTile = useGameStore((s) => s.selectedTile);
  const inspectorOpen = useGameStore((s) => s.inspectorOpen);
  const openMenu = useGameStore((s) => s.openMenu);

  const showInspector = selectedTile !== null;

  const handleInspector = () => {
    if (showInspector) {
      useGameStore.setState({ inspectorOpen: !inspectorOpen });
    } else {
      openMenu();
    }
  };

  return (
    <footer className={[styles.dock, className].filter(Boolean).join(' ')}>
      <button
        type="button"
        className={[styles.sideButton, view === 'gamut' ? styles.active : ''].join(' ')}
        onClick={() => setView('gamut')}
        aria-label="Open gamut view"
        aria-pressed={view === 'gamut'}
      >
        <GamutIcon />
        <span className={styles.sideLabel}>Gamut</span>
      </button>

      <div className={styles.dieSlot}>
        <RollDie />
      </div>

      <button
        type="button"
        className={[styles.sideButton, inspectorOpen ? styles.active : ''].join(' ')}
        onClick={handleInspector}
        aria-label={showInspector ? 'Toggle tile inspector' : 'Open menu'}
        aria-pressed={inspectorOpen}
      >
        <InspectorIcon />
        <span className={styles.sideLabel}>{showInspector ? 'Inspect' : 'Menu'}</span>
      </button>
    </footer>
  );
}
