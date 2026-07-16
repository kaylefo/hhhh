import { useMemo } from 'react';
import { createColorRecord, formatRgbDisplay } from '../game/color/formatting';
import { formatHslDisplay, formatOklchDisplay } from '../game/color/oklch';
import { useGameStore } from '../state/gameStore';
import styles from './PendingColorTray.module.css';

type PendingColorTrayProps = {
  className?: string;
};

export function PendingColorTray({ className }: PendingColorTrayProps) {
  const pendingRoll = useGameStore((s) => s.pendingRoll);
  const interactionState = useGameStore((s) => s.interactionState);

  const color = useMemo(
    () => (pendingRoll ? createColorRecord(pendingRoll.packedColor) : null),
    [pendingRoll],
  );

  if (!pendingRoll || interactionState !== 'pendingPlacement' || !color) {
    return null;
  }

  const parentSummary = pendingRoll.parents
    .map((p) => `${p.type.slice(0, 1).toUpperCase()} ${p.weight.toFixed(2)}`)
    .join(' · ');

  return (
    <section
      className={[styles.tray, className].filter(Boolean).join(' ')}
      aria-label="Pending color"
    >
      <div className={styles.swatch} style={{ backgroundColor: color.hex }} aria-hidden="true" />
      <div className={styles.details}>
        <p className={styles.hex}>{color.hex.toUpperCase()}</p>
        <p className={styles.formats}>
          RGB {formatRgbDisplay(color.rgb)} · OKLCH {formatOklchDisplay(color.oklch)}
        </p>
        <p className={styles.formats}>HSL {formatHslDisplay(color.hsl)}</p>
        <p className={styles.recipe}>{parentSummary}</p>
      </div>
    </section>
  );
}
