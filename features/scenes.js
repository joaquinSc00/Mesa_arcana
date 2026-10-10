export function createSceneActions({ store, sync }) {
  function saveScene(input) {
    const remote = sync.isRemote();
    const result = sync.set("scene", { title: input.title.trim() || "Escena sin titulo", description: input.description.trim(), mode: input.mode, updatedAt: Date.now() });
    store.emit("notice", remote ? "Escena enviada al tablero." : "Escena actualizada en esta pantalla.");
    return result;
  }
  return { saveScene };
}
