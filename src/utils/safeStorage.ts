import { CustomerRecord } from '../types';

/**
 * Enterprise Safe Storage Utility
 * - Provides quota-resilient wrappers around localStorage
 * - Seamlessly integrates IndexedDB for large datasets (e.g. thousands of customer records)
 * - Automatically purges expendable/obsolete cache keys when quota is strained
 * - Never throws uncaught QuotaExceededError exceptions into React lifecycle
 */

const DB_NAME = 'MyCashEnterpriseStorageDB';
const DB_VERSION = 1;
const RECORDS_STORE = 'customer_records_store';
const RECORDS_KEY = 'latest_records';

// Helper: Open IndexedDB safely with fallback
function openIndexedDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event: any) => {
        const db = event.target?.result as IDBDatabase;
        if (db && !db.objectStoreNames.contains(RECORDS_STORE)) {
          db.createObjectStore(RECORDS_STORE);
        }
      };
      request.onsuccess = (event: any) => {
        resolve(event.target?.result || null);
      };
      request.onerror = (err) => {
        console.warn('[IndexedDB: Warning] Could not open IndexedDB:', err);
        resolve(null);
      };
    } catch (e) {
      console.warn('[IndexedDB: Warning] Exception opening IndexedDB:', e);
      resolve(null);
    }
  });
}

/**
 * Asynchronously save customer records to IndexedDB (virtually unlimited quota)
 */
export async function saveRecordsToIDB(records: CustomerRecord[]): Promise<boolean> {
  try {
    const db = await openIndexedDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(RECORDS_STORE, 'readwrite');
        const store = tx.objectStore(RECORDS_STORE);
        store.put(records, RECORDS_KEY);
        tx.oncomplete = () => {
          resolve(true);
        };
        tx.onerror = (err) => {
          console.warn('[IndexedDB: Warning] Save transaction error:', err);
          resolve(false);
        };
      } catch (err) {
        console.warn('[IndexedDB: Warning] Transaction exception:', err);
        resolve(false);
      }
    });
  } catch (e) {
    console.warn('[IndexedDB: Warning] saveRecordsToIDB error:', e);
    return false;
  }
}

/**
 * Asynchronously load customer records from IndexedDB
 */
export async function getRecordsFromIDB(): Promise<CustomerRecord[] | null> {
  try {
    const db = await openIndexedDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(RECORDS_STORE, 'readonly');
        const store = tx.objectStore(RECORDS_STORE);
        const req = store.get(RECORDS_KEY);
        req.onsuccess = () => {
          const val = req.result;
          if (Array.isArray(val) && val.length > 0) {
            resolve(val);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => {
          resolve(null);
        };
      } catch (err) {
        resolve(null);
      }
    });
  } catch (e) {
    return null;
  }
}

/**
 * Attempt to free up localStorage space if quota is tight
 */
function cleanupLocalStorageQuota(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    
    // 1. Remove legacy v1/v2 storage keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('mycash_v1') || (key.startsWith('mycash_v2') && key !== 'mycash_v2_roles'))) {
        keysToRemove.push(key);
      }
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }

    // 2. Truncate heavy logs in localStorage (keep only latest 25 logs)
    const logsStr = localStorage.getItem('mycash_v3_logs');
    if (logsStr && logsStr.length > 50000) {
      try {
        const parsed = JSON.parse(logsStr);
        if (Array.isArray(parsed) && parsed.length > 25) {
          localStorage.setItem('mycash_v3_logs', JSON.stringify(parsed.slice(0, 25)));
        }
      } catch (e) {
        localStorage.removeItem('mycash_v3_logs');
      }
    }
  } catch (e) {
    // Ignore cleanup errors
  }
}

/**
 * Safe localStorage wrapper with try/catch and QuotaExceeded resilience
 */
export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`[safeStorage] getItem failed for key "${key}":`, e);
      return null;
    }
  },

  setItem(key: string, value: string): boolean {
    if (key === 'mycash_v3_records') {
      return false;
    }
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      localStorage.setItem(key, value);
      return true;
    } catch (err: any) {
      const isQuotaError = 
        err?.name === 'QuotaExceededError' || 
        err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' || 
        err?.code === 22 || 
        err?.code === 1014;

      if (isQuotaError) {
        console.warn(`[safeStorage] QuotaExceededError when saving key "${key}". Running quota cleanup...`);
        cleanupLocalStorageQuota();

        // If the key itself is the records array and it's large, don't force it into localStorage
        // because IndexedDB and Supabase already handle persistence without quota boundaries
        if (key === 'mycash_v3_records') {
          try {
            // Remove full records from localStorage to prevent repeated quota crashes
            localStorage.removeItem('mycash_v3_records');
            console.log('[safeStorage] Cleared mycash_v3_records from localStorage; safely preserved in IndexedDB & Supabase cloud.');
            return false;
          } catch (e) {}
        }

        // Try one more time for non-records keys or smaller payload
        try {
          localStorage.setItem(key, value);
          return true;
        } catch (retryErr) {
          console.warn(`[safeStorage] Quota still exceeded for key "${key}". Skipping localStorage write gracefully.`);
          return false;
        }
      }

      console.warn(`[safeStorage] setItem error for key "${key}":`, err?.message || err);
      return false;
    }
  },

  removeItem(key: string): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[safeStorage] removeItem failed for key "${key}":`, e);
    }
  }
};
