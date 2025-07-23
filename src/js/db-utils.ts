import { openDB, DBSchema, IDBPDatabase } from 'idb';

// IndexedDB schema for Vivica app
interface VivicaDB extends DBSchema {
  memories: {
    key: string; // memory id
    value: MemoryItem;
    indexes: { 'by-profile': string };
  };
  memorySettings: {
    key: string; // 'global' or profileId
    value: MemoryData;
  };
  welcomeCache: {
    key: number; // timestamp
    value: { text: string; created: number };
  };
}

export interface MemoryData {
  scope: 'global' | 'profile';
  profileId?: string;
  identity: {
    name: string;
    pronouns: string;
    occupation: string;
    location: string;
  };
  personality: {
    tone: string;
    style: string;
    interests: string;
  };
  customInstructions: string;
  systemNotes: string;
  tags: string;
}

export interface MemoryItem {
  id: string;
  content: string;
  createdAt: string;
  tags: string[];
  scope: 'global' | 'profile';
  profileId?: string;
}

let dbPromise: Promise<IDBPDatabase<VivicaDB>> | null = null;

/**
 * Initialize or retrieve the IndexedDB instance.
 */
export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<VivicaDB>('vivica-db', 1, {
      upgrade(db) {
        const store = db.createObjectStore('memories', { keyPath: 'id' });
        store.createIndex('by-profile', 'profileId');
        db.createObjectStore('memorySettings');
        db.createObjectStore('welcomeCache');
      }
    });
  }
  return dbPromise;
}

/** Store or update memory settings by scope */
export async function saveMemorySettings(key: string, value: MemoryData) {
  const db = await getDB();
  await db.put('memorySettings', value, key);
}

export async function loadMemorySettings(key: string) {
  const db = await getDB();
  return db.get('memorySettings', key);
}

/** Add a new memory entry */
export async function addMemory(item: MemoryItem) {
  const db = await getDB();
  await db.put('memories', item);
}

/** Update an existing memory entry */
export async function updateMemory(item: MemoryItem) {
  const db = await getDB();
  await db.put('memories', item);
}

/** Delete a memory entry by id */
export async function deleteMemory(id: string) {
  const db = await getDB();
  await db.delete('memories', id);
}

/**
 * Get memories. If a profileId is supplied, profile memories are included.
 */
export async function getMemories(profileId?: string) {
  const db = await getDB();
  const tx = db.transaction('memories');
  const all = await tx.store.getAll();
  return all.filter(m => m.scope === 'global' || m.profileId === profileId);
}

/** Cache a welcome message, keeping only the last 10 */
export async function cacheWelcomeMessage(text: string) {
  const db = await getDB();
  const tx = db.transaction('welcomeCache', 'readwrite');
  const now = Date.now();
  await tx.store.put({ text, created: now }, now);
  const keys = await tx.store.getAllKeys();
  if (keys.length > 10) {
    const excess = keys.sort().slice(0, keys.length - 10);
    await Promise.all(excess.map(k => tx.store.delete(k)));
  }
  await tx.done;
}

export async function getWelcomeMessages() {
  const db = await getDB();
  const tx = db.transaction('welcomeCache');
  const msgs = await tx.store.getAll();
  return msgs.sort((a, b) => b.created - a.created).map(m => m.text);
}
