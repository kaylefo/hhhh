import { create } from 'zustand';
import type {
  AppView,
  DiscoveryRecord,
  InteractionState,
  RollRecipe,
  Settings,
  TileRecord,
  ToastMessage,
  WorldMeta,
  CameraState,
  MaterialId,
  DieStyleId,
  UndoSnapshot,
} from '../game/types';
import {
  DEFAULT_SETTINGS,
  MATERIAL_UNLOCKS,
  DIE_STYLE_UNLOCKS,
  DISCOVERY_FEEDBACK_MS,
  UNDO_TIMEOUT_MS,
  ROLL_ANIMATION_MS,
} from '../game/constants';
import { randomUUID } from '../game/random';
import { generateBaseHue, generateFoundationAnchors } from '../game/roll/palette';
import {
  generateRoll,
  pickScarceBinFromHistogram,
  isExpansionRoll,
} from '../game/roll/generator';
import { FrontierSet } from '../game/hex/frontier';
import { axialKey } from '../game/hex/axial';
import {
  placeTile,
  createEmptyStatistics,
  type BoardState,
} from '../game/board/placement';
import { applyUndo } from '../game/board/undo';
import { ExactColorBitset, RgbCellBitset } from '../game/color/discovery';
import { createHueHistogram } from '../game/color/harmony';
import {
  loadSettings,
  saveSettings,
  loadMeta,
  saveMeta,
  loadAllTiles,
  loadDiscoveries,
  loadExactPages,
  loadRgbBitset,
  loadUndo,
  saveUndo,
  persistPlacementAtomic,
  persistPendingRoll,
  persistCamera,
  getAllTilesForExport,
  getAllDiscoveriesForExport,
  replaceWorldData,
} from '../persistence/repositories';
import { clearDatabase } from '../persistence/database';
import {
  buildExportPayload,
  compressExport,
  decompressImport,
  exportFilename,
  downloadBlob,
  recalculateDerivedFromImport,
} from '../persistence/exportImport';

export interface GameStore {
  initialized: boolean;
  loadError: string | null;
  view: AppView;
  interactionState: InteractionState;
  settings: Settings;
  meta: WorldMeta | null;
  exactColorCount: number;
  rgbCellCount: number;
  pendingRoll: RollRecipe | null;
  selectedTile: TileRecord | null;
  menuOpen: boolean;
  inspectorOpen: boolean;
  toasts: ToastMessage[];
  undoAvailable: boolean;
  undoSnapshot: UndoSnapshot | null;
  discoveryFeedback: string | null;
  showOnboarding: boolean;
  discoveries: DiscoveryRecord[];
  tiles: Map<string, TileRecord>;
  frontier: FrontierSet;
  exactBitset: ExactColorBitset;
  rgbBitset: RgbCellBitset;
  foundationIndex: number;
  recentRolls: number[];
  boardRenderer: BoardRendererBridge | null;
  liveAnnouncement: string;
  importPreview: ImportPreview | null;
  milestoneUnlock: { type: 'material' | 'die'; id: string } | null;
  setView: (v: AppView) => void;
  openMenu: () => void;
  closeMenu: () => void;
  roll: () => Promise<void>;
  placeAt: (q: number, r: number) => Promise<void>;
  selectTile: (q: number, r: number) => void;
  clearSelection: () => void;
  undo: () => Promise<void>;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  exportData: () => Promise<void>;
  importData: (file: File) => Promise<void>;
  confirmImport: () => Promise<void>;
  cancelImport: () => void;
  eraseBoard: () => Promise<void>;
  copyToClipboard: (text: string, label: string) => Promise<void>;
  centerOrigin: () => void;
  centerTile: (q: number, r: number) => void;
  showIntroduction: () => void;
  closeSheet: () => void;
  getTileAt: (q: number, r: number) => TileRecord | null;
  initialize: () => Promise<void>;
  persistCameraDebounced: (camera: CameraState) => void;
  setBoardRenderer: (bridge: BoardRendererBridge | null) => void;
  dismissMilestone: () => void;
  addToast: (text: string, type?: ToastMessage['type']) => void;
  announce: (text: string) => void;
}

export type BoardRendererBridge = {
  centerOrigin: (animated?: boolean) => void;
  centerOn: (q: number, r: number, animated?: boolean) => void;
  highlightTile: (q: number, r: number, durationMs: number) => void;
  setCamera: (camera: CameraState) => void;
  captureViewport: (opts: {
    width: number;
    height: number;
    includeCount?: boolean;
    colorCount?: number;
  }) => Promise<Blob>;
};

