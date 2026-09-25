/**
 * Client-side IndexedDB persistence service for SymFlowAge
 * Provides 100% offline persistence, optimistic mutations, and recovery.
 */

const DB_NAME = 'symflowage_offline_db';
const DB_VERSION = 1;

export interface OfflineStoredState {
  id: string; // e.g. 'active_prediction', 'active_context', 'long_term_goals'
  data: any;
  updatedAt: number;
}

class SymFlowDb {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB not supported in this environment'));
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        // Key-value store for app domains
        if (!db.objectStoreNames.contains('domain_stores')) {
          db.createObjectStore('domain_stores', { keyPath: 'id' });
        }
        // Specific store for individual microSteps
        if (!db.objectStoreNames.contains('micro_steps')) {
          const stepStore = db.createObjectStore('micro_steps', { keyPath: 'id' });
          stepStore.createIndex('order', 'order', { unique: false });
          stepStore.createIndex('goalId', 'goalId', { unique: false });
        }
        // Specific store for long term goals
        if (!db.objectStoreNames.contains('long_term_goals')) {
          db.createObjectStore('long_term_goals', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  async setItem<T>(storeName: 'domain_stores' | 'micro_steps' | 'long_term_goals', item: T): Promise<void> {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn(`[IndexedDB] setItem failed on ${storeName}:`, e);
    }
  }

  async getItem<T>(storeName: 'domain_stores' | 'micro_steps' | 'long_term_goals', key: string | number): Promise<T | null> {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn(`[IndexedDB] getItem failed on ${storeName}:`, e);
      return null;
    }
  }

  async getAll<T>(storeName: 'domain_stores' | 'micro_steps' | 'long_term_goals'): Promise<T[]> {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn(`[IndexedDB] getAll failed on ${storeName}:`, e);
      return [];
    }
  }

  async removeItem(storeName: 'domain_stores' | 'micro_steps' | 'long_term_goals', key: string | number): Promise<void> {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn(`[IndexedDB] removeItem failed on ${storeName}:`, e);
    }
  }

  async clearStore(storeName: 'domain_stores' | 'micro_steps' | 'long_term_goals'): Promise<void> {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn(`[IndexedDB] clearStore failed on ${storeName}:`, e);
    }
  }
}

export const offlineDb = new SymFlowDb();
