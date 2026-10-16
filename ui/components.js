import { byId, $ } from "./dom.js";
const icons = {
  copy: "C",
  monitor: "[]",
  sparkles: "*",
  "log-in": ">",
  save: "v",
  "rotate-ccw": "R",
  swords: "X",
  "skip-forward": ">>",
  send: ">",
  plus: "+",
  maximize: "□"
};
export function hydrateIcons() {
  document.querySelectorAll("[data-icon]").forEach((element) => {
    element.textContent = icons[element.dataset.icon] || "-";
  });
}
export function setupFullscreen() {
  const button = byId("fullscreenButton");
  const root = document.documentElement;
  const current = () => document.fullscreenElement || document.webkitFullscreenElement;
  const update = () => {
    const active = Boolean(current());
    const label = active ? "Salir de pantalla completa" : "Pantalla completa";
    button.title = label;
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", String(active));
    button.firstElementChild.textContent = active ? "↙" : "⛶";
  };
  const toggle = async () => {
    try {
      const target = current() ? document : root;
      const method = current()
        ? document.exitFullscreen || document.webkitExitFullscreen
        : root.requestFullscreen || root.webkitRequestFullscreen;
      if (!method) {
        toast("Este navegador no admite pantalla completa para esta página.");
        return;
      }
      await method.call(target);
      update();
    } catch {
      toast("No se pudo cambiar la pantalla completa en este dispositivo.");
    }
  };
  button.addEventListener("click", toggle);
  document.addEventListener("fullscreenchange", update);
  document.addEventListener("webkitfullscreenchange", update);
  update();
  return () => {
    button.removeEventListener("click", toggle);
    document.removeEventListener("fullscreenchange", update);
    document.removeEventListener("webkitfullscreenchange", update);
  };
}
export function setupCollapsiblePanels() {
  document.querySelectorAll(".collapsible-panel").forEach((panel) => {
    const heading = panel.querySelector(":scope > h2");
    if (!heading) return;
    const content = document.createElement("div");
    content.className = "collapsible-content";
    while (heading.nextSibling) content.append(heading.nextSibling);
    panel.append(content);
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "panel-toggle";
    toggle.setAttribute("aria-label", `Cerrar ${heading.textContent.trim()}`);
    toggle.setAttribute("aria-expanded", "true");
    toggle.textContent = "−";
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.setAttribute("aria-label", `${expanded ? "Cerrar" : "Abrir"} ${heading.firstChild.textContent.trim()}`);
      toggle.textContent = expanded ? "−" : "+";
      content.hidden = !expanded;
    });
    heading.append(toggle);
    if (panel.dataset.initialCollapsed === "true") {
      toggle.click();
    }
  });
}
export function renderStatus(state) {
  const label = state.roomCode ? `${state.connected ? "Firebase" : "Local"} - ${state.roomCode}` : "Sin sala";
  byId("connectionStatus").textContent = label;
  byId("playerRoomCode").textContent = state.roomCode || "----";
  byId("dmRoomCode").textContent = state.roomCode || "----";
}
export function toast(message) {
  const existing = $(".toast");
  if (existing) existing.remove();
  const element = document.createElement("div");
  element.className = "toast";
  element.textContent = message;
  document.body.append(element);
  setTimeout(() => element.remove(), 2600);
}

