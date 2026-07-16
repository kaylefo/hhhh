import { useGameStore } from '../state/gameStore';
import { Wordmark } from './Wordmark';
import styles from './TopBar.module.css';

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3 5h14M3 10h14M3 15h14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

type TopBarProps = {
  className?: string;
};

export function TopBar({ className }: TopBarProps) {
  const exactColorCount = useGameStore((s) => s.exactColorCount);
  const openMenu = useGameStore((s) => s.openMenu);

  return (
    <header className={[styles.topBar, className].filter(Boolean).join(' ')}>
      <Wordmark />
      <div className={styles.stats}>
        <span className={styles.statLabel}>Colors</span>
        <span className={styles.statValue} aria-live="polite">
          {exactColorCount.toLocaleString()}
        </span>
      </div>
      <button
        type="button"
        className={styles.menuButton}
        onClick={openMenu}
        aria-label="Open menu"
      >
        <MenuIcon />
      </button>
    </header>
  );
}
