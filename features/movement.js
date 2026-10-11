// Movimiento asistido: la aplicación representa la decisión conversada, no aplica reglas de juego.
export function createMovementActions({ store, sync }) {
  const { state } = store;
  const path = 'movementPermit';
  function authorize(characterId, steps) {
    if (state.role !== 'dm' || !state.room?.characters?.[characterId]) return Promise.resolve();
    return sync.set(path, { characterId, steps: Math.max(0, Math.min(99, Number(steps) || 0)), active: true, used: false, createdAt: Date.now() });
  }
  function close() {
    if (state.role !== 'dm') return Promise.resolve();
    return sync.set(path, null);
  }
  async function chooseDestination(x, y) {
    const permit = state.room?.movementPermit;
    const map = state.room?.map;
    const id = state.participantId;
    if (state.role !== 'player' || !permit?.active || permit.used || permit.characterId !== id || !map?.enabled) return false;
    const cols = Math.floor((map.width - (map.offsetX || 0)) / (map.cellWidth || 60));
    const rows = Math.floor((map.height - (map.offsetY || 0)) / (map.cellHeight || 60));
    if (![x,y].every(Number.isInteger) || x < 0 || y < 0 || x >= cols || y >= rows) return false;
    const key = `characters_${id}`;
    const characterIds = Object.keys(state.room.characters || {});
    const index = characterIds.indexOf(id);
    const start = map.positions?.[key] || { x: 2 + index % 8, y: 2 + Math.floor(index / 8) };
    if (Math.abs(start.x-x) + Math.abs(start.y-y) > permit.steps) return false;
    // La actualización conjunta impide que la posición cambie sin marcar el permiso consumido.
    await sync.update('', { [`map/positions/${key}`]: { x, y }, 'movementPermit/used': true });
    return true;
  }
  return { authorize, close, chooseDestination };
}
