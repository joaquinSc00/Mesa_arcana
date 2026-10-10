import { createStore } from "./core/state.js";
import { createStorage } from "./core/storage.js";
import { createFirebaseSync } from "./core/firebase.js?v=modules-1";
import { createRoomActions } from "./features/rooms.js";
import { createCharacterActions } from "./features/characters.js";
import { createCombatActions } from "./features/combat.js";
import { createDiceActions } from "./features/dice.js";
import { createSceneActions } from "./features/scenes.js";
import { createEntityActions } from "./features/entities.js";
import { createLibraryActions } from "./features/library.js";
import { createMapActions } from "./features/map-sync.js";
import { createMap } from "./map.js";
import { createNavigation } from "./ui/navigation.js";
import { createHomeView } from "./ui/home.js";
import { createPlayerView } from "./ui/player.js";
import { createDmView } from "./ui/dm.js";
import { createAdventurePlanner } from "./ui/adventure-planner.js";
import { createBoardView } from "./ui/board.js";
import { hydrateIcons, setupCollapsiblePanels, renderStatus, toast } from "./ui/components.js";
import { bindEntityInspection } from "./v3-ui.js";

export function createApplication({ sdk = globalThis.firebase, storage = createStorage(),
  dialogs = { prompt: (...args) => globalThis.prompt(...args) } } = {}) {
  const store = createStore();
  const sync = createFirebaseSync({ store, storage, sdk });
  const dependencies = { store, sync, storage, dialogs };
  const combat = createCombatActions(dependencies);
  const actions = {
    rooms: createRoomActions(dependencies), characters: createCharacterActions(dependencies), combat,
    dice: createDiceActions(dependencies), scenes: createSceneActions(dependencies),
    entities: createEntityActions({ ...dependencies, combat }), library: createLibraryActions(dependencies),
    map: createMapActions(dependencies)
  };
  const map = createMap();
  const planner = createAdventurePlanner({store, actions});
  const navigation = createNavigation({ store });
  const views = {
    home: createHomeView({ store, sync, actions, navigation }), player: createPlayerView({ store, actions }),
    dm: createDmView({ store, actions }), board: createBoardView({ store, actions, map })
  };
  function renderAll() {
    renderStatus(store.state); views.player.render(); views.dm.render(); views.board.render(); navigation.render();
  }
  const subscriptions = [
    store.on("notice", toast), store.on("build:changed", views.player.refreshCharacterPreview),
    store.on("rooms:changed", views.home.loadActiveRooms), store.on("session:cleared", () => navigation.showView("home")),
    store.on("room:changed", () => {
      renderAll();
      if (!store.state.hasShownRole) { store.state.hasShownRole = true; navigation.showRoleView(); }
    })
  ];
  function init() {
    hydrateIcons(); Object.values(views).forEach(view => view.bind()); navigation.bind();
    planner.bind(); map.init(); setupCollapsiblePanels(); bindEntityInspection();
    const params = new URLSearchParams(window.location.search);
    if (params.get("room")) {
      const role = params.get("role") || "board";
      return sync.connectToRoom(params.get("room"), role, role === "board" ? "Tablero" : "Invitado", crypto.randomUUID());
    }
    actions.rooms.restoreSession();
    if (!store.state.roomCode) navigation.showView("home");
    return views.home.loadActiveRooms();
  }
  function dispose() { sync.disconnect(); subscriptions.forEach(unsubscribe => unsubscribe()); }
  return { init, dispose, store, sync, actions, views, navigation };
}