export type ImportPreview = {
  tileCount: number;
  exactColors: number;
  createdAt: number;
  payload: ReturnType<typeof buildExportPayload>;
  raw: Uint8Array;
};

let undoTimer: number | null = null;
let cameraDebounceTimer: number | null = null;
let playTimeInterval: number | null = null;

function createNewWorld(): WorldMeta {
  const baseHue = generateBaseHue();
  const foundationAnchors = generateFoundationAnchors(baseHue);
  const now = Date.now();
  return {
    worldId: randomUUID(),
    createdAt: now,
    updatedAt: now,
    baseHue,
    foundationAnchors,
    expandedAnchors: [],
    rollCount: 0,
    placementCount: 0,
    pendingRoll: null,
    camera: { worldX: 0, worldY: 0, zoom: 1, velocityX: 0, velocityY: 0 },
    frontier: [{ q: 0, r: 0 }],
    recentRing: [],
    reservoir: [],
    hueHistogram: createHueHistogram(),
    statistics: createEmptyStatistics(),
    unlockedMaterials: ['soft'],
    unlockedDieStyles: ['cube'],
  };
}

function boardStateFromStore(state: GameStore): BoardState {
  return {
    tiles: state.tiles,
    frontier: state.frontier,
    exactBitset: state.exactBitset,
    rgbBitset: state.rgbBitset,
    discoveries: new Map(state.discoveries.map((d) => [d.packed, d])),
    statistics: state.meta!.statistics,
    hueHistogram: state.meta!.hueHistogram,
    recentRing: [...state.meta!.recentRing],
    reservoir: [...state.meta!.reservoir],
    expandedAnchors: [...state.meta!.expandedAnchors],
  };
}

function syncMetaFromBoard(meta: WorldMeta, board: BoardState): void {
  meta.recentRing = board.recentRing;
  meta.reservoir = board.reservoir;
  meta.expandedAnchors = board.expandedAnchors;
  meta.hueHistogram = board.hueHistogram;
  meta.statistics = board.statistics;
  meta.frontier = board.frontier.toArray();
}

function checkUnlocks(meta: WorldMeta): { material?: MaterialId; die?: DieStyleId } {
  const result: { material?: MaterialId; die?: DieStyleId } = {};
  for (const [id, threshold] of Object.entries(MATERIAL_UNLOCKS) as [MaterialId, number][]) {
    if (threshold > 0 && meta.statistics.rgbCells >= threshold && !meta.unlockedMaterials.includes(id)) {
      meta.unlockedMaterials.push(id);
      result.material = id;
    }
  }
  for (const [id, threshold] of Object.entries(DIE_STYLE_UNLOCKS) as [DieStyleId, number][]) {
    if (threshold > 0 && meta.statistics.rgbCells >= threshold && !meta.unlockedDieStyles.includes(id)) {
      meta.unlockedDieStyles.push(id);
      result.die = id;
    }
  }
  return result;
}

function formatDiscoveryFeedback(
  exact: number,
  rgb: number,
  isExpansion: boolean,
): string {
  if (isExpansion) {
    if (exact > 0) return `Palette expanded · +${exact} colors`;
    return 'Palette expanded';
  }
  if (exact === 0) return 'Mixed';
  const parts = [`+${exact} colors`];
  if (rgb > 0) parts.push(`${rgb} RGB cells`);
  return parts.join(' · ');
}

