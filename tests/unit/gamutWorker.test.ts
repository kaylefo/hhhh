import { describe, expect, it } from 'vitest';
import { aggregateGamutPoints, medianDiscoveryLightness } from '../../src/workers/gamutWorker';
import type { DiscoveryRecord } from '../../src/game/types';

function discovery(L: number, C: number, h: number, packed: number): DiscoveryRecord {
  return {
    packed,
    hex: `#${packed.toString(16).padStart(6, '0')}`,
    firstSeenAt: 0,
    rollIndex: 0,
    sourceKind: 'source',
    coordinate: { q: 0, r: 0 },
    parentColors: [],
    parentWeights: [],
    oklab: { L, a: C * Math.cos((h * Math.PI) / 180), b: C * Math.sin((h * Math.PI) / 180) },
    oklch: { L, C, h },
  };
}

describe('gamutWorker', () => {
  it('filters discoveries by lightness tolerance', () => {
    const discoveries = [
      discovery(0.5, 0.1, 30, 0x111111),
      discovery(0.8, 0.1, 120, 0x222222),
    ];
    const points = aggregateGamutPoints({
      discoveries,
      lightness: 0.5,
      tolerance: 0.04,
      allLightness: false,
    });
    expect(points).toHaveLength(1);
    expect(points[0]!.packed).toBe(0x111111);
  });

  it('includes all discoveries in all-lightness mode', () => {
    const discoveries = [discovery(0.3, 0.1, 0, 0x111111), discovery(0.9, 0.1, 180, 0x222222)];
    const points = aggregateGamutPoints({
      discoveries,
      lightness: 0.5,
      tolerance: 0.04,
      allLightness: true,
    });
    expect(points).toHaveLength(2);
  });

  it('computes median lightness', () => {
    const discoveries = [discovery(0.2, 0.1, 0, 1), discovery(0.8, 0.1, 0, 2), discovery(0.5, 0.1, 0, 3)];
    expect(medianDiscoveryLightness(discoveries)).toBeCloseTo(0.5, 5);
  });
});
