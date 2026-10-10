import { emptyAttributeMap, emptySkillMap } from "../domain/character-rules.js";

export function createStore() {
  const initial = () => ({ roomCode: "", role: "", participantId: "", participantName: "", room: null,
    connected: false, hasShownRole: false, activeLibrary: "enemies", activeFocusFilter: "social",
    localBonus: emptyAttributeMap(), skillTraining: emptySkillMap() });
  const state = initial();
  const ui = { playerPage: "character", dmMode: "live", dmPage: "table" };
  const listeners = new Map();
  function on(event, listener) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(listener);
    return () => listeners.get(event)?.delete(listener);
  }
  function emit(event, payload) { listeners.get(event)?.forEach((listener) => listener(payload)); }
  function reset() { Object.assign(state, initial()); }
  return { state, ui, on, emit, reset };
}
