import { openDB, type IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION } from './migrations';
import type { KulurDB } from './schema';
import { migrateDb } from './migrations';

const STORE_NAMES = [
  'meta',
  'chunks',
  'discoveries',
  'exactBitsetPages',
  'rgbCellBitset',
  'settings',
  'undo',
  'session',
] as const;

type StoreName = (typeof STORE_NAMES)[number];

let dbPromise: Promise<IDBPDatabase<KulurDB>> | null = null;

export async function getDatabase(): Promise<IDBPDatabase<KulurDB>> {
  if (!dbPromise) {
    dbPromise = openDB<KulurDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        migrateDb(db as IDBPDatabase<unknown>);
      },
    });
  }
  return dbPromise;
}

export async function clearDatabase(): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(STORE_NAMES, 'readwrite');
  for (const name of STORE_NAMES) {
    await tx.objectStore(name).clear();
  }
  await tx.done;
}

export function chunkKey(worldId: string, q: number, r: number): string {
  return `${worldId}:${q}:${r}`;
}

export type { StoreName };
