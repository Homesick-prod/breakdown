import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'shooting-schedule-db';
const DB_VERSION = 1;
const STORE_NAME = 'shot-images';

interface ImageDB extends DBSchema {
  [STORE_NAME]: {
    key: string; // This will be the shot item ID
    value: File; // We will store the actual File object
  };
}

let dbPromise: Promise<IDBPDatabase<ImageDB>> | null = null;

const getDb = (): Promise<IDBPDatabase<ImageDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<ImageDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME);
      },
    });
  }
  return dbPromise;
};

export const setImage = async (key: string, imageFile: File): Promise<void> => {
  const db = await getDb();
  await db.put(STORE_NAME, imageFile, key);
};

export const getImage = async (key: string): Promise<File | undefined> => {
  const db = await getDb();
  return db.get(STORE_NAME, key);
};

export const deleteImage = async (key: string): Promise<void> => {
  const db = await getDb();
  await db.delete(STORE_NAME, key);
};