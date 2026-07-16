import type { DieStyleId } from '../game/types';
import { DIE_STYLE_UNLOCKS } from '../game/constants';
import styles from './DieStylePicker.module.css';

const STYLE_LABELS: Record<DieStyleId, string> = {
  cube: 'Cube',
  orb: 'Orb',
  facet: 'Facet',
  halo: 'Halo',
};

type DieStylePickerProps = {
  value: DieStyleId;
  unlocked: DieStyleId[];
  exactColorCount: number;
  onChange: (style: DieStyleId) => void;
};

export function DieStylePicker({ value, unlocked, exactColorCount, onChange }: DieStylePickerProps) {
  const stylesList = Object.keys(DIE_STYLE_UNLOCKS) as DieStyleId[];

  return (
    <div className={styles.picker} role="radiogroup" aria-label="Die style">
      {stylesList.map((id) => {
        const required = DIE_STYLE_UNLOCKS[id];
        const isUnlocked = unlocked.includes(id) || exactColorCount >= required;
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={!isUnlocked}
            className={[styles.option, selected ? styles.selected : '', !isUnlocked ? styles.locked : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => onChange(id)}
          >
            <span className={[styles.preview, styles[`style_${id}`]].join(' ')} aria-hidden="true" />
            <span className={styles.label}>{STYLE_LABELS[id]}</span>
            {!isUnlocked ? (
              <span className={styles.requirement}>{required.toLocaleString()} colors</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