export const useGameStore = create<GameStore>((set, get) => ({
  initialized: false,
  loadError: null,
  view: 'board',
  interactionState: 'idle',
  settings: { ...DEFAULT_SETTINGS },
  meta: null,
  exactColorCount: 0,
  rgbCellCount: 0,
  pendingRoll: null,
  selectedTile: null,
  menuOpen: false,
  inspectorOpen: false,
  toasts: [],
  undoAvailable: false,
  undoSnapshot: null,
  discoveryFeedback: null,
  showOnboarding: false,
  discoveries: [],
  tiles: new Map(),
  frontier: new FrontierSet([{ q: 0, r: 0 }]),
  exactBitset: new ExactColorBitset(),
  rgbBitset: new RgbCellBitset(),
  foundationIndex: 0,
  recentRolls: [],
  boardRenderer: null,
  liveAnnouncement: '',
  importPreview: null,
  milestoneUnlock: null,

  setView: (v) => {
    set({ view: v, menuOpen: false });
    if (typeof window !== 'undefined') {
      const path = v === 'board' ? '/' : `/${v}`;
      window.history.pushState({ view: v }, '', path);
    }
  },

  openMenu: () => set({ menuOpen: true }),
  closeMenu: () => set({ menuOpen: false }),

  addToast: (text, type = 'info') => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, text, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },

  announce: (text) => set({ liveAnnouncement: text }),

  setBoardRenderer: (bridge) => set({ boardRenderer: bridge }),

  dismissMilestone: () => set({ milestoneUnlock: null }),

  initialize: async () => {
    try {
      const settings = await loadSettings();
      if (settings.reducedMotion === null && typeof window !== 'undefined') {
        settings.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      }

      let meta = await loadMeta();
      const exactBitset = new ExactColorBitset();
      const rgbBitset = new RgbCellBitset();

      if (!meta) {
        meta = createNewWorld();
        await saveMeta(meta);
      }

      const exactPages = await loadExactPages();
      exactBitset.loadPages(exactPages, meta.statistics.exactColors);
      const rgbData = await loadRgbBitset();
      if (rgbData) rgbBitset.loadData(rgbData, meta.statistics.rgbCells);

      const tiles = await loadAllTiles(meta.worldId);
      const discoveriesMap = await loadDiscoveries();
      const discoveries = Array.from(discoveriesMap.values());
      const frontier = new FrontierSet(meta.frontier);
      const undoSnapshot = await loadUndo();

      const pendingRoll = meta.pendingRoll;
      let interactionState: InteractionState = 'idle';
      if (pendingRoll) interactionState = 'pendingPlacement';

      const foundationIndex = meta.placementCount < 6 ? meta.placementCount : 6;

      set({
        initialized: true,
        settings,
        meta,
        tiles,
        discoveries,
        frontier,
        exactBitset,
        rgbBitset,
        exactColorCount: exactBitset.count,
        rgbCellCount: rgbBitset.count,
        pendingRoll,
        interactionState,
        foundationIndex,
        showOnboarding: !settings.onboardingComplete,
        undoAvailable: undoSnapshot !== null,
        undoSnapshot,
      });

      if (playTimeInterval) clearInterval(playTimeInterval);
      playTimeInterval = window.setInterval(() => {
        const { meta: m } = get();
        if (m && document.visibilityState === 'visible') {
          m.statistics.totalPlayTimeMs += 30000;
          void saveMeta(m);
        }
      }, 30000);

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          const { meta: m } = get();
          if (m) void saveMeta(m);
        }
      });
    } catch (err) {
      set({
        initialized: true,
        loadError: err instanceof Error ? err.message : 'Failed to load saved data',
      });
    }
  },

  roll: async () => {
    const state = get();
    if (state.interactionState !== 'idle') return;

    const meta = state.meta;
    if (!meta) return;

    set({ interactionState: 'rolling', undoAvailable: false, undoSnapshot: null });
    if (undoTimer) {
      clearTimeout(undoTimer);
      undoTimer = null;
    }
    await saveUndo(null);

    const rollIndex = meta.rollCount + 1;
    const timestamp = Date.now();

    const recipe = generateRoll(
      {
        foundationAnchors: meta.foundationAnchors,
        foundationOrder: meta.foundationAnchors,
        foundationIndex: state.foundationIndex,
        expandedAnchors: meta.expandedAnchors,
        recentRing: meta.recentRing,
        reservoir: meta.reservoir,
        hueHistogram: meta.hueHistogram,
        rollCount: meta.rollCount,
        placementCount: meta.placementCount,
        exactBitset: state.exactBitset,
        rgbBitset: state.rgbBitset,
        recentRolls: state.recentRolls,
      },
      rollIndex,
      timestamp,
      pickScarceBinFromHistogram,
    );

    meta.rollCount = rollIndex;
    meta.pendingRoll = recipe;
    meta.statistics.rolls = rollIndex;
    await persistPendingRoll(meta);

    const reducedMotion = state.settings.reducedMotion ?? false;
    const delay = reducedMotion ? 100 : ROLL_ANIMATION_MS;
    await new Promise((r) => setTimeout(r, delay));

    if (meta.placementCount === 0) {
      set({
        pendingRoll: recipe,
        foundationIndex: state.foundationIndex + (recipe.isFoundation ? 1 : 0),
        recentRolls: [...state.recentRolls.slice(-31), recipe.packedColor],
      });
      await get().placeAt(0, 0);
      return;
    }

    set({
      interactionState: 'pendingPlacement',
      pendingRoll: recipe,
      foundationIndex: state.foundationIndex + (recipe.isFoundation ? 1 : 0),
      recentRolls: [...state.recentRolls.slice(-31), recipe.packedColor],
    });
    get().announce(`Rolled ${recipe.hex}. Choose an open hex.`);
  },

  placeAt: async (q, r) => {
    const state = get();
    const recipe = state.pendingRoll;
    const meta = state.meta;
    if (!recipe || !meta) return;
    const canPlace =
      state.interactionState === 'pendingPlacement' ||
      (state.interactionState === 'rolling' && meta.placementCount === 0);
    if (!canPlace) return;

    set({ interactionState: 'placing' });

    const board = boardStateFromStore(state);
    const result = placeTile(board, { q, r }, recipe, recipe.rollIndex);

    syncMetaFromBoard(meta, board);
    meta.placementCount++;
    meta.pendingRoll = null;

    const unlocks = checkUnlocks(meta);

    set({
      tiles: new Map(board.tiles),
      discoveries: Array.from(board.discoveries.values()),
      exactColorCount: board.exactBitset.count,
      rgbCellCount: board.rgbBitset.count,
      exactBitset: board.exactBitset,
      rgbBitset: board.rgbBitset,
      frontier: board.frontier,
      meta: { ...meta },
      pendingRoll: null,
      interactionState: 'idle',
      undoAvailable: true,
      undoSnapshot: result.undoSnapshot,
      discoveryFeedback: formatDiscoveryFeedback(
        result.newExactCount,
        result.newRgbCellCount,
        result.isPaletteExpansion,
      ),
      milestoneUnlock: unlocks.material
        ? { type: 'material', id: unlocks.material }
        : unlocks.die
          ? { type: 'die', id: unlocks.die }
          : null,
    });

    get().announce(
      `Placed ${recipe.hex}. ${result.newExactCount} exact colors and ${result.newRgbCellCount} RGB cells discovered.`,
    );

    await persistPlacementAtomic(
      meta,
      result.tile,
      result.newDiscoveries,
      board.exactBitset.getPages(),
      board.rgbBitset.getData(),
      result.undoSnapshot,
    );

    if (undoTimer) clearTimeout(undoTimer);
    undoTimer = window.setTimeout(() => {
      set({ undoAvailable: false, undoSnapshot: null });
      void saveUndo(null);
    }, UNDO_TIMEOUT_MS);

    setTimeout(() => set({ discoveryFeedback: null }), DISCOVERY_FEEDBACK_MS);

    const renderer = get().boardRenderer;
    if (renderer) {
      renderer.centerOn(q, r, true);
      renderer.highlightTile(q, r, 1200);
    }
  },

  selectTile: (q, r) => {
    const tile = get().getTileAt(q, r);
    if (tile) {
      set({ selectedTile: tile, inspectorOpen: true, view: 'board' });
    }
  },

  clearSelection: () => set({ selectedTile: null, inspectorOpen: false }),

  undo: async () => {
    const state = get();
    const snapshot = state.undoSnapshot;
    const meta = state.meta;
    if (!snapshot || !meta) return;

    const board = boardStateFromStore(state);
    applyUndo(board, snapshot);
    syncMetaFromBoard(meta, board);

    meta.pendingRoll = snapshot.pendingRecipe;
    meta.placementCount = Math.max(0, meta.placementCount - 1);

    set({
      tiles: new Map(board.tiles),
      discoveries: Array.from(board.discoveries.values()),
      exactColorCount: board.exactBitset.count,
      rgbCellCount: board.rgbBitset.count,
      exactBitset: board.exactBitset,
      rgbBitset: board.rgbBitset,
      frontier: board.frontier,
      meta: { ...meta },
      pendingRoll: snapshot.pendingRecipe,
      interactionState: 'pendingPlacement',
      undoAvailable: false,
      undoSnapshot: null,
      selectedTile: null,
      inspectorOpen: false,
    });

    await saveMeta(meta);
    await saveUndo(null);
    get().announce('Placement undone. The same color is ready to place.');
  },

  updateSettings: async (partial) => {
    const settings = { ...get().settings, ...partial };
    set({ settings });
    await saveSettings(settings);
  },

  completeOnboarding: async () => {
    await get().updateSettings({ onboardingComplete: true });
    set({ showOnboarding: false });
    get().boardRenderer?.centerOrigin(true);
  },

  exportData: async () => {
    const { meta, settings } = get();
    if (!meta) return;
    const tiles = await getAllTilesForExport();
    const discoveries = await getAllDiscoveriesForExport();
    const payload = buildExportPayload(meta, settings, tiles, discoveries);
    const compressed = compressExport(payload);
    const blob = new Blob([compressed], { type: 'application/x-kulur' });
    downloadBlob(blob, exportFilename());
    get().addToast('Export complete', 'success');
  },

  importData: async (file) => {
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const payload = decompressImport(buf);
      const metaRaw = payload.world.metadata as unknown as WorldMeta;
      set({
        importPreview: {
          tileCount: payload.world.tiles.length,
          exactColors: payload.world.discoveries.length,
          createdAt: metaRaw.createdAt ?? Date.now(),
          payload,
          raw: buf,
        },
      });
    } catch (err) {
      get().addToast(err instanceof Error ? err.message : 'Import failed', 'error');
    }
  },

  confirmImport: async () => {
    const preview = get().importPreview;
    if (!preview) return;
    try {
      const { payload } = preview;
      const meta = payload.world.metadata as unknown as WorldMeta;
      const settings = payload.world.settings as unknown as Settings;
      const tiles = payload.world.tiles;
      const discoveries = payload.world.discoveries;
      const derived = recalculateDerivedFromImport(tiles, discoveries);

      await replaceWorldData(
        meta,
        tiles,
        discoveries,
        derived.exactBitset.getPages(),
        derived.rgbBitset.getData(),
        settings,
      );

      const tilesMap = new Map(tiles.map((t) => [axialKey({ q: t.q, r: t.r }), t]));
      set({
        meta,
        settings,
        tiles: tilesMap,
        discoveries,
        frontier: derived.frontier,
        exactBitset: derived.exactBitset,
        rgbBitset: derived.rgbBitset,
        exactColorCount: derived.exactBitset.count,
        rgbCellCount: derived.rgbBitset.count,
        importPreview: null,
        pendingRoll: meta.pendingRoll,
        interactionState: meta.pendingRoll ? 'pendingPlacement' : 'idle',
      });
      get().addToast('Import complete', 'success');
    } catch (err) {
      get().addToast(err instanceof Error ? err.message : 'Import failed', 'error');
    }
  },

  cancelImport: () => set({ importPreview: null }),

  eraseBoard: async () => {
    await clearDatabase();
    const meta = createNewWorld();
    await saveMeta(meta);
    set({
      meta,
      tiles: new Map(),
      discoveries: [],
      frontier: new FrontierSet([{ q: 0, r: 0 }]),
      exactBitset: new ExactColorBitset(),
      rgbBitset: new RgbCellBitset(),
      exactColorCount: 0,
      rgbCellCount: 0,
      pendingRoll: null,
      interactionState: 'idle',
      foundationIndex: 0,
      recentRolls: [],
      undoAvailable: false,
      undoSnapshot: null,
      selectedTile: null,
      showOnboarding: true,
    });
    await get().updateSettings({ onboardingComplete: false });
  },

  copyToClipboard: async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      get().addToast('Copied', 'success');
    } catch {
      get().addToast('Clipboard access denied', 'error');
    }
    void label;
  },

  centerOrigin: () => get().boardRenderer?.centerOrigin(true),
  centerTile: (q, r) => get().boardRenderer?.centerOn(q, r, true),

  showIntroduction: () => set({ showOnboarding: true }),

  closeSheet: () => set({ inspectorOpen: false, menuOpen: false, selectedTile: null }),

  getTileAt: (q, r) => get().tiles.get(axialKey({ q, r })) ?? null,

  persistCameraDebounced: (camera) => {
    if (cameraDebounceTimer) clearTimeout(cameraDebounceTimer);
    cameraDebounceTimer = window.setTimeout(async () => {
      const meta = get().meta;
      if (meta) {
        meta.camera = camera;
        await persistCamera(meta, camera);
      }
    }, 250);
  },
}));

void isExpansionRoll;
