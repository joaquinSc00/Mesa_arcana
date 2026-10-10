export function getCollectionForType(type) {
  if (type === "enemy") return "enemies";
  if (type === "npc") return "npcs";
  if (type === "object") return "objects";
  return "characters";
}

export function getEntityName(room, id) {
  return room?.characters?.[id]?.name || room?.enemies?.[id]?.name || "";
}

export function getCurrentActorName(state) {
  return state.room?.characters?.[state.participantId]?.name || state.participantName || "Jugador";
}
