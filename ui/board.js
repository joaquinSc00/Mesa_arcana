import { byId } from "./dom.js";
import { getEntityName as entityName } from "../domain/entities.js";
import { initials } from "../core/utils.js";
import { renderRolls } from "./rolls.js";

export function createBoardView({ store, actions, map }) {
  const { state } = store;
  const getEntityName = (id) => entityName(state.room, id);
  const writeMap = actions.map.writeMap;
  function renderBoard() {
    if (!state.room) return;
    const scene = state.room.scene || {};
    byId("boardTitle").textContent = scene.title || "Sin escena";
    byId("boardSceneDescription").textContent = scene.description || "El director todavia no mostro una escena.";
    byId("boardStage").className = `board-stage ${scene.mode || "wide"}`;

    const combat = state.room.combat || {};
    const currentId = combat.order?.[combat.currentIndex] || "";
    const currentName = getEntityName(currentId);
    byId("boardTurnName").textContent = currentName || "Sin combate";

    renderTokens();
    map.sync(state.room, writeMap);
    if (state.role === "dm" && state.room.map?.enabled && state.room.map.fog) map.reveal();
    renderRolls(byId("rollFeed"), state.room);
  }
  function renderTokens() {
    const layer = byId("boardTokens");
    layer.innerHTML = "";
    const characters = Object.entries(state.room.characters || {});
    const enemies = Object.entries(state.room.enemies || {});
    const npcs = Object.entries(state.room.npcs || {});
    const objects = Object.entries(state.room.objects || {});
    const all = [
      ...characters.map((entry) => [...entry, "character"]),
      ...enemies.map((entry) => [...entry, "enemy"]),
      ...npcs.map((entry) => [...entry, "npc"]),
      ...objects.map((entry) => [...entry, "object"])
    ];

    all.forEach(([id, item, type], index) => {
      const token = document.createElement("div");
      token.className = `token ${type}`;
      token.textContent = initials(item.name || "?");
      token.style.left = `${10 + (index % 5) * 16}%`;
      token.style.top = `${14 + Math.floor(index / 5) * 18}%`;
      token.title = item.name || id;
      layer.append(token);
    });
  }
  function toggleBoardLayout() {
    const focused = byId("boardShell").classList.toggle("focused");
    const button = byId("toggleBoardScaleButton");
    button.setAttribute("aria-pressed", String(focused));
    button.setAttribute("aria-label", focused ? "Mostrar panel lateral" : "Ocultar panel lateral");
    button.title = focused ? "Mostrar panel lateral" : "Ocultar panel lateral";
  }
  function bind() { byId("toggleBoardScaleButton").addEventListener("click", toggleBoardLayout); }
  return { bind, render: renderBoard };
}
