import { useMemo, useState } from 'react';
import { NEIGHBOR_DIRECTIONS } from '../game/constants';
import { createColorRecord, formatRgbDisplay } from '../game/color/formatting';
import { formatHslDisplay, formatOklchDisplay } from '../game/color/oklch';
import {
  computeTileEdgeMixes,
  computeTileVertexMixes,
  formatParentType,
} from '../game/board/tileMixes';
import { getNeighbors } from '../game/hex/axial';
import { useGameStore } from '../state/gameStore';
import { ShareViewSheet } from './ShareViewSheet';
import styles from './TileInspector.module.css';

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
      <path d="M4 11V4.5A1.5 1.5 0 015.5 3H11" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

type TileInspectorProps = {
  className?: string;
};

export function TileInspector({ className }: TileInspectorProps) {
  const selectedTile = useGameStore((s) => s.selectedTile);
  const inspectorOpen = useGameStore((s) => s.inspectorOpen);
  const closeSheet = useGameStore((s) => s.closeSheet);
  const copyToClipboard = useGameStore((s) => s.copyToClipboard);
  const centerTile = useGameStore((s) => s.centerTile);
  const undo = useGameStore((s) => s.undo);
  const undoAvailable = useGameStore((s) => s.undoAvailable);
  const getTileAt = useGameStore((s) => s.getTileAt);
  const [shareOpen, setShareOpen] = useState(false);

  const color = useMemo(
    () => (selectedTile ? createColorRecord(selectedTile.packedColor) : null),
    [selectedTile],
  );

  const neighbors = useMemo(() => {
    if (!selectedTile) return [];
    return getNeighbors({ q: selectedTile.q, r: selectedTile.r }).map((coord, index) => ({
      ...coord,
      direction: NEIGHBOR_DIRECTIONS[index]!,
      tile: getTileAt(coord.q, coord.r),
    }));
  }, [selectedTile, getTileAt]);

  const edgeMixes = useMemo(
    () => (selectedTile ? computeTileEdgeMixes(selectedTile, getTileAt) : []),
    [selectedTile, getTileAt],
  );

  const vertexMixes = useMemo(
    () => (selectedTile ? computeTileVertexMixes(selectedTile, getTileAt) : []),
    [selectedTile, getTileAt],
  );

  if (!selectedTile || !inspectorOpen || !color) return null;

  const placedAt = new Date(selectedTile.placedAt).toLocaleString();
  const sourceKind = selectedTile.recipe.isFoundation
    ? 'Foundation anchor'
    : selectedTile.recipe.isPaletteExpansion
      ? 'Palette expansion'
      : 'Mixed roll';

  const copyField = (text: string, label: string) => {
    void copyToClipboard(text, label);
  };

  return (
    <>
      <section className={[styles.sheet, className].filter(Boolean).join(' ')} aria-label="Tile inspector">
        <header className={styles.header}>
          <div className={styles.preview} style={{ backgroundColor: color.hex }} aria-hidden="true" />
          <div>
            <h2 className={styles.title}>Tile ({selectedTile.q}, {selectedTile.r})</h2>
            <p className={styles.subtitle}>
              Roll #{selectedTile.rollIndex + 1} · {placedAt} · {sourceKind}
            </p>
          </div>
          <button type="button" className={styles.iconButton} onClick={closeSheet} aria-label="Close inspector">
            <CloseIcon />
          </button>
        </header>

        <div className={styles.formats}>
          <FormatRow label="Hex" value={color.hex.toUpperCase()} onCopy={() => copyField(color.hex, 'hex')} />
          <FormatRow
            label="RGB"
            value={formatRgbDisplay(color.rgb)}
            onCopy={() => copyField(formatRgbDisplay(color.rgb), 'RGB')}
          />
          <FormatRow
            label="HSL"
            value={formatHslDisplay(color.hsl)}
            onCopy={() => copyField(formatHslDisplay(color.hsl), 'HSL')}
          />
          <FormatRow
            label="OKLCH"
            value={formatOklchDisplay(color.oklch)}
            onCopy={() => copyField(formatOklchDisplay(color.oklch), 'OKLCH')}
          />
        </div>

        {selectedTile.recipe.parents.length > 0 ? (
          <section className={styles.recipe} aria-label="Parent recipe">
            <h3 className={styles.sectionTitle}>Recipe</h3>
            <ul className={styles.recipeList}>
              {selectedTile.recipe.parents.map((parent, index) => (
                <li key={`${parent.sourceId}-${index}`} className={styles.recipeItem}>
                  <span className={styles.neighborSwatch} style={{ backgroundColor: parent.hex }} aria-hidden="true" />
                  <span className={styles.recipeLabel}>
                    {formatParentType(parent.type)} · {parent.hex.toUpperCase()} · {(parent.weight * 100).toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
            {selectedTile.recipe.includesWhite ? <p className={styles.recipeNote}>Includes white tint</p> : null}
            {selectedTile.recipe.includesBlack ? <p className={styles.recipeNote}>Includes black shade</p> : null}
          </section>
        ) : null}

        <section className={styles.neighbors} aria-label="Neighbors">
          <h3 className={styles.sectionTitle}>Neighbors ({selectedTile.neighborCount})</h3>
          <ul className={styles.neighborList}>
            {neighbors.map((n) => (
              <li key={`${n.q},${n.r}`} className={styles.neighborItem}>
                <span
                  className={styles.neighborSwatch}
                  style={{ backgroundColor: n.tile?.hex ?? 'transparent' }}
                  aria-hidden="true"
                />
                <span className={styles.neighborLabel}>
                  ({n.q}, {n.r}) {n.tile ? n.tile.hex.toUpperCase() : 'empty'}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {edgeMixes.length > 0 ? (
          <section className={styles.mixes} aria-label="Edge mixtures">
            <h3 className={styles.sectionTitle}>Edge mixtures</h3>
            <div className={styles.swatchRow}>
              {edgeMixes.map((edge) => (
                <div key={edge.direction} className={styles.mixSwatch} title={edge.hex.toUpperCase()}>
                  <span className={styles.mixColor} style={{ backgroundColor: edge.hex }} aria-hidden="true" />
                  <span className={styles.mixLabel}>{edge.hex.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {vertexMixes.length > 0 ? (
          <section className={styles.mixes} aria-label="Vertex mixtures">
            <h3 className={styles.sectionTitle}>Vertex mixtures</h3>
            <div className={styles.swatchRow}>
              {vertexMixes.map((vertex) => (
                <div key={vertex.direction} className={styles.mixSwatch} title={vertex.hex.toUpperCase()}>
                  <span className={styles.mixColor} style={{ backgroundColor: vertex.hex }} aria-hidden="true" />
                  <span className={styles.mixLabel}>{vertex.hex.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <footer className={styles.actions}>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => centerTile(selectedTile.q, selectedTile.r)}
          >
            Center tile
          </button>
          <button type="button" className={styles.actionButton} onClick={() => setShareOpen(true)}>
            Share current view
          </button>
          <button
            type="button"
            className={styles.actionButton}
            disabled={!undoAvailable}
            onClick={() => void undo()}
          >
            Undo
          </button>
        </footer>
      </section>
      <ShareViewSheet open={shareOpen} onClose={() => setShareOpen(false)} />
    </>
  );
}

type FormatRowProps = {
  label: string;
  value: string;
  onCopy: () => void;
};

function FormatRow({ label, value, onCopy }: FormatRowProps) {
  return (
    <div className={styles.formatRow}>
      <span className={styles.formatLabel}>{label}</span>
      <code className={styles.formatValue}>{value}</code>
      <button type="button" className={styles.copyButton} onClick={onCopy} aria-label={`Copy ${label}`}>
        <CopyIcon />
      </button>
    </div>
  );
}
