export function createFakeFirebase(initial = {}) {
  const data = structuredClone(initial);
  const writes = [];
  const listeners = new Set();
  const get = (path) => path.split('/').filter(Boolean).reduce((value, part) => value?.[part], data) ?? null;
  const snapshot = (path) => ({ val: () => structuredClone(get(path)) });
  function assign(path, value) {
    const parts = path.split('/').filter(Boolean);
    let target = data;
    for (const part of parts.slice(0, -1)) target = target[part] ||= {};
    if (value === null) delete target[parts.at(-1)];
    else target[parts.at(-1)] = structuredClone(value);
  }
  function notify(path) {
    for (const item of listeners) if (path === item.path || path.startsWith(item.path + '/') || item.path.startsWith(path + '/')) {
      queueMicrotask(() => { if (listeners.has(item)) item.callback(snapshot(item.path)); });
    }
  }
  function ref(path) {
    return {
      child: (child) => ref(`${path}/${child}`),
      once: async () => snapshot(path),
      on(event, callback) {
        const item = { path, callback }; listeners.add(item);
        queueMicrotask(() => { if (listeners.has(item)) callback(snapshot(path)); });
      },
      off(event, callback) { for (const item of listeners) if (item.path === path && (!callback || item.callback === callback)) listeners.delete(item); },
      async set(value) { writes.push({ method: 'set', path, value: structuredClone(value) }); assign(path, value); notify(path); },
      async update(patch) {
        writes.push({ method: 'update', path, value: structuredClone(patch) });
        for (const [key, value] of Object.entries(patch)) assign(`${path}/${key}`, value);
        notify(path);
      },
      async remove() { writes.push({ method: 'remove', path }); assign(path, null); notify(path); }
    };
  }
  const sdk = { apps: [], initializeApp(config) { this.apps.push(config); },
    database: () => ({ ref }), auth: () => ({ currentUser: { uid: 'test' } }) };
  return { sdk, data, writes, listenerCount: () => listeners.size };
}

export function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
