import { useState } from 'react';
import { useGameStore } from '../state/gameStore';
import styles from './ShareViewSheet.module.css';

type ShareViewSheetProps = {
  open: boolean;
  onClose: () => void;
};

export function ShareViewSheet({ open, onClose }: ShareViewSheetProps) {
  const shareCurrentView = useGameStore((s) => s.shareCurrentView);
  const [format, setFormat] = useState<'portrait' | 'square'>('portrait');
  const [includeCount, setIncludeCount] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const generate = async () => {
    setBusy(true);
    try {
      await shareCurrentView({ format, includeCount });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <section
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label="Share current view"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={styles.title}>Share current view</h2>

        <div className={styles.options} role="group" aria-label="Image format">
          <button
            type="button"
            className={[styles.option, format === 'portrait' ? styles.active : ''].join(' ')}
            aria-pressed={format === 'portrait'}
            onClick={() => setFormat('portrait')}
          >
            Portrait
          </button>
          <button
            type="button"
            className={[styles.option, format === 'square' ? styles.active : ''].join(' ')}
            aria-pressed={format === 'square'}
            onClick={() => setFormat('square')}
          >
            Square
          </button>
        </div>

        <label className={styles.toggleRow}>
          <span>Include color count</span>
          <input
            type="checkbox"
            role="switch"
            checked={includeCount}
            onChange={(e) => setIncludeCount(e.target.checked)}
          />
        </label>

        <div className={styles.actions}>
          <button type="button" className={styles.primary} disabled={busy} onClick={() => void generate()}>
            {busy ? 'Generating…' : 'Generate image'}
          </button>
          <button type="button" className={styles.secondary} onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </div>
  );
}
