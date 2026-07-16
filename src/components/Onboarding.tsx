import { useGameStore } from '../state/gameStore';
import { BoardCanvas } from '../renderer/BoardCanvas';
import { DEFAULT_SETTINGS } from '../game/constants';
import styles from './Onboarding.module.css';

type OnboardingProps = {
  className?: string;
};

export function Onboarding({ className }: OnboardingProps) {
  const showOnboarding = useGameStore((s) => s.showOnboarding);
  const completeOnboarding = useGameStore((s) => s.completeOnboarding);
  const meta = useGameStore((s) => s.meta);

  if (!showOnboarding) return null;

  const demoTiles = new Map<string, import('../game/types').TileRecord>();
  if (meta) {
    for (const anchor of meta.foundationAnchors.slice(0, 3)) {
      demoTiles.set(`${demoTiles.size},0`, {
        q: demoTiles.size,
        r: 0,
        packedColor: anchor.packed,
        hex: anchor.hex,
        rollIndex: 0,
        placedAt: 0,
        recipe: {
          parents: [],
          oklab: anchor.oklab,
          packedColor: anchor.packed,
          hex: anchor.hex,
          includesWhite: false,
          includesBlack: false,
          rollIndex: 0,
          createdAt: 0,
          isFoundation: true,
          isPaletteExpansion: false,
        },
        neighborCount: 0,
      });
    }
  }

  return (
    <div
      className={[styles.overlay, className].filter(Boolean).join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label="Kulur"
    >
      <div className={styles.miniBoard} aria-hidden="true">
        <BoardCanvas
          tiles={demoTiles}
          frontier={[]}
          camera={{ worldX: 0, worldY: 0, zoom: 0.8, velocityX: 0, velocityY: 0 }}
          interactionEnabled={false}
          onTileTap={() => {}}
          onFrontierTap={() => {}}
          onPanChange={() => {}}
          getSettings={() => ({ ...DEFAULT_SETTINGS, reducedMotion: true })}
        />
      </div>
      <div className={styles.card}>
        <h1 className={styles.title}>Kulur</h1>
        <p className={styles.body}>Roll a color.</p>
        <p className={styles.body}>Place it on an open edge.</p>
        <p className={styles.body}>Every connection creates new colors.</p>
        <button type="button" className={styles.beginButton} onClick={() => void completeOnboarding()}>
          Begin
        </button>
      </div>
    </div>
  );
}
