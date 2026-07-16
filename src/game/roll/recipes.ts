import type { RollRecipe, RecipeParent, ColorRecord } from '../types';
import { createColorRecord } from '../color/formatting';
import { packedToOklab } from '../color/oklab';

export function foundationRecipe(
  anchor: ColorRecord,
  rollIndex: number,
  timestamp: number,
): RollRecipe {
  const parent: RecipeParent = {
    type: 'foundation',
    sourceId: `foundation-${rollIndex}`,
    packedColor: anchor.packed,
    hex: anchor.hex,
    weight: 1,
  };
  return {
    parents: [parent],
    oklab: anchor.oklab,
    packedColor: anchor.packed,
    hex: anchor.hex,
    includesWhite: false,
    includesBlack: false,
    rollIndex,
    createdAt: timestamp,
    isFoundation: true,
    isPaletteExpansion: false,
  };
}

export function expansionRecipe(
  anchor: ColorRecord,
  rollIndex: number,
  timestamp: number,
): RollRecipe {
  const parent: RecipeParent = {
    type: 'palette',
    sourceId: `expansion-${rollIndex}`,
    packedColor: anchor.packed,
    hex: anchor.hex,
    weight: 1,
  };
  return {
    parents: [parent],
    oklab: anchor.oklab,
    packedColor: anchor.packed,
    hex: anchor.hex,
    includesWhite: false,
    includesBlack: false,
    rollIndex,
    createdAt: timestamp,
    isFoundation: false,
    isPaletteExpansion: true,
  };
}

export function mixedRecipe(
  parents: RecipeParent[],
  packedColor: number,
  includesWhite: boolean,
  includesBlack: boolean,
  rollIndex: number,
  timestamp: number,
): RollRecipe {
  return {
    parents,
    oklab: packedToOklab(packedColor),
    packedColor,
    hex: createColorRecord(packedColor).hex,
    includesWhite,
    includesBlack,
    rollIndex,
    createdAt: timestamp,
    isFoundation: false,
    isPaletteExpansion: false,
  };
}
