import type { MaterialId } from '../game/types';
import { MATERIAL_UNLOCKS } from '../game/constants';
import styles from './MaterialPicker.module.css';

const MATERIAL_LABELS: Record<MaterialId, string> = {
  soft: 'Soft',
  glass: 'Glass',
  ink: 'Ink',
  neon: 'Neon',
  prism: 'Prism',
};

type MaterialPickerProps = {
  value: MaterialId;
  unlocked: MaterialId[];
  exactColorCount: number;
  onChange: (material: MaterialId) => void;
};

export function MaterialPicker({ value, unlocked, exactColorCount, onChange }: MaterialPickerProps) {
  const materials = Object.keys(MATERIAL_UNLOCKS) as MaterialId[];

  return (
    <div className={styles.picker} role="radiogroup" aria-label="Board material">
      {materials.map((id) => {
        const required = MATERIAL_UNLOCKS[id];
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
            <span className={[styles.preview, styles[`material_${id}`]].join(' ')} aria-hidden="true" />
            <span className={styles.label}>{MATERIAL_LABELS[id]}</span>
            {!isUnlocked ? (
              <span className={styles.requirement}>{required.toLocaleString()} colors</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
