import type { MaterialId, DieStyleId } from './types';

export const DB_NAME = 'kulur';
export const DB_VERSION = 1;

export const HEX_RADIUS = 44;
export const CHUNK_SIZE = 24;

export const NEIGHBOR_DIRECTIONS = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
] as const;

export const RECENT_RING_SIZE = 32;
export const RESERVOIR_SIZE = 256;
export const HUE_BIN_COUNT = 24;
export const MIN_CHROMA_FOR_HUE = 0.03;

export const EXACT_COLOR_UNIVERSE = 16_777_216;
export const RGB_CELL_COUNT = 32_768;
export const EXACT_PAGE_SIZE = 4096;
export const EXACT_MAX_PAGES = 512;
export const RGB_BITSET_SIZE = 4096;

export const ROLL_ANIMATION_MS = 680;
export const PLACEMENT_ANIMATION_MS = 280;
export const UNDO_TIMEOUT_MS = 8000;
export const DISCOVERY_FEEDBACK_MS = 900;
export const CAMERA_DEBOUNCE_MS = 250;

export const ZOOM_MIN = 0.12;
export const ZOOM_MAX = 3.5;
export const ZOOM_INITIAL_MAX = 1.25;
export const ZOOM_DETAIL_THRESHOLD = 0.35;
export const ZOOM_SEAM_THRESHOLD = 0.6;

export const MATERIAL_UNLOCKS: Record<MaterialId, number> = {
  soft: 0,
  glass: 128,
  ink: 512,
  neon: 2048,
  prism: 8192,
};

export const DIE_STYLE_UNLOCKS: Record<DieStyleId, number> = {
  cube: 0,
  orb: 64,
  facet: 512,
  halo: 4096,
};

export const DEFAULT_SETTINGS = {
  sound: true,
  haptics: true,
  reducedMotion: null as boolean | null,
  colorPatterns: false,
  highContrast: false,
  material: 'soft' as MaterialId,
  dieStyle: 'cube' as DieStyleId,
  onboardingComplete: false,
};

export const PENTATONIC_SEQUENCE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];

export const EXPORT_FORMAT = 'kulur';
export const EXPORT_VERSION = 1;

export const DEV_FLAG = import.meta.env.DEV;
