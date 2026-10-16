import { byId } from "./dom.js";

export function createHomeView({ store, sync, actions, navigation }) {
  const { state } = store;
  async function loadActiveRooms() {
    const list = byId("activeRoomsList");
    if (!list) return;
    try {
      const rooms = await sync.listRooms();
      const entries = Object.entries(rooms).sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));
      list.innerHTML = entries.length ? entries.map(([code, room]) => `
        <div class="entity-item"><strong>${code}</strong>
          <span>${room.campaignName || "Aventura sin nombre"} - ${Object.keys(room.characters || {}).length} personaje(s)</span>
          <div class="entity-actions"><button type="button" data-join-room="${code}" data-join-role="dm">Director</button>
            <button type="button" data-join-room="${code}" data-join-role="board">Tablero</button>
            <button type="button" data-delete-room="${code}">Borrar</button></div></div>
      `).join("") : '<div class="entity-item"><span>No hay salas activas.</span></div>';
      document.querySelectorAll("[data-join-room]").forEach(button => button.addEventListener("click", () => actions.rooms.joinRoom({
        roomCode: button.dataset.joinRoom, role: button.dataset.joinRole, name: button.dataset.joinRole === "dm" ? "Director" : "Tablero"
      })));
      document.querySelectorAll("[data-delete-room]").forEach(button => button.addEventListener("click", () => actions.rooms.deleteRoom(button.dataset.deleteRoom)));
    } catch (error) {
      list.innerHTML = `<div class="entity-item"><span>${error.message === "Firebase no esta disponible." ? error.message : "No pude leer salas activas."}</span></div>`;
    }
  }
  function copyRoomCode() {
    if (!state.roomCode) return;
    navigator.clipboard?.writeText(state.roomCode); store.emit("notice", `Codigo copiado: ${state.roomCode}`);
  }
  function openBoard() {
    if (!state.roomCode) return;
    const url = new URL(window.location.href); url.searchParams.set("room", state.roomCode); url.searchParams.set("role", "board");
    window.open(url.toString(), "_blank", "noopener");
  }
  function bind() {
    const resumeButton = byId("resumeCharacterButton");
    const resumeList = byId("resumeCharacterList");
    byId("roomCodeInput").addEventListener("input", () => { resumeList.replaceChildren(); });
    resumeButton.addEventListener("click", async () => {
      const code = byId("roomCodeInput").value.trim().toUpperCase();
      resumeList.replaceChildren();
      if (!code) { store.emit("notice", "Escribi el codigo de sala."); return; }
      resumeButton.disabled = true;
      try {
        const characters = await sync.listCharacters(code);
        if (byId("roomCodeInput").value.trim().toUpperCase() !== code) return;
        if (!Object.keys(characters).length) resumeList.textContent = "No hay personajes guardados en esta sala.";
        for (const [id, character] of Object.entries(characters)) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "secondary-button";
          button.textContent = `${character.name || "Sin nombre"} · ${character.playerName || "Jugador"} · ${character.status === "ready" ? "Listo" : "Borrador"}`;
          button.addEventListener("click", async () => {
            button.disabled = true;
            try { await actions.rooms.resumeCharacter({ roomCode: code, characterId: id }); }
            catch (error) { store.emit("notice", error.message); }
            finally { button.disabled = false; }
          });
          resumeList.append(button);
        }
      } catch (error) { store.emit("notice", error.message); }
      finally { resumeButton.disabled = false; }
    });
    byId("createRoomForm").addEventListener("submit", event => {
      event.preventDefault(); actions.rooms.createRoom({ campaignName: byId("campaignNameInput").value, hostName: byId("hostNameInput").value });
    });
    byId("joinRoomForm").addEventListener("submit", event => {
      event.preventDefault(); actions.rooms.joinRoom({ roomCode: byId("roomCodeInput").value, name: byId("participantNameInput").value, role: new FormData(event.currentTarget).get("joinRole") });
    });
    byId("refreshRoomsButton").addEventListener("click", loadActiveRooms);
    byId("goHomeButton").addEventListener("click", () => { state.hasShownRole = true; navigation.showView("home"); loadActiveRooms(); });
    byId("copyRoomButton").addEventListener("click", copyRoomCode);
    byId("openBoardButton").addEventListener("click", openBoard);
    byId("playerOpenBoardButton").addEventListener("click", openBoard);
  }
  return { bind, loadActiveRooms };
}
