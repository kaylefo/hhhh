import type { WorldMeta } from '../game/types';
import { createHueHistogram } from '../game/color/harmony';

export function hydrateMeta(raw: WorldMeta): WorldMeta {
  const histogram = raw.hueHistogram as Int32Array | number[] | undefined;
  if (histogram instanceof Int32Array) {
    return raw;
  }
  if (Array.isArray(histogram)) {
    raw.hueHistogram = Int32Array.from(histogram);
    return raw;
  }
  raw.hueHistogram = createHueHistogram();
  return raw;
}

export function cloneMetaForStorage(meta: WorldMeta): WorldMeta {
  return {
    ...meta,
    hueHistogram: Int32Array.from(meta.hueHistogram),
    frontier: meta.frontier.map((c) => ({ ...c })),
    recentRing: [...meta.recentRing],
    reservoir: [...meta.reservoir],
    expandedAnchors: [...meta.expandedAnchors],
    foundationAnchors: [...meta.foundationAnchors],
    statistics: { ...meta.statistics },
    camera: { ...meta.camera },
    unlockedMaterials: [...meta.unlockedMaterials],
    unlockedDieStyles: [...meta.unlockedDieStyles],
  };
}
