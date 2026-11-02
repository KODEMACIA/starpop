export interface SaveData {
  unlocked: number;
  levels: Record<number, { stars: number; bestScore: number }>;
  settings: {
    careMode: boolean;
    music: boolean;
    sfx: boolean;
  };
  nickname: string; // <--- 新增
}

const DEFAULT_SAVE: SaveData = {
  unlocked: 1,
  levels: {},
  settings: { careMode: false, music: true, sfx: true },
  nickname: ''
};

export class ProgressRepository {
  private dbName = 'starpop';
  private storeName = 'save';
  private db: IDBDatabase | null = null;

  async init(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        resolve(false);
        return;
      }
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      req.onsuccess = (e) => {
        this.db = (e.target as IDBOpenDBRequest).result;
        resolve(true);
      };
      req.onerror = () => resolve(false);
    });
  }

  async load(): Promise<SaveData> {
    if (!this.db) return DEFAULT_SAVE;
    return new Promise((resolve) => {
      const tx = this.db!.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.get('main');
      req.onsuccess = () => {
        if (req.result) {
          resolve({ ...DEFAULT_SAVE, ...req.result });
        } else {
          resolve(DEFAULT_SAVE);
        }
      };
      req.onerror = () => resolve(DEFAULT_SAVE);
    });
  }

  async save(data: SaveData): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.put(data, 'main');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}
export const repo = new ProgressRepository();