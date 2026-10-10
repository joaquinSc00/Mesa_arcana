import { byId } from "./dom.js";

export function createNavigation({ store }) {
  const { state, ui: workspaceUi } = store;
  const views = { home: byId("homeView"), player: byId("playerView"), dm: byId("dmView"), board: byId("boardView") };
  function showRoleView() {
    if (state.role === "dm") showView("dm");
    else if (state.role === "board") showView("board");
    else showView("player");
  }

  function showView(name) {
    Object.values(views).forEach((view) => view.classList.remove("active"));
    views[name].classList.add("active");
    renderWorkspaceNavigation();
  }

  function renderWorkspaceNavigation() {
    document.querySelectorAll("[data-player-nav]").forEach((button) => {
      const active = button.dataset.playerNav === workspaceUi.playerPage;
      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });
    document.querySelectorAll("[data-player-section], [data-ready-section]").forEach((section) => {
      const page = section.dataset.playerSection || section.dataset.readySection;
      section.hidden = page !== workspaceUi.playerPage;
    });
    const playerTitles = { character: "Mi personaje", stats: "Estadisticas", inventory: "Inventario", notes: "Notas", dice: "Dados", session: "Partida" };
    byId("playerTitle").textContent = playerTitles[workspaceUi.playerPage];

    document.querySelectorAll("[data-dm-mode]").forEach((button) => {
      button.classList.toggle("active", button.dataset.dmMode === workspaceUi.dmMode);
    });
    document.querySelectorAll("[data-dm-nav-group]").forEach((group) => {
      group.hidden = group.dataset.dmNavGroup !== workspaceUi.dmMode;
    });
    document.querySelectorAll("[data-dm-nav]").forEach((button) => {
      const active = button.dataset.dmNav === workspaceUi.dmPage;
      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });
    document.querySelectorAll("[data-dm-section]").forEach((section) => {
      section.hidden = !section.dataset.dmSection.split(" ").includes(workspaceUi.dmPage);
    });
    const dmTitles = { table: "Mesa de control", scene: "Escena y tablero", combat: "Combate e iniciativa", actors: "Actores", rolls: "Tiradas y registro", characters: "Personajes", library: "Biblioteca", adventure: "Aventura", world: "Mundo y campaña", settings: "Configuración" };
    byId("dmTitle").textContent = dmTitles[workspaceUi.dmPage];
    byId("broadcastSceneButton").hidden = workspaceUi.dmPage !== "scene";
  }
  function bind() {
    document.querySelectorAll("[data-player-nav]").forEach(button => button.addEventListener("click", () => { workspaceUi.playerPage = button.dataset.playerNav; renderWorkspaceNavigation(); }));
    document.querySelectorAll("[data-dm-mode]").forEach(button => button.addEventListener("click", () => {
      workspaceUi.dmMode = button.dataset.dmMode; workspaceUi.dmPage = workspaceUi.dmMode === "live" ? "table" : "characters"; renderWorkspaceNavigation();
    }));
    document.querySelectorAll("[data-dm-nav]").forEach(button => button.addEventListener("click", () => { workspaceUi.dmPage = button.dataset.dmNav; renderWorkspaceNavigation(); }));
    document.querySelectorAll("[data-dm-goto]").forEach(button => button.addEventListener("click", () => {
      workspaceUi.dmMode = "live"; workspaceUi.dmPage = button.dataset.dmGoto; renderWorkspaceNavigation();
    }));
    byId("resetWorkspaceLayout").addEventListener("click", () => { workspaceUi.dmMode = "live"; workspaceUi.dmPage = "table"; renderWorkspaceNavigation(); });
  }
  return { bind, showView, showRoleView, render: renderWorkspaceNavigation };
}
