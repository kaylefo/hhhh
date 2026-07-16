import type { IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION } from '../game/constants';
import { STORE_NAMES } from './schema';

export async function migrateDb(db: IDBPDatabase<unknown>): Promise<void> {
  if (db.objectStoreNames.contains('meta')) return;
  for (const name of STORE_NAMES) {
    if (name === 'chunks') {
      db.createObjectStore('chunks');
    } else if (name === 'discoveries' || name === 'exactBitsetPages') {
      db.createObjectStore(name);
    } else {
      db.createObjectStore(name);
    }
  }
}

export { DB_NAME, DB_VERSION };
