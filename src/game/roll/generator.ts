import type { ColorRecord, RollRecipe, RecipeParent } from '../types';
import {
  RECENT_RING_SIZE,
  RESERVOIR_SIZE,
  HUE_BIN_COUNT,
} from '../constants';
import { randomUnit, randomRange, randomInt } from '../random';
import { createColorRecord } from '../color/formatting';
import { hueBinFromPacked, hueScarcity } from '../color/harmony';
import { gamutMapToPacked } from '../color/gamut';
import {
  deltaEOK,
  packedToOklab,
} from '../color/oklab';
import {
  generateDominantWeights,
  generateBalancedWeights,
  mixOklab,
  parentsTooSimilar,
} from '../color/mixing';
import { BLACK_PACKED, WHITE_PACKED } from '../color/srgb';
import { foundationRecipe, mixedRecipe, expansionRecipe } from './recipes';
import { createExpansionAnchor } from './palette';
import { findScarcestHueBin, hueBinCenter } from '../color/harmony';

export type RollContext = {
  foundationAnchors: ColorRecord[];
  foundationOrder: ColorRecord[];
  foundationIndex: number;
  expandedAnchors: ColorRecord[];
  recentRing: number[];
  reservoir: number[];
  hueHistogram: Int32Array;
  rollCount: number;
  placementCount: number;
  exactBitset: { has: (n: number) => boolean };
  rgbBitset: { has: (n: number) => boolean };
  recentRolls: number[];
};

export function isExpansionRoll(rollIndex: number, foundationComplete: boolean): boolean {
  return foundationComplete && rollIndex > 0 && rollIndex % 64 === 0;
}

export function generateRoll(
  ctx: RollContext,
  rollIndex: number,
  timestamp: number,
  pickScarceBin: (histogram: Int32Array) => number,
): RollRecipe {
  if (ctx.foundationIndex < ctx.foundationOrder.length) {
    const anchor = ctx.foundationOrder[ctx.foundationIndex]!;
    return foundationRecipe(anchor, rollIndex, timestamp);
  }

  if (isExpansionRoll(rollIndex, true)) {
    const bin = pickScarceBin(ctx.hueHistogram);
    const hue = hueBinCenter(bin) + randomRange(-5, 5);
    const normalizedHue = ((hue % 360) + 360) % 360;
    const anchor = createExpansionAnchor(normalizedHue);
    return expansionRecipe(anchor, rollIndex, timestamp);
  }

  const candidates: RollRecipe[] = [];
  for (let i = 0; i < 8; i++) {
    candidates.push(generateCandidate(ctx, rollIndex, timestamp));
  }

  let best = candidates[0]!;
  let bestScore = scoreCandidate(best, ctx);
  for (let i = 1; i < candidates.length; i++) {
    const score = scoreCandidate(candidates[i]!, ctx);
    if (score > bestScore + 0.000001) {
      best = candidates[i]!;
      bestScore = score;
    } else if (Math.abs(score - bestScore) <= 0.000001 && randomUnit() > 0.5) {
      best = candidates[i]!;
      bestScore = score;
    }
  }
  return best;
}

function scoreCandidate(recipe: RollRecipe, ctx: RollContext): number {
  const oklab = recipe.oklab;
  let minRecent = Infinity;
  for (const recent of ctx.recentRolls) {
    const d = deltaEOK(oklab, packedToOklab(recent));
    if (d < minRecent) minRecent = d;
  }
  if (minRecent === Infinity) minRecent = 1;

  const bin = hueBinFromPacked(recipe.packedColor);
  const scarcity = hueScarcity(ctx.hueHistogram, bin);

  let score = minRecent + 0.035 * scarcity;
  if (!ctx.exactBitset.has(recipe.packedColor)) score += 0.01;
  if (!ctx.rgbBitset.has(recipe.packedColor)) score += 0.015;
  return score;
}

