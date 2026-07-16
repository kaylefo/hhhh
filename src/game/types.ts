export type AxialCoordinate = {
  q: number;
  r: number;
};

export type InteractionState =
  | 'idle'
  | 'rolling'
  | 'pendingPlacement'
  | 'placing';

export type AppView = 'board' | 'gamut' | 'stats' | 'settings';

export type SourceKind = 'source' | 'edge' | 'vertex';

export type ParentType = 'foundation' | 'recent' | 'palette' | 'reservoir' | 'white' | 'black';

export type RecipeParent = {
  type: ParentType;
  sourceId: string;
  packedColor: number;
  hex: string;
  weight: number;
};

export type RollRecipe = {
  parents: RecipeParent[];
  oklab: OKLab;
  packedColor: number;
  hex: string;
  includesWhite: boolean;
  includesBlack: boolean;
  rollIndex: number;
  createdAt: number;
  isFoundation: boolean;
  isPaletteExpansion: boolean;
};

export type OKLab = {
  L: number;
  a: number;
  b: number;
};

export type OKLCH = {
  L: number;
  C: number;
  h: number;
};

export type RGB = {
  r: number;
  g: number;
  b: number;
};

export type HSL = {
  h: number;
  s: number;
  l: number;
};

export type ColorRecord = {
  packed: number;
  hex: string;
  rgb: RGB;
  hsl: HSL;
  oklab: OKLab;
  oklch: OKLCH;
};

export type TileRecord = {
  q: number;
  r: number;
  packedColor: number;
  hex: string;
  rollIndex: number;
  placedAt: number;
  recipe: RollRecipe;
  neighborCount: number;
};

export type DiscoveryRecord = {
  packed: number;
  hex: string;
  firstSeenAt: number;
  rollIndex: number;
  sourceKind: SourceKind;
  coordinate: AxialCoordinate;
  parentColors: number[];
  parentWeights: number[];
  oklab: OKLab;
  oklch: OKLCH;
};

export type MaterialId = 'soft' | 'glass' | 'ink' | 'neon' | 'prism';

export type DieStyleId = 'cube' | 'orb' | 'facet' | 'halo';

export type CameraState = {
  worldX: number;
  worldY: number;
  zoom: number;
  velocityX: number;
  velocityY: number;
};

export type WorldStatistics = {
  rolls: number;
  placedTiles: number;
  exactColors: number;
  rgbCells: number;
  sharedEdges: number;
  completedVertices: number;
  paletteAnchors: number;
  largestPlacementDiscovery: number;
  totalPlayTimeMs: number;
  sessionStartMs: number;
};

export type UndoSnapshot = {
  tile: TileRecord;
  frontierBefore: AxialCoordinate[];
  frontierAfter: AxialCoordinate[];
  exactBitsAdded: number[];
  rgbCellsAdded: number[];
  discoveriesAdded: number[];
  sharedEdgesDelta: number;
  verticesDelta: number;
  histogramDelta: Int32Array;
  recentRingBefore: number[];
  reservoirBefore: number[];
  paletteAnchorAdded: number | null;
  statsBefore: WorldStatistics;
  cameraBefore: CameraState | null;
  pendingRecipe: RollRecipe;
};

export type Settings = {
  sound: boolean;
  haptics: boolean;
  reducedMotion: boolean | null;
  colorPatterns: boolean;
  highContrast: boolean;
  material: MaterialId;
  dieStyle: DieStyleId;
  onboardingComplete: boolean;
};

export type WorldMeta = {
  worldId: string;
  createdAt: number;
  updatedAt: number;
  baseHue: number;
  foundationAnchors: ColorRecord[];
  expandedAnchors: ColorRecord[];
  rollCount: number;
  placementCount: number;
  pendingRoll: RollRecipe | null;
  camera: CameraState;
  frontier: AxialCoordinate[];
  recentRing: number[];
  reservoir: number[];
  hueHistogram: Int32Array;
  statistics: WorldStatistics;
  unlockedMaterials: MaterialId[];
  unlockedDieStyles: DieStyleId[];
};

export type ToastMessage = {
  id: string;
  text: string;
  type: 'info' | 'success' | 'error';
};

export type PlacementResult = {
  tile: TileRecord;
  newDiscoveries: DiscoveryRecord[];
  newExactCount: number;
  newRgbCellCount: number;
  isPaletteExpansion: boolean;
  undoSnapshot: UndoSnapshot;
};

export type ChunkKey = [string, number, number, number, number];
