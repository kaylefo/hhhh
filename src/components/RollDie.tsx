import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ROLL_ANIMATION_MS } from '../game/constants';
import type { DieStyleId } from '../game/types';
import { randomInt } from '../game/random';
import { useGameStore } from '../state/gameStore';
import { useReducedMotion } from '../hooks/useReducedMotion';
import styles from './RollDie.module.css';

const FACE_ROTATIONS = [
  { rotateX: 0, rotateY: 0 },
  { rotateX: 0, rotateY: 180 },
  { rotateX: 0, rotateY: 90 },
  { rotateX: 0, rotateY: -90 },
  { rotateX: 90, rotateY: 0 },
  { rotateX: -90, rotateY: 0 },
];

function pickFaceColors(hexes: string[], count = 6): string[] {
  if (hexes.length === 0) {
    return Array.from({ length: count }, () => '#888888');
  }
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(hexes[i % hexes.length]!);
  }
  return result;
}

type RollDieProps = {
  className?: string;
};

export function RollDie({ className }: RollDieProps) {
  const interactionState = useGameStore((s) => s.interactionState);
  const pendingRoll = useGameStore((s) => s.pendingRoll);
  const dieStyle = useGameStore((s) => s.settings.dieStyle);
  const roll = useGameStore((s) => s.roll);
  const reducedMotion = useReducedMotion();

  const [spinning, setSpinning] = useState(false);
  const [spinOffset, setSpinOffset] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<number | null>(null);

  const parentHexes = useMemo(
    () => pendingRoll?.parents.map((p) => p.hex) ?? [],
    [pendingRoll],
  );
  const faceColors = useMemo(() => pickFaceColors(parentHexes), [parentHexes]);
  const resultColor = pendingRoll?.hex ?? '#666666';

  const canRoll = interactionState === 'idle';
  const isPending = interactionState === 'pendingPlacement';
  const label = canRoll ? 'ROLL' : isPending ? 'PLACE' : '…';

  const clearSpinTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleRoll = useCallback(async () => {
    if (!canRoll || spinning) return;
    clearSpinTimeout();

    if (reducedMotion) {
      await roll();
      return;
    }

    setSpinning(true);
    setSpinOffset({
      x: 360 * (3 + randomInt(3)),
      y: 360 * (2 + randomInt(4)),
    });

    timeoutRef.current = window.setTimeout(() => {
      setSpinning(false);
      timeoutRef.current = null;
    }, ROLL_ANIMATION_MS);

    await roll();
  }, [canRoll, spinning, reducedMotion, roll, clearSpinTimeout]);

  useEffect(() => () => clearSpinTimeout(), [clearSpinTimeout]);

  useEffect(() => {
    if (interactionState === 'idle' || interactionState === 'pendingPlacement') {
      setSpinning(false);
      clearSpinTimeout();
    }
  }, [interactionState, clearSpinTimeout]);

  useEffect(() => {
    if (interactionState !== 'rolling') return;
    if (reducedMotion) return;
    setSpinning(true);
    setSpinOffset({
      x: 360 * 4,
      y: 360 * 3,
    });
    clearSpinTimeout();
    timeoutRef.current = window.setTimeout(() => {
      setSpinning(false);
      timeoutRef.current = null;
    }, ROLL_ANIMATION_MS);
  }, [interactionState, reducedMotion, clearSpinTimeout]);

  const styleClass = styleClassForDie(dieStyle);
  const transform = spinning
    ? `rotateX(${spinOffset.x}deg) rotateY(${spinOffset.y}deg)`
    : 'rotateX(-18deg) rotateY(24deg)';

  return (
    <button
      type="button"
      className={[
        styles.dieButton,
        styleClass,
        spinning ? styles.spinning : '',
        isPending ? styles.pending : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => void handleRoll()}
      disabled={!canRoll}
      aria-label={canRoll ? 'Roll die' : isPending ? 'Place pending color on board' : 'Die busy'}
      aria-busy={interactionState === 'rolling' || spinning}
      style={
        {
          '--roll-duration': `${ROLL_ANIMATION_MS}ms`,
          '--result-color': resultColor,
        } as CSSProperties
      }
    >
      <div className={styles.scene}>
        <div
          className={styles.dieBody}
          style={{ transform }}
        >
          {dieStyle === 'cube' || dieStyle === 'facet'
            ? FACE_ROTATIONS.map((rot, index) => (
                <div
                  key={index}
                  className={[styles.face, dieStyle === 'facet' ? styles.facetFace : ''].join(' ')}
                  style={{
                    backgroundColor: faceColors[index],
                    transform: faceTransform(rot.rotateX, rot.rotateY),
                  }}
                />
              ))
            : null}
          {dieStyle === 'orb' ? (
            <div className={styles.orb} style={{ background: orbGradient(faceColors) }} />
          ) : null}
          {dieStyle === 'halo' ? (
            <>
              <div className={styles.haloCore} style={{ backgroundColor: resultColor }} />
              <div className={styles.haloRing} style={{ borderColor: resultColor }} />
            </>
          ) : null}
        </div>
      </div>
      <span className={styles.label}>{label}</span>
    </button>
  );
}

function styleClassForDie(style: DieStyleId): string {
  switch (style) {
    case 'orb':
      return styles.orbStyle;
    case 'facet':
      return styles.facetStyle;
    case 'halo':
      return styles.haloStyle;
    default:
      return styles.cubeStyle;
  }
}

function faceTransform(rotateX: number, rotateY: number): string {
  const half = 'calc(var(--die-size) / 2)';
  if (rotateX === 90) return `rotateX(90deg) translateZ(${half})`;
  if (rotateX === -90) return `rotateX(-90deg) translateZ(${half})`;
  if (rotateY === 90) return `rotateY(90deg) translateZ(${half})`;
  if (rotateY === -90) return `rotateY(-90deg) translateZ(${half})`;
  if (rotateY === 180) return `rotateY(180deg) translateZ(${half})`;
  return `translateZ(${half})`;
}

function orbGradient(colors: string[]): string {
  const stops = colors.map((c, i) => `${c} ${(i / (colors.length - 1)) * 100}%`).join(', ');
  return `radial-gradient(circle at 30% 30%, #ffffff55, transparent 40%), conic-gradient(${stops})`;
}
