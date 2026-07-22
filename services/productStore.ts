import { ImageFile, ProductPassport, ProductView } from '../types';
import { createPassport, getProductionImages } from './productPassport';

const DB_NAME = 'StudioBananaDB';
const DB_VERSION = 1;
const STORE_NAME = 'products';

export interface SavedProduct {
  id: string;
  name: string;
  thumbnail: string;   // full data URL of first image – for display
  images: ImageFile[]; // all product angles (with correct preview field)
  passport?: ProductPassport;
  createdAt: number;
  updatedAt?: number;
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
    const tx    = db.transaction(STORE_NAME, 'readwrite');
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
    const store = tx.objectStore(STORE_NAME);
    const req   = store.getAll();
    req.onsuccess = () =>
      resolve((req.result as SavedProduct[]).map(normalizeSavedProduct).sort((a, b) => b.createdAt - a.createdAt));
    req.onerror   = () => reject(req.error);
  });
}

export async function deleteProduct(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ── Helper: build a SavedProduct from ImageFile[] ────────────────────────────
// ImageFile has: { id, data (base64), mimeType, preview (full data URL) }
// We use preview as thumbnail since it's already a valid displayable data URL.

export function createSavedProduct(name: string, views: ProductView[]): SavedProduct {
  const passport = createPassport(views);
  const images = getProductionImages(passport);
  return {
    id:        crypto.randomUUID(),
    name:      name.trim(),
    // preview is the full "data:image/...;base64,..." URL — safe to store and display
    thumbnail: images[0]?.preview ?? '',
    images,
    passport,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function normalizeSavedProduct(product: SavedProduct): SavedProduct {
  if (product.passport) {
    return {
      ...product,
      images: getProductionImages(product.passport),
      thumbnail: product.thumbnail || product.passport.views[0]?.image.preview || '',
    };
  }

  const legacyViews: ProductView[] = product.images.map((image) => ({
    id: crypto.randomUUID(),
    angle: 'unassigned',
    image,
    status: 'verified',
    createdAt: product.createdAt,
  }));

  return {
    ...product,
    passport: createPassport(legacyViews),
    updatedAt: product.updatedAt || product.createdAt,
  };
}

export function withUpdatedPassport(product: SavedProduct, passport: ProductPassport): SavedProduct {
  const images = getProductionImages(passport);
  return {
    ...product,
    passport: { ...passport, updatedAt: Date.now() },
    images,
    thumbnail: images[0]?.preview || passport.views[0]?.image.preview || product.thumbnail,
    updatedAt: Date.now(),
  };
}
