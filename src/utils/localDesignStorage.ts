import { LabelFormatConfig } from '../types';
import { YOREME_DEFAULT_LABEL_FORMAT_CONFIG } from '../data/defaultLabelFormat';

const DB_NAME = 'yoreme_app_db';
const STORE_NAME = 'app_configs';
const KEY_ACTIVE_FORMAT = 'active_label_format';
const LOCAL_STORAGE_KEY = 'label_format_config';

/**
 * Open IndexedDB database with error handling
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Persists the active label format to IndexedDB (unlimited quota)
 * and attempts a mirror in localStorage.
 */
export async function saveActiveLabelFormatToLocal(config: LabelFormatConfig): Promise<void> {
  const configWithTimestamp: LabelFormatConfig = {
    ...config,
    savedAt: config.savedAt || Date.now(),
  };

  // 1. Save to IndexedDB (unconstrained size, preserves full resolution logo)
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(configWithTimestamp, KEY_ACTIVE_FORMAT);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB saveActiveLabelFormat error:', err);
  }

  // 2. Best-effort mirror in localStorage for fast synchronous boots
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(configWithTimestamp));
  } catch {
    try {
      // If quota exceeded due to large base64 logo, save config without logo in localStorage
      // IndexedDB will still preserve the full logo intact
      const stripped = { ...configWithTimestamp, logoUrl: '' };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stripped));
    } catch {
      // Ignore localStorage quota failure
    }
  }
}

/**
 * Loads the active label format from IndexedDB (or fallback to localStorage).
 */
export async function loadActiveLabelFormatFromLocal(): Promise<LabelFormatConfig | null> {
  try {
    const db = await openDB();
    const result = await new Promise<LabelFormatConfig | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_ACTIVE_FORMAT);
      req.onsuccess = () => resolve((req.result as LabelFormatConfig) || null);
      req.onerror = () => reject(req.error);
    });

    if (result && typeof result === 'object' && result.widthInches) {
      return result;
    }
  } catch (err) {
    console.warn('IndexedDB loadActiveLabelFormat error:', err);
  }

  // Fallback to localStorage
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && parsed.widthInches) {
        return parsed;
      }
    }
  } catch {}

  return null;
}

/**
 * Synchronous initial value for React useState to avoid layout flash on first render.
 * Defaults immediately to the YOREME format (the imported/customized design).
 */
export function getSynchronousInitialLabelFormat(): LabelFormatConfig {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.widthInches) {
          // If localStorage saved version lacks logoUrl but default has it, preserve default logo
          const logoUrl = parsed.logoUrl || YOREME_DEFAULT_LABEL_FORMAT_CONFIG.logoUrl || '';
          return {
            ...YOREME_DEFAULT_LABEL_FORMAT_CONFIG,
            ...parsed,
            logoUrl,
          };
        }
      }
    } catch {}
  }

  return { ...YOREME_DEFAULT_LABEL_FORMAT_CONFIG };
}
