import type {
  Settings,
  WorldMeta,
  TileRecord,
  DiscoveryRecord,
  UndoSnapshot,
  CameraState,
} from '../game/types';
import { getDatabase, chunkKey } from './database';
import { CHUNK_SIZE, DEFAULT_SETTINGS, HEX_RADIUS } from '../game/constants';
import { settingsSchema } from './schema';
import { cloneMetaForStorage, hydrateMeta } from './metaSerialize';

export { chunkKey };

export async function loadSettings(): Promise<Settings> {
  const db = await getDatabase();
  const raw = await db.get('settings', 'app');
  if (!raw) return { ...DEFAULT_SETTINGS };
  return settingsSchema.parse(raw);
}

export async function saveSettings(settings: Settings): Promise<void> {
  const db = await getDatabase();
  await db.put('settings', settings, 'app');
}

export async function loadMeta(): Promise<WorldMeta | null> {
  const db = await getDatabase();
  const raw = await db.get('meta', 'world');
  return raw ? hydrateMeta(raw) : null;
}

export async function saveMeta(meta: WorldMeta): Promise<void> {
  const db = await getDatabase();
  meta.updatedAt = Date.now();
  await db.put('meta', cloneMetaForStorage(meta), 'world');
}

export async function loadAllTiles(_worldId: string): Promise<Map<string, TileRecord>> {
  const db = await getDatabase();
  const tiles = new Map<string, TileRecord>();
  const all = await db.getAll('chunks');
  for (const tile of all) {
    if (tile) tiles.set(`${tile.q},${tile.r}`, tile);
  }
  return tiles;
}

export async function saveTile(worldId: string, tile: TileRecord): Promise<void> {
  const db = await getDatabase();
  await db.put('chunks', tile, chunkKey(worldId, tile.q, tile.r));
}

export async function deleteTile(worldId: string, q: number, r: number): Promise<void> {
  const db = await getDatabase();
  await db.delete('chunks', chunkKey(worldId, q, r));
}

export async function loadDiscoveries(): Promise<Map<number, DiscoveryRecord>> {
  const db = await getDatabase();
  const all = await db.getAll('discoveries');
  const map = new Map<number, DiscoveryRecord>();
  for (const d of all) {
    if (d) map.set(d.packed, d);
  }
  return map;
}

export async function saveDiscovery(record: DiscoveryRecord): Promise<void> {
  const db = await getDatabase();
  await db.put('discoveries', record, record.packed);
}

export async function deleteDiscovery(packed: number): Promise<void> {
  const db = await getDatabase();
  await db.delete('discoveries', packed);
}

export async function loadExactPages(): Promise<Map<number, Uint8Array>> {
  const db = await getDatabase();
  const keys = await db.getAllKeys('exactBitsetPages');
  const pages = new Map<number, Uint8Array>();
  for (const key of keys) {
    const page = await db.get('exactBitsetPages', key as number);
    if (page) pages.set(key as number, page);
  }
  return pages;
}

export async function saveExactPage(index: number, data: Uint8Array): Promise<void> {
  const db = await getDatabase();
  await db.put('exactBitsetPages', data, index);
}

export async function loadRgbBitset(): Promise<Uint8Array | null> {
  const db = await getDatabase();
  return (await db.get('rgbCellBitset', 'main')) ?? null;
}

export async function loadUndo(): Promise<UndoSnapshot | null> {
  const db = await getDatabase();
  return (await db.get('undo', 'current')) ?? null;
}

export async function saveUndo(snapshot: UndoSnapshot | null): Promise<void> {
  const db = await getDatabase();
  if (snapshot) await db.put('undo', snapshot, 'current');
  else await db.delete('undo', 'current');
}

export async function persistUndoAtomic(
  meta: WorldMeta,
  snapshot: UndoSnapshot,
  exactPages: Map<number, Uint8Array>,
  rgbData: Uint8Array,
): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(
    ['meta', 'chunks', 'discoveries', 'exactBitsetPages', 'rgbCellBitset', 'undo'],
    'readwrite',
  );
  meta.updatedAt = Date.now();
  await tx.objectStore('meta').put(cloneMetaForStorage(meta), 'world');
  await tx.objectStore('chunks').delete(chunkKey(meta.worldId, snapshot.tile.q, snapshot.tile.r));
  for (const packed of snapshot.discoveriesAdded) {
    await tx.objectStore('discoveries').delete(packed);
  }
  for (const [idx, page] of exactPages) {
    await tx.objectStore('exactBitsetPages').put(page, idx);
  }
  await tx.objectStore('rgbCellBitset').put(rgbData, 'main');
  await tx.objectStore('undo').delete('current');
  await tx.done;
}

export async function persistPlacementAtomic(
  meta: WorldMeta,
  tile: TileRecord,
  discoveries: DiscoveryRecord[],
  exactPages: Map<number, Uint8Array>,
  rgbData: Uint8Array,
  undo: UndoSnapshot | null,
): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(
    ['meta', 'chunks', 'discoveries', 'exactBitsetPages', 'rgbCellBitset', 'undo'],
    'readwrite',
  );
  meta.updatedAt = Date.now();
  await tx.objectStore('meta').put(cloneMetaForStorage(meta), 'world');
  await tx.objectStore('chunks').put(tile, chunkKey(meta.worldId, tile.q, tile.r));
  for (const d of discoveries) {
    await tx.objectStore('discoveries').put(d, d.packed);
  }
  for (const [idx, page] of exactPages) {
    await tx.objectStore('exactBitsetPages').put(page, idx);
  }
  await tx.objectStore('rgbCellBitset').put(rgbData, 'main');
  if (undo) await tx.objectStore('undo').put(undo, 'current');
  else await tx.objectStore('undo').delete('current');
  await tx.done;
}

