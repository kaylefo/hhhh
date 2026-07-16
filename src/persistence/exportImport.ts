import { strToU8, zlibSync, unzlibSync } from 'fflate';
import type { ExportPayload } from '../game/board/serialization';
import { exportSchema, validateUniqueTiles } from '../game/board/serialization';
import type { TileRecord, DiscoveryRecord, Settings, WorldMeta } from '../game/types';
import { EXPORT_FORMAT, EXPORT_VERSION } from '../game/constants';
import { rebuildFrontier } from '../game/hex/frontier';
import { ExactColorBitset, RgbCellBitset } from '../game/color/discovery';
import { createHueHistogram, incrementHueHistogram } from '../game/color/harmony';
import { createEmptyStatistics } from '../game/board/placement';

export function buildExportPayload(
  meta: WorldMeta,
  settings: Settings,
  tiles: TileRecord[],
  discoveries: DiscoveryRecord[],
): ExportPayload {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    appName: 'Kulur',
    world: {
      metadata: meta as unknown as Record<string, unknown>,
      settings: settings as unknown as Record<string, unknown>,
      tiles,
      discoveries,
      statistics: meta.statistics as unknown as Record<string, unknown>,
    },
  };
}

export function compressExport(payload: ExportPayload): Uint8Array {
  const json = JSON.stringify(payload);
  return zlibSync(strToU8(json));
}

export function compressExportAsync(payload: ExportPayload): Promise<Uint8Array> {
  const json = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/exportWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<Uint8Array>) => {
      resolve(event.data);
      worker.terminate();
    };
    worker.onerror = (error) => {
      reject(error);
      worker.terminate();
    };
    worker.postMessage({ json });
  });
}

export function decompressImport(data: Uint8Array): ExportPayload {
  const json = new TextDecoder().decode(unzlibSync(data));
  const parsed = JSON.parse(json) as unknown;
  const payload = exportSchema.parse(parsed);
  if (payload.format !== EXPORT_FORMAT) throw new Error('Wrong import format');
  if (payload.version !== EXPORT_VERSION) throw new Error('Unsupported import version');
  validateUniqueTiles(payload.world.tiles);
  return payload;
}

export function exportFilename(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `Kulur-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.kulur`;
}

export function recalculateDerivedFromImport(tiles: TileRecord[], discoveries: DiscoveryRecord[]): {
  exactBitset: ExactColorBitset;
  rgbBitset: RgbCellBitset;
  frontier: ReturnType<typeof rebuildFrontier>;
  hueHistogram: Int32Array;
  statistics: ReturnType<typeof createEmptyStatistics>;
} {
  const exactBitset = new ExactColorBitset();
  const rgbBitset = new RgbCellBitset();
  const hueHistogram = createHueHistogram();
  for (const d of discoveries) {
    exactBitset.add(d.packed);
    rgbBitset.add(d.packed);
    if (d.sourceKind === 'source') incrementHueHistogram(hueHistogram, d.packed);
  }
  const tileMap = new Map(tiles.map((t) => [`${t.q},${t.r}`, { q: t.q, r: t.r }]));
  const frontier = rebuildFrontier(tileMap);
  const statistics = createEmptyStatistics();
  statistics.placedTiles = tiles.length;
  statistics.exactColors = exactBitset.count;
  statistics.rgbCells = rgbBitset.count;
  return { exactBitset, rgbBitset, frontier, hueHistogram, statistics };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
