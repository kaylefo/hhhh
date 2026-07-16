import { useMemo, useState } from 'react';
import type { DiscoveryRecord } from '../game/types';
import { createColorRecord, formatRgbDisplay } from '../game/color/formatting';
import { formatHslDisplay, formatOklchDisplay } from '../game/color/oklch';
import { deltaEOK } from '../game/color/oklab';
import { parseHex, formatHex } from '../game/color/srgb';
import { useGameStore } from '../state/gameStore';
import styles from './GamutHexSearch.module.css';

type GamutHexSearchProps = {
  discoveries: DiscoveryRecord[];
};

export function GamutHexSearch({ discoveries }: GamutHexSearchProps) {
  const [query, setQuery] = useState('');
  const goToDiscovery = useGameStore((s) => s.goToDiscovery);
  const copyToClipboard = useGameStore((s) => s.copyToClipboard);

  const packed = useMemo(() => parseHex(query.trim()), [query]);
  const normalizedHex = packed != null ? formatHex(packed).toUpperCase() : null;

  const match = useMemo(
    () => (packed != null ? discoveries.find((d) => d.packed === packed) ?? null : null),
    [discoveries, packed],
  );

  const closest = useMemo(() => {
    if (packed == null || discoveries.length === 0 || match) return null;
    const target = createColorRecord(packed).oklab;
    let best: DiscoveryRecord | null = null;
    let bestDist = Infinity;
    for (const d of discoveries) {
      const dist = deltaEOK(target, d.oklab);
      if (dist < bestDist) {
        bestDist = dist;
        best = d;
      }
    }
    return best;
  }, [discoveries, match, packed]);

  return (
    <section className={styles.search} aria-label="Hex search">
      <label className={styles.label} htmlFor="gamut-hex-search">
        Search hex
      </label>
      <input
        id="gamut-hex-search"
        className={styles.input}
        type="search"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        placeholder="#AABBCC"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {normalizedHex && !match ? (
        <div className={styles.result}>
          <div className={styles.previewRow}>
            <span className={styles.swatch} style={{ backgroundColor: normalizedHex }} aria-hidden="true" />
            <div>
              <p className={styles.status}>Not discovered</p>
              <p className={styles.hex}>{normalizedHex}</p>
            </div>
          </div>
          {closest ? (
            <p className={styles.closest}>
              Closest discovered:{' '}
              <button type="button" className={styles.linkButton} onClick={() => goToDiscovery(closest)}>
                {closest.hex.toUpperCase()}
              </button>
            </p>
          ) : null}
        </div>
      ) : null}

      {match ? (
        <DiscoveryCard
          discovery={match}
          onGoToTile={() => goToDiscovery(match)}
          onCopy={(text, label) => void copyToClipboard(text, label)}
        />
      ) : null}
    </section>
  );
}

function DiscoveryCard({
  discovery,
  onGoToTile,
  onCopy,
}: {
  discovery: DiscoveryRecord;
  onGoToTile: () => void;
  onCopy: (text: string, label: string) => void;
}) {
  const color = createColorRecord(discovery.packed);
  return (
    <div className={styles.result}>
      <div className={styles.previewRow}>
        <span className={styles.swatch} style={{ backgroundColor: color.hex }} aria-hidden="true" />
        <div>
          <p className={styles.hex}>{color.hex.toUpperCase()}</p>
          <p className={styles.meta}>
            RGB {formatRgbDisplay(color.rgb)} · OKLCH {formatOklchDisplay(color.oklch)}
          </p>
          <p className={styles.meta}>HSL {formatHslDisplay(color.hsl)}</p>
        </div>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.actionButton} onClick={onGoToTile}>
          Go to tile
        </button>
        <button type="button" className={styles.actionButton} onClick={() => onCopy(color.hex, 'hex')}>
          Copy
        </button>
      </div>
    </div>
  );
}
