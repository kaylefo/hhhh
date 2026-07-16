import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ROLL_ANIMATION_MS } from '../game/constants';
import type { DieStyleId } from '../game/types';
import { randomInt } from '../game/random';
import { useGameStore } from '../state/gameStore';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { audioEngine } from '../audio/AudioEngine';
import styles from './RollDie.module.css';

const FACE_ROTATIONS = [
  { rotateX: 0, rotateY: 0 },
  { rotateX: 0, rotateY: 180 },
  { rotateX: 0, rotateY: 90 },
  { rotateX: 0, rotateY: -90 },
  { rotateX: 90, rotateY: 0 },
  { rotateX: -90, rotateY: 0 },
];

function pickFaceColors(hexes: string[], result: string, count = 6): string[] {
  const palette = hexes.length > 0 ? hexes : ['#888888'];
  const faces: string[] = [result];
  for (let i = 1; i < count; i++) {
    faces.push(palette[(i - 1) % palette.length]!);
  }
  return faces;
}

type RollDieProps = {
  className?: string;
};

export function RollDie({ className }: RollDieProps) {
  const interactionState = useGameStore((s) => s.interactionState);
  const pendingRoll = useGameStore((s) => s.pendingRoll);
  const meta = useGameStore((s) => s.meta);
  const dieStyle = useGameStore((s) => s.settings.dieStyle);
  const roll = useGameStore((s) => s.roll);
  const rollEmphasis = useGameStore((s) => s.rollEmphasis);
  const reducedMotion = useReducedMotion();

  const [spinning, setSpinning] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [spinOffset, setSpinOffset] = useState({ x: 0, y: 0 });
  const [settled, setSettled] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const paletteHexes = useMemo(() => {
    const fromParents = pendingRoll?.parents.map((p) => p.hex) ?? [];
    const fromAnchors = meta?.foundationAnchors.map((a) => a.hex) ?? [];
    const fromExpanded = meta?.expandedAnchors.map((a) => a.hex) ?? [];
    return [...fromParents, ...fromAnchors, ...fromExpanded];
  }, [pendingRoll, meta]);

  const resultColor = pendingRoll?.hex ?? paletteHexes[0] ?? '#666666';
  const faceColors = useMemo(
    () => pickFaceColors(paletteHexes, resultColor),
    [paletteHexes, resultColor],
  );

  const canRoll = interactionState === 'idle';
  const isPending = interactionState === 'pendingPlacement';
  const label = canRoll ? 'ROLL' : isPending ? 'PLACE' : '…';

  const clearSpinTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const beginSpin = useCallback(() => {
    if (reducedMotion) {
      setSettled(true);
      return;
    }
    setSpinning(true);
    setSettled(false);
    // ≥540° total rotation on both axes; settle on front face (0,0)
    const turnsX = 2 + randomInt(3);
    const turnsY = 2 + randomInt(3);
    setSpinOffset({
      x: 360 * turnsX,
      y: 360 * turnsY,
    });
    clearSpinTimeout();
    timeoutRef.current = window.setTimeout(() => {
      setSpinning(false);
      setSettled(true);
      setSpinOffset({ x: 0, y: 0 });
      timeoutRef.current = null;
    }, ROLL_ANIMATION_MS);
  }, [reducedMotion, clearSpinTimeout]);

  const handleRoll = useCallback(async () => {
    if (!canRoll || spinning) return;
    clearSpinTimeout();
    void audioEngine.unlock();
    setPressed(true);
    window.setTimeout(() => setPressed(false), reducedMotion ? 100 : 90);
    await roll();
  }, [canRoll, spinning, reducedMotion, roll, clearSpinTimeout]);

  useEffect(() => () => clearSpinTimeout(), [clearSpinTimeout]);

  useEffect(() => {
    if (interactionState === 'rolling') {
      beginSpin();
      return;
    }
    if (interactionState === 'pendingPlacement') {
      setSpinning(false);
      setSettled(true);
      setSpinOffset({ x: 0, y: 0 });
      return;
    }
    if (interactionState === 'idle') {
      setSpinning(false);
      setSettled(false);
      clearSpinTimeout();
    }
  }, [interactionState, beginSpin, clearSpinTimeout]);

  const styleClass = styleClassForDie(dieStyle);
  const transform = spinning
    ? `rotateX(${spinOffset.x}deg) rotateY(${spinOffset.y}deg)`
    : settled
      ? 'rotateX(0deg) rotateY(0deg)'
      : 'rotateX(-18deg) rotateY(24deg)';

  return (
    <button
      type="button"
      className={[
        styles.dieButton,
        styleClass,
        spinning ? styles.spinning : '',
        settled ? styles.settled : '',
        isPending ? styles.pending : '',
        pressed ? styles.pressed : '',
        reducedMotion ? styles.reducedMotion : '',
        rollEmphasis && canRoll ? styles.emphasis : '',
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
        <div className={styles.dieBody} style={{ transform }}>
          {dieStyle === 'cube' || dieStyle === 'facet'
            ? FACE_ROTATIONS.map((rot, index) => (
                <div
                  key={index}
                  className={[
                    styles.face,
                    dieStyle === 'facet' ? styles.facetFace : '',
                    index === 0 && settled ? styles.resultFace : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{
                    backgroundColor: index === 0 ? resultColor : faceColors[index],
                    transform: faceTransform(rot.rotateX, rot.rotateY),
                  }}
                >
                  {index === 0 && parentSamples(faceColors.slice(1, 4))}
                </div>
              ))
            : null}

          {dieStyle === 'orb' ? (
            <div className={[styles.orb, spinning ? styles.orbSpinning : ''].join(' ')}>
              <div
                className={styles.orbCore}
                style={{
                  background: settled
                    ? resultColor
                    : orbGradient(faceColors),
                }}
              />
              {faceColors.slice(0, 6).map((color, i) => (
                <span
                  key={i}
                  className={styles.orbPoint}
                  style={
                    {
                      '--orbit-i': i,
                      backgroundColor: color,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          ) : null}

          {dieStyle === 'halo' ? (
            <div className={[styles.halo, spinning ? styles.haloSpinning : ''].join(' ')}>
              <div className={styles.haloCore} style={{ backgroundColor: resultColor }} />
              <div className={styles.haloRing}>
                {faceColors.slice(0, 6).map((color, i) => (
                  <span
                    key={i}
                    className={styles.haloSegment}
                    style={
                      {
                        '--seg-i': i,
                        backgroundColor: color,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <span className={styles.label}>{label}</span>
    </button>
  );
}

function parentSamples(colors: string[]) {
  if (colors.length === 0) return null;
  return (
    <span className={styles.samples} aria-hidden="true">
      {colors.map((c, i) => (
        <span key={i} className={styles.sample} style={{ backgroundColor: c }} />
      ))}
    </span>
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
  const stops = colors.map((c, i) => `${c} ${(i / Math.max(1, colors.length - 1)) * 100}%`).join(', ');
  return `radial-gradient(circle at 30% 30%, #ffffff55, transparent 40%), conic-gradient(${stops})`;
}
