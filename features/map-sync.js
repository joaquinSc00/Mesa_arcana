export function createMapActions({ store, sync }) {
  function writeMap(patch) {
    if (!store.state.room) return;
    return sync.update("map", patch).catch(() => store.emit("notice", "No se pudo guardar el mapa."));
  }
  return { writeMap };
}
