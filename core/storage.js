export function createStorage(storage = globalThis.localStorage) {
  return {
    readLocal(key) { try { return JSON.parse(storage.getItem(key)); } catch { return null; } },
    writeLocal(key, value) { storage.setItem(key, JSON.stringify(value)); },
    removeLocal(key) { storage.removeItem(key); }
  };
}
