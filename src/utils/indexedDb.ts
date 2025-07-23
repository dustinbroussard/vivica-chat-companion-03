import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface MemoryEntry {
  id: string;
  content: string;
  scope: 'global' | 'profile';
  profileId?: string;
  createdAt: string;
  tags: string[];
}

interface WelcomeMessage {
  id?: number;
  text: string;
  createdAt: string;
}

interface VivicaDb extends DBSchema {
  memories: {
    key: string;
    value: MemoryEntry;
    indexes: { 'by-profile': string };
  };
  welcomeMessages: {
    key: number;
    value: WelcomeMessage;
  };
}

let dbPromise: Promise<IDBPDatabase<VivicaDb>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<VivicaDb>('vivica-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('memories')) {
          const store = db.createObjectStore('memories', { keyPath: 'id' });
          store.createIndex('by-profile', 'profileId');
        }
        if (!db.objectStoreNames.contains('welcomeMessages')) {
          db.createObjectStore('welcomeMessages', { keyPath: 'id', autoIncrement: true });
        }
      }
    });
  }
  return dbPromise;
}

export async function saveMemoryToDb(entry: MemoryEntry) {
  const db = await getDb();
  await db.put('memories', entry);
  return entry;
}

export async function deleteMemoryFromDb(id: string) {
  const db = await getDb();
  await db.delete('memories', id);
}

export async function getAllMemoriesFromDb() {
  const db = await getDb();
  return db.getAll('memories');
}

export async function getMemoriesForProfile(profileId?: string) {
  const db = await getDb();
  const all = await db.getAll('memories');
  return all.filter(m => (m.scope === 'global') || (m.scope === 'profile' && m.profileId === profileId));
}

export async function clearAllMemoriesFromDb() {
  const db = await getDb();
  await db.clear('memories');
}

export async function saveWelcomeMessage(text: string) {
  const db = await getDb();
  await db.add('welcomeMessages', { text, createdAt: new Date().toISOString() });
  const messages = await db.getAll('welcomeMessages');
  if (messages.length > 10) {
    const excess = messages.sort((a,b) => (a.id! - b.id!)).slice(0, messages.length - 10);
    for (const msg of excess) {
      if (msg.id !== undefined) await db.delete('welcomeMessages', msg.id);
    }
  }
}

export async function getCachedWelcomeMessages() {
  const db = await getDb();
  return db.getAll('welcomeMessages');
}

