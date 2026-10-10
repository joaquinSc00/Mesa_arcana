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

