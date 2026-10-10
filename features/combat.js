export function createCombatActions({ store, sync }) {
  const { state, emit } = store;
  function startCombat() {
    const order = [...Object.keys(state.room?.characters || {}), ...Object.keys(state.room?.enemies || {}), ...Object.keys(state.room?.npcs || {})];
    if (!order.length) { emit("notice", "No hay participantes para ordenar."); return; }
    return sync.set("combat", { active: true, order, currentIndex: 0, startedAt: Date.now() });
  }
  function nextTurn() {
    const combat = state.room?.combat;
    if (!combat?.order?.length) return;
    return sync.set("combat/currentIndex", ((combat.currentIndex || 0) + 1) % combat.order.length);
  }
  function markTurn(id) {
    const order = state.room.combat?.order || [];
    const index = order.indexOf(id);
    return sync.update("combat", { active: true, order: index >= 0 ? order : [...order, id], currentIndex: index >= 0 ? index : order.length });
  }
  return { startCombat, nextTurn, markTurn };
}