function generateCandidate(ctx: RollContext, rollIndex: number, timestamp: number): RollRecipe {
  const u = randomUnit();
  const parentCount = u < 0.62 ? 2 : u < 0.91 ? 3 : 4;
  const parents = selectParents(ctx, parentCount);
  let includesWhite = false;
  let includesBlack = false;
  let colors = parents.map((p) => p.packedColor);
  let weights = randomUnit() < 0.82 ? generateDominantWeights(parentCount) : generateBalancedWeights(parentCount);

  if (ctx.placementCount >= 16 && randomUnit() < 0.12) {
    includesWhite = true;
    const whiteWeight = randomRange(0.08, 0.25);
    weights = weights.map((w) => w * (1 - whiteWeight));
    colors = [...colors, WHITE_PACKED];
    weights = [...weights, whiteWeight];
    parents.push({
      type: 'white',
      sourceId: 'white',
      packedColor: WHITE_PACKED,
      hex: '#FFFFFF',
      weight: whiteWeight,
    });
  } else if (ctx.placementCount >= 32 && randomUnit() < 0.1) {
    includesBlack = true;
    const blackWeight = randomRange(0.06, 0.22);
    weights = weights.map((w) => w * (1 - blackWeight));
    colors = [...colors, BLACK_PACKED];
    weights = [...weights, blackWeight];
    parents.push({
      type: 'black',
      sourceId: 'black',
      packedColor: BLACK_PACKED,
      hex: '#000000',
      weight: blackWeight,
    });
  }

  const total = weights.reduce((s, w) => s + w, 0);
  const normalizedWeights = weights.map((w) => w / total);
  const oklabs = colors.map((c) => packedToOklab(c));
  const mixed = mixOklab(oklabs, normalizedWeights);
  const packed = gamutMapToPacked(mixed);

  const recipeParents: RecipeParent[] = parents.map((p, i) => ({
    ...p,
    weight: normalizedWeights[i]!,
  }));

  return mixedRecipe(recipeParents, packed, includesWhite, includesBlack, rollIndex, timestamp);
}

function selectParents(ctx: RollContext, count: number): RecipeParent[] {
  const selected: RecipeParent[] = [];
  const usedIds = new Set<string>();

  for (let attempt = 0; attempt < 10; attempt++) {
    selected.length = 0;
    usedIds.clear();

    if (ctx.recentRing.length > 0) {
      const recent = pickRecent(ctx.recentRing);
      selected.push({
        type: 'recent',
        sourceId: `recent-${recent}`,
        packedColor: recent,
        hex: createColorRecord(recent).hex,
        weight: 0,
      });
      usedIds.add(`recent-${recent}`);
    }

    while (selected.length < count) {
      const fromPalette = selected.length > 0 && randomUnit() < 0.55;
      let parent: RecipeParent | null = null;
      if (fromPalette) {
        const anchors = [...ctx.foundationAnchors, ...ctx.expandedAnchors];
        if (anchors.length > 0) {
          const a = anchors[randomInt(anchors.length)]!;
          const id = `palette-${a.packed}`;
          if (!usedIds.has(id)) {
            parent = {
              type: 'palette',
              sourceId: id,
              packedColor: a.packed,
              hex: a.hex,
              weight: 0,
            };
          }
        }
      }
      if (!parent && ctx.reservoir.length > 0) {
        const c = ctx.reservoir[randomInt(ctx.reservoir.length)]!;
        const id = `reservoir-${c}`;
        if (!usedIds.has(id)) {
          parent = {
            type: 'reservoir',
            sourceId: id,
            packedColor: c,
            hex: createColorRecord(c).hex,
            weight: 0,
          };
        }
      }
      if (!parent) break;
      selected.push(parent);
      usedIds.add(parent.sourceId);
    }

    if (selected.length >= 2) {
      let tooSimilar = false;
      for (let i = 0; i < selected.length; i++) {
        for (let j = i + 1; j < selected.length; j++) {
          if (
            parentsTooSimilar(
              packedToOklab(selected[i]!.packedColor),
              packedToOklab(selected[j]!.packedColor),
            )
          ) {
            tooSimilar = true;
            break;
          }
        }
        if (tooSimilar) break;
      }
      if (!tooSimilar) break;
    }
  }

  while (selected.length < count) {
    const fallback = ctx.foundationAnchors[selected.length % ctx.foundationAnchors.length]!;
    selected.push({
      type: 'foundation',
      sourceId: `foundation-${fallback.packed}`,
      packedColor: fallback.packed,
      hex: fallback.hex,
      weight: 0,
    });
  }

  return selected.slice(0, count);
}

function pickRecent(ring: number[]): number {
  const weights = ring.map((_, i) => Math.exp(-((ring.length - 1 - i) / 10)));
  const total = weights.reduce((s, w) => s + w, 0);
  let u = randomUnit() * total;
  for (let i = ring.length - 1; i >= 0; i--) {
    u -= weights[i]!;
    if (u <= 0) return ring[i]!;
  }
  return ring[ring.length - 1]!;
}

export function updateRecentRing(ring: number[], color: number): number[] {
  const next = [...ring, color];
  if (next.length > RECENT_RING_SIZE) next.shift();
  return next;
}

export function updateReservoir(reservoir: number[], boardColors: number[]): number[] {
  if (boardColors.length === 0) return reservoir;
  const next = [...reservoir];
  const sample = boardColors[randomInt(boardColors.length)]!;
  next.push(sample);
  if (next.length > RESERVOIR_SIZE) next.shift();
  return next;
}

export function pickScarceBinFromHistogram(histogram: Int32Array): number {
  return findScarcestHueBin(histogram, randomInt);
}

void HUE_BIN_COUNT;