export async function persistCamera(meta: WorldMeta, camera: CameraState): Promise<void> {
  meta.camera = camera;
  await saveMeta(meta);
}

export async function persistPendingRoll(meta: WorldMeta): Promise<void> {
  await saveMeta(meta);
}

export type SessionRecord = {
  lastVisibleAt: number;
  lastPlayTickAt: number;
  appVersion: number;
};

export async function loadSession(): Promise<SessionRecord | null> {
  const db = await getDatabase();
  const raw = await db.get('session', 'active');
  return (raw as SessionRecord | undefined) ?? null;
}

export async function saveSession(session: SessionRecord): Promise<void> {
  const db = await getDatabase();
  await db.put('session', session, 'active');
}

export async function loadTilesNearCamera(
  _worldId: string,
  camera: CameraState,
  screenWidth = 390,
  screenHeight = 844,
  chunkMargin = 1,
): Promise<Map<string, TileRecord>> {
  const db = await getDatabase();
  const all = await db.getAll('chunks');
  const tiles = new Map<string, TileRecord>();

  const zoom = Math.max(0.12, camera.zoom);
  const halfW = (screenWidth * 0.5) / zoom;
  const halfH = (screenHeight * 0.5) / zoom;
  const minX = -camera.worldX - halfW - HEX_RADIUS * CHUNK_SIZE * chunkMargin;
  const maxX = -camera.worldX + halfW + HEX_RADIUS * CHUNK_SIZE * chunkMargin;
  const minY = -camera.worldY - halfH - HEX_RADIUS * CHUNK_SIZE * chunkMargin;
  const maxY = -camera.worldY + halfH + HEX_RADIUS * CHUNK_SIZE * chunkMargin;

  const minChunkQ = Math.floor(minX / (HEX_RADIUS * Math.sqrt(3) * CHUNK_SIZE)) - chunkMargin;
  const maxChunkQ = Math.floor(maxX / (HEX_RADIUS * Math.sqrt(3) * CHUNK_SIZE)) + chunkMargin;
  const minChunkR = Math.floor(minY / (HEX_RADIUS * 1.5 * CHUNK_SIZE)) - chunkMargin;
  const maxChunkR = Math.floor(maxY / (HEX_RADIUS * 1.5 * CHUNK_SIZE)) + chunkMargin;

  for (const tile of all) {
    if (!tile) continue;
    const chunkQ = Math.floor(tile.q / CHUNK_SIZE);
    const chunkR = Math.floor(tile.r / CHUNK_SIZE);
    if (
      chunkQ >= minChunkQ &&
      chunkQ <= maxChunkQ &&
      chunkR >= minChunkR &&
      chunkR <= maxChunkR
    ) {
      tiles.set(`${tile.q},${tile.r}`, tile);
    }
  }

  // Always include origin neighborhood so first-ring frontier works after reload
  if (tiles.size === 0) {
    for (const tile of all) {
      if (tile) tiles.set(`${tile.q},${tile.r}`, tile);
    }
  }

  return tiles;
}

export async function loadRemainingTiles(
  worldId: string,
  alreadyLoaded: Map<string, TileRecord>,
): Promise<Map<string, TileRecord>> {
  const all = await loadAllTiles(worldId);
  for (const [key, tile] of alreadyLoaded) {
    all.set(key, tile);
  }
  return all;
}

export async function getAllTilesForExport(): Promise<TileRecord[]> {
  const db = await getDatabase();
  return (await db.getAll('chunks')).filter(Boolean) as TileRecord[];
}

export async function getAllDiscoveriesForExport(): Promise<DiscoveryRecord[]> {
  const db = await getDatabase();
  return (await db.getAll('discoveries')).filter(Boolean) as DiscoveryRecord[];
}

export async function replaceWorldData(
  meta: WorldMeta,
  tiles: TileRecord[],
  discoveries: DiscoveryRecord[],
  exactPages: Map<number, Uint8Array>,
  rgbData: Uint8Array,
  settings: Settings,
): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(
    ['meta', 'chunks', 'discoveries', 'exactBitsetPages', 'rgbCellBitset', 'settings', 'undo'],
    'readwrite',
  );
  await tx.objectStore('chunks').clear();
  await tx.objectStore('discoveries').clear();
  await tx.objectStore('exactBitsetPages').clear();
  await tx.objectStore('undo').clear();
  await tx.objectStore('meta').put(cloneMetaForStorage(meta), 'world');
  await tx.objectStore('settings').put(settings, 'app');
  for (const tile of tiles) {
    await tx.objectStore('chunks').put(tile, chunkKey(meta.worldId, tile.q, tile.r));
  }
  for (const d of discoveries) {
    await tx.objectStore('discoveries').put(d, d.packed);
  }
  for (const [idx, page] of exactPages) {
    await tx.objectStore('exactBitsetPages').put(page, idx);
  }
  await tx.objectStore('rgbCellBitset').put(rgbData, 'main');
  await tx.done;
}
