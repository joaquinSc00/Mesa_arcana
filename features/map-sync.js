export function createMapActions({ store, sync }) {
  function writeMap(patch) {
    if (!store.state.room) return;
    return sync.update("map", patch).catch(() => store.emit("notice", "No se pudo guardar el mapa."));
  }
  function replaceMap(nextMap) {
    if (store.state.role !== "dm" || !store.state.room || !nextMap?.image) return Promise.reject(new Error("Mapa no disponible"));
    return sync.set("map", nextMap);
  }
  return { writeMap, replaceMap };
}
