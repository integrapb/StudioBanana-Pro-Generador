import { ImageFile } from '../types';

const DB_NAME = 'StudioBananaDB';
const DB_VERSION = 1;
const STORE_NAME = 'products';

export interface SavedProduct {
  id: string;
  name: string;
  thumbnail: string;   // base64 of first image – for display only
  images: ImageFile[]; // all product angles
  createdAt: number;
}

// ── Open / initialise DB ──────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function saveProduct(product: SavedProduct): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx   = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.put(product);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

export async function getAllProducts(): Promise<SavedProduct[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly');
    const store  = tx.objectStore(STORE_NAME);
    const req    = store.getAll();
    req.onsuccess = () =>
      resolve((req.result as SavedProduct[]).sort((a, b) => b.createdAt - a.createdAt));
    req.onerror   = () => reject(req.error);
  });
}

export async function deleteProduct(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx   = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ── Helper: build a SavedProduct from raw image files ────────────────────────

export function createSavedProduct(name: string, images: ImageFile[]): SavedProduct {
  return {
    id:        crypto.randomUUID(),
    name:      name.trim(),
    thumbnail: images[0]?.data ? `data:${images[0].mimeType};base64,${images[0].data}` : '',
    images,
    createdAt: Date.now(),
  };
}
