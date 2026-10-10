import { generateRoomCode, normalizeRoomCode } from "../core/utils.js";
const DELETE_ROOM_CODE = String.fromCharCode(56, 55, 51, 48, 49);

export function createRoomActions({ store, sync, storage, dialogs }) {
  const { state, emit } = store;
  function createRoom({ campaignName, hostName }) {
    return sync.connectToRoom(generateRoomCode(), "dm", hostName.trim() || "Director", crypto.randomUUID(), {
      campaignName: campaignName.trim() || "Aventura sin nombre", createdAt: Date.now(),
      scene: { title: "Mesa preparada", description: "Los personajes todavia estan llegando a la primera escena.", mode: "wide" },
      characters: {}, enemies: {}, npcs: {}, objects: {}, rolls: {}, combat: { active: false, order: [], currentIndex: 0 }
    });
  }
  function joinRoom({ roomCode, name, role }) {
    const code = normalizeRoomCode(roomCode);
    if (!code) { emit("notice", "Escribi un codigo de sala."); return; }
    return sync.connectToRoom(code, role, name.trim() || "Invitado", crypto.randomUUID());
  }
  function restoreSession() {
    const saved = storage.readLocal("mesaArcanaSession");
    if (!saved?.roomCode || !saved.role) return;
    return sync.connectToRoom(saved.roomCode, saved.role, saved.participantName, saved.participantId);
  }
  async function deleteRoom(roomCode) {
    if (dialogs.prompt(`Codigo para borrar la sala ${roomCode}`) !== DELETE_ROOM_CODE) {
      emit("notice", "Codigo incorrecto. No se borro la sala."); return;
    }
    await sync.removeRoom(roomCode);
    if (state.roomCode === roomCode) {
      sync.disconnect(); storage.removeLocal("mesaArcanaSession"); store.reset(); emit("session:cleared");
    }
    emit("rooms:changed"); emit("notice", `Sala ${roomCode} borrada.`);
  }
  return { createRoom, joinRoom, restoreSession, deleteRoom };
}
