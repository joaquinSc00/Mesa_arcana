const ROOT_PATH = window.MESA_ARCANA_ROOT || "mesaArcana/rooms";
const firebaseConfig = window.MESA_ARCANA_FIREBASE_CONFIG;
const system = window.MESA_ARCANA_SYSTEM;
const attributes = system.attributes;
const skills = system.skills;

const baseState = {
  roomCode: "",
  role: "",
  participantId: "",
  participantName: "",
  room: null,
  database: null,
  roomRef: null,
  connected: false,
  unsubscribe: null,
  hasShownRole: false,
  activeLibrary: "enemies",
  localBonus: emptyAttributeMap(),
  skillTraining: emptySkillMap()
};

let state = { ...baseState };

const $ = (selector) => document.querySelector(selector);
const byId = (id) => document.getElementById(id);

const views = {
  home: byId("homeView"),
  player: byId("playerView"),
  dm: byId("dmView"),
  board: byId("boardView")
};

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

function init() {
  hydrateIcons();
  fillSelects();
  bindEvents();

  const params = new URLSearchParams(window.location.search);
  if (params.get("room")) {
    const role = params.get("role") || "board";
    connectToRoom(params.get("room"), role, role === "board" ? "Tablero" : "Invitado", crypto.randomUUID());
    return;
  }

  restoreSession();
  if (!state.roomCode) showView("home");
}

function hydrateIcons() {
  document.querySelectorAll("[data-icon]").forEach((element) => {
    element.textContent = icons[element.dataset.icon] || "-";
  });
}

function fillSelects() {
  fillSelect(byId("lineageSelect"), system.lineages);
  fillSelect(byId("classSelect"), system.classes);
  fillSelect(byId("backgroundSelect"), system.backgrounds);
}

function fillSelect(select, options) {
  Object.entries(options).forEach(([key, value]) => {
    select.append(new Option(value.name, key));
  });
}

function bindEvents() {
  byId("createRoomForm").addEventListener("submit", createRoom);
  byId("joinRoomForm").addEventListener("submit", joinRoom);
  byId("goHomeButton").addEventListener("click", () => {
    state.hasShownRole = true;
    showView("home");
  });
  byId("copyRoomButton").addEventListener("click", copyRoomCode);
  byId("openBoardButton").addEventListener("click", openBoard);
  byId("saveCharacterButton").addEventListener("click", saveCharacter);
  byId("resetAttributesButton").addEventListener("click", resetCharacterBuild);
  byId("lineageSelect").addEventListener("change", refreshCharacterPreview);
  byId("classSelect").addEventListener("change", refreshCharacterPreview);
  byId("backgroundSelect").addEventListener("change", refreshCharacterPreview);
  byId("characterNameInput").addEventListener("input", refreshCharacterPreview);
  byId("broadcastSceneButton").addEventListener("click", saveScene);
  byId("sceneForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveScene();
  });
  byId("startCombatButton").addEventListener("click", startCombat);
  byId("nextTurnButton").addEventListener("click", nextTurn);
  document.querySelectorAll("[data-library-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeLibrary = button.dataset.libraryTab;
      renderDmLibrary();
    });
  });
  byId("toggleBoardScaleButton").addEventListener("click", () => byId("boardShell").classList.toggle("focused"));
}

function restoreSession() {
  const saved = readLocal("mesaArcanaSession");
  if (!saved || !saved.roomCode || !saved.role) return;
  state = { ...state, ...saved };
  connectToRoom(saved.roomCode, saved.role, saved.participantName, saved.participantId);
}

function createRoom(event) {
  event.preventDefault();
  const campaignName = byId("campaignNameInput").value.trim() || "Aventura sin nombre";
  const hostName = byId("hostNameInput").value.trim() || "Director";
  const roomCode = generateRoomCode();

  connectToRoom(roomCode, "dm", hostName, crypto.randomUUID(), {
    campaignName,
    createdAt: Date.now(),
    scene: {
      title: "Mesa preparada",
      description: "Los personajes todavia estan llegando a la primera escena.",
      mode: "wide"
    },
    characters: {},
    enemies: {},
    npcs: {},
    objects: {},
    rolls: {},
    combat: { active: false, order: [], currentIndex: 0 }
  });
}

function joinRoom(event) {
  event.preventDefault();
  const roomCode = normalizeRoomCode(byId("roomCodeInput").value);
  const name = byId("participantNameInput").value.trim() || "Invitado";
  const role = new FormData(event.currentTarget).get("joinRole");

  if (!roomCode) {
    toast("Escribi un codigo de sala.");
    return;
  }

  connectToRoom(roomCode, role, name, crypto.randomUUID());
}

async function connectToRoom(roomCode, role, participantName, participantId, initialRoom = null) {
  state.roomCode = normalizeRoomCode(roomCode);
  state.role = role;
  state.participantName = participantName;
  state.participantId = participantId || crypto.randomUUID();
  state.hasShownRole = false;

  writeLocal("mesaArcanaSession", {
    roomCode: state.roomCode,
    role: state.role,
    participantName: state.participantName,
    participantId: state.participantId
  });

  if (!window.firebase || !firebaseConfig) {
    state.room = initialRoom || buildOfflineRoom();
    state.connected = false;
    renderAll();
    showRoleView();
    toast("Modo local: falta Firebase.");
    return;
  }

  try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    if (firebase.auth && !firebase.auth().currentUser) {
      try {
        await firebase.auth().signInAnonymously();
      } catch (authError) {
        console.warn("Firebase anonymous auth unavailable:", authError?.message || authError);
      }
    }

    state.database = firebase.database();
    state.roomRef = state.database.ref(`${ROOT_PATH}/${state.roomCode}`);

    if (initialRoom) await state.roomRef.set(initialRoom);
    if (state.unsubscribe) state.unsubscribe();

    state.roomRef.on("value", (snapshot) => {
      state.room = snapshot.val() || buildOfflineRoom();
      state.connected = true;
      renderAll();
      if (!state.hasShownRole) {
        state.hasShownRole = true;
        showRoleView();
      }
    }, () => {
      state.connected = false;
      state.room = state.room || buildOfflineRoom();
      renderAll();
      if (!state.hasShownRole) {
        state.hasShownRole = true;
        showRoleView();
      }
      toast("No pude conectar con Firebase.");
    });
    state.unsubscribe = () => state.roomRef.off();
  } catch (error) {
    console.warn("Firebase sync disabled:", error?.message || error);
    state.roomRef = null;
    state.room = initialRoom || buildOfflineRoom();
    state.connected = false;
    renderAll();
    showRoleView();
    toast("Firebase no inicio. La mesa queda local.");
  }
}

function showRoleView() {
  if (state.role === "dm") showView("dm");
  else if (state.role === "board") showView("board");
  else showView("player");
}

function showView(name) {
  Object.values(views).forEach((view) => view.classList.remove("active"));
  views[name].classList.add("active");
}

function renderAll() {
  renderStatus();
  renderAttributes();
  renderSkills();
  renderQuickRolls();
  renderCharacterForm();
  renderDm();
  renderBoard();
}

function renderStatus() {
  const label = state.roomCode ? `${state.connected ? "Firebase" : "Local"} - ${state.roomCode}` : "Sin sala";
  byId("connectionStatus").textContent = label;
  byId("playerRoomCode").textContent = state.roomCode || "----";
  byId("dmRoomCode").textContent = state.roomCode || "----";
}

function renderAttributes() {
  const grid = byId("attributesGrid");
  grid.innerHTML = "";
  const totals = getAttributeTotals();
  byId("freePointsValue").textContent = String(getFreePoints());

  attributes.forEach((attribute) => {
    const card = document.createElement("div");
    card.className = "attribute-card";
    card.innerHTML = `
      <h3>${attribute.name}</h3>
      <small>${attribute.hint}</small>
      <div class="attribute-control">
        <button type="button" aria-label="Bajar ${attribute.name}">-</button>
        <strong>${totals[attribute.key]}</strong>
        <button type="button" aria-label="Subir ${attribute.name}">+</button>
      </div>
    `;
    const [minus, plus] = card.querySelectorAll("button");
    minus.addEventListener("click", () => changeLocalBonus(attribute.key, -1));
    plus.addEventListener("click", () => changeLocalBonus(attribute.key, 1));
    grid.append(card);
  });
}

function renderSkills() {
  const grid = byId("skillsGrid");
  grid.innerHTML = "";
  const free = getFreeSkillPoints();
  byId("skillPointsValue").textContent = String(free);
  const freeSkills = getGrantedSkills();

  skills.forEach((skill) => {
    const trained = state.skillTraining[skill.key] || 0;
    const granted = freeSkills.has(skill.key);
    const card = document.createElement("div");
    card.className = "skill-card";
    card.innerHTML = `
      <div>
        <strong>${skill.name}</strong>
        <small>${skill.attributes.map(getAttributeName).join(" / ")}${granted ? " - inicial" : ""}</small>
      </div>
      <button type="button" aria-label="Alternar ${skill.name}">${trained || granted ? "✓" : "+"}</button>
    `;
    card.querySelector("button").addEventListener("click", () => toggleSkillTraining(skill.key));
    grid.append(card);
  });
}

function renderQuickRolls() {
  const container = byId("playerQuickRolls");
  container.innerHTML = "";

  [20, 12, 10, 8, 6, 4].forEach((die) => {
    const button = document.createElement("button");
    button.className = "secondary-button";
    button.type = "button";
    button.innerHTML = `<span>Dado libre</span><strong>d${die}</strong>`;
    button.addEventListener("click", () => rollFreeDie(die));
    container.append(button);
  });

  attributes.forEach((attribute) => {
    const button = document.createElement("button");
    button.className = "secondary-button";
    button.type = "button";
    button.innerHTML = `<span>${attribute.name}</span><strong>d20</strong>`;
    button.addEventListener("click", () => rollAttributeCheck(attribute.key));
    container.append(button);
  });
}

function renderCharacterForm() {
  if (state.role !== "player" || !state.room) return;
  const character = state.room.characters?.[state.participantId];
  if (!character) {
    refreshCharacterPreview();
    return;
  }

  byId("characterNameInput").value = character.name || "";
  byId("lineageSelect").value = character.lineage || "human";
  byId("classSelect").value = character.classKey || character.archetype || "guardian";
  byId("backgroundSelect").value = character.background || "fallen_noble";
  state.localBonus = { ...emptyAttributeMap(), ...(character.localBonus || {}) };
  state.skillTraining = { ...emptySkillMap(), ...(character.skillTraining || {}) };
  byId("hpCurrentInput").value = character.hpCurrent ?? character.derived?.hpMax ?? 12;
  byId("manaCurrentInput").value = character.manaCurrent ?? character.derived?.manaMax ?? 4;
  byId("characterNotesInput").value = character.notes || "";
  refreshCharacterPreview();
}

function renderDm() {
  if (!state.room) return;
  const characters = Object.entries(state.room.characters || {});
  const enemies = Object.entries(state.room.enemies || {});
  const npcs = Object.entries(state.room.npcs || {});
  const objects = Object.entries(state.room.objects || {});

  byId("sceneTitleInput").value = state.room.scene?.title || "";
  byId("sceneDescriptionInput").value = state.room.scene?.description || "";
  byId("sceneModeSelect").value = state.room.scene?.mode || "wide";
  byId("dmCharactersList").innerHTML = renderEntityList(characters, "character");
  byId("dmEnemiesList").innerHTML = renderEntityList(enemies, "enemy");
  byId("dmNpcsList").innerHTML = renderEntityList(npcs, "npc");
  byId("dmObjectsList").innerHTML = renderEntityList(objects, "object");
  renderDmLibrary();
  attachEntityActions();
}

function renderEntityList(entries, type) {
  if (!entries.length) return `<div class="entity-item"><span>No hay ${getEntityPlural(type)}.</span></div>`;

  return entries.map(([id, item]) => `
    <div class="entity-item" data-entity-id="${id}" data-entity-type="${type}">
      <strong>${item.name || "Sin nombre"}</strong>
      <span>${getEntitySubtitle(item, type)}</span>
      ${renderEntityMeta(item, type)}
      <div class="entity-actions">
        ${type !== "object" ? '<button type="button" data-action="damage">-1 vida</button><button type="button" data-action="heal">+1 vida</button><button type="button" data-action="turn">Turno</button>' : ""}
        ${type !== "character" ? '<button type="button" data-action="remove">Quitar</button>' : ""}
      </div>
    </div>
  `).join("");
}

function renderDmLibrary() {
  const container = byId("dmLibraryList");
  if (!container) return;

  document.querySelectorAll("[data-library-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.libraryTab === state.activeLibrary);
  });

  const cards = system.cardLibrary[state.activeLibrary] || [];
  container.innerHTML = cards.map((card, index) => `
    <div class="library-card">
      <strong>${card.name}</strong>
      <p>${card.type || card.role || card.threat || "Tarjeta"} - ${card.description || card.attitude || ""}</p>
      <div class="entity-actions">
        <button type="button" data-library-kind="${state.activeLibrary}" data-library-index="${index}">Mostrar</button>
      </div>
    </div>
  `).join("");

  container.querySelectorAll("[data-library-kind]").forEach((button) => {
    button.addEventListener("click", () => showLibraryCard(button.dataset.libraryKind, Number(button.dataset.libraryIndex)));
  });
}

function attachEntityActions() {
  document.querySelectorAll("[data-entity-id] button").forEach((button) => {
    button.addEventListener("click", () => {
      const row = button.closest("[data-entity-id]");
      updateEntity(row.dataset.entityType, row.dataset.entityId, button.dataset.action);
    });
  });

}

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
  byId("playerTurnName").textContent = currentName || "Sin combate";

  renderTokens();
  renderRolls();
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
    token.className = `token ${type === "enemy" ? "enemy" : ""}`;
    token.textContent = initials(item.name || "?");
    token.style.left = `${10 + (index % 5) * 16}%`;
    token.style.top = `${14 + Math.floor(index / 5) * 18}%`;
    token.title = item.name || id;
    layer.append(token);
  });
}

function renderRolls() {
  const feed = byId("rollFeed");
  const rolls = Object.entries(state.room.rolls || {}).sort((a, b) => b[1].createdAt - a[1].createdAt).slice(0, 8);
  feed.innerHTML = rolls.length ? rolls.map(([id, roll]) => {
    const breakdown = roll.breakdown || [];
    return `
      <div class="roll-item" data-roll-id="${id}">
        <strong>${roll.total}</strong>
        <span>${roll.actor} - ${roll.label}</span>
        <div class="roll-breakdown">
          ${breakdown.map((part) => `<span>${part.label}: ${formatBonus(part.value)}</span>`).join("")}
        </div>
        <span class="resolution-pill">Anotacion para el DM</span>
      </div>
    `;
  }).join("") : `<div class="roll-item"><span>Todavia no hubo tiradas.</span></div>`;
}

function refreshCharacterPreview() {
  const name = byId("characterNameInput").value.trim();
  byId("characterPortrait").textContent = initials(name || state.participantName || "?");
  renderAttributes();
  renderSkills();
  const stats = calculateDerivedStats();
  byId("hpMaxInput").value = stats.hpMax;
  if (!byId("hpCurrentInput").value) byId("hpCurrentInput").value = stats.hpMax;
  byId("manaMaxInput").value = stats.manaMax;
  if (!byId("manaCurrentInput").value) byId("manaCurrentInput").value = stats.manaMax;
  byId("defenseInput").value = stats.defense;
  byId("initiativeInput").value = stats.initiative;
}

function changeLocalBonus(key, delta) {
  const current = state.localBonus[key] || 0;
  if (delta > 0 && getFreePoints() <= 0) return;
  if (delta < 0 && current <= 0) return;
  state.localBonus[key] = current + delta;
  refreshCharacterPreview();
}

function toggleSkillTraining(key) {
  const current = state.skillTraining[key] || 0;
  if (current > 0) state.skillTraining[key] = 0;
  else if (getFreeSkillPoints() > 0) state.skillTraining[key] = 1;
  refreshCharacterPreview();
}

function resetCharacterBuild() {
  state.localBonus = emptyAttributeMap();
  state.skillTraining = emptySkillMap();
  refreshCharacterPreview();
}

function saveCharacter() {
  const totals = getAttributeTotals();
  const derived = calculateDerivedStats();
  const lineageKey = byId("lineageSelect").value;
  const classKey = byId("classSelect").value;
  const backgroundKey = byId("backgroundSelect").value;
  const traits = getTraitKeys(lineageKey, classKey, backgroundKey);

  const character = {
    id: state.participantId,
    name: byId("characterNameInput").value.trim() || state.participantName,
    playerName: state.participantName,
    lineage: lineageKey,
    lineageName: system.lineages[lineageKey].name,
    classKey,
    className: system.classes[classKey].name,
    background: backgroundKey,
    backgroundName: system.backgrounds[backgroundKey].name,
    localBonus: state.localBonus,
    skillTraining: state.skillTraining,
    grantedSkills: [...getGrantedSkills()],
    attributes: totals,
    skills: getSkillBonuses(),
    traits,
    traitNames: traits.map((key) => system.traits[key]?.name).filter(Boolean),
    derived,
    hpCurrent: Number(byId("hpCurrentInput").value || derived.hpMax),
    manaCurrent: Number(byId("manaCurrentInput").value || derived.manaMax),
    notes: byId("characterNotesInput").value.trim(),
    updatedAt: Date.now()
  };

  if (!state.roomRef) {
    state.room.characters = state.room.characters || {};
    state.room.characters[state.participantId] = character;
    renderAll();
    toast("Ficha guardada en esta pantalla.");
    return;
  }

  state.roomRef.child(`characters/${state.participantId}`).set(character);
  toast("Ficha guardada.");
}

function saveScene() {
  const scene = {
    title: byId("sceneTitleInput").value.trim() || "Escena sin titulo",
    description: byId("sceneDescriptionInput").value.trim(),
    mode: byId("sceneModeSelect").value,
    updatedAt: Date.now()
  };

  if (!state.roomRef) {
    state.room.scene = scene;
    renderAll();
    toast("Escena actualizada en esta pantalla.");
    return;
  }

  state.roomRef.child("scene").set(scene);
  toast("Escena enviada al tablero.");
}

function updateEntity(type, id, action) {
  const collection = getCollectionForType(type);
  const entity = state.room[collection]?.[id];
  if (!entity) return;

  if (action === "remove") {
    if (state.roomRef) state.roomRef.child(`${collection}/${id}`).remove();
    else {
      delete state.room[collection][id];
      renderAll();
    }
    return;
  }

  if (action === "turn") {
    const order = state.room.combat?.order || [];
    const index = order.indexOf(id);
    const combat = {
      active: true,
      order: index >= 0 ? order : [...order, id],
      currentIndex: index >= 0 ? index : order.length
    };
    if (state.roomRef) state.roomRef.child("combat").update(combat);
    else {
      state.room.combat = { ...(state.room.combat || {}), ...combat };
      renderAll();
    }
    return;
  }

  const nextHp = Math.max(0, Number(entity.hpCurrent ?? entity.hp ?? entity.derived?.hpMax ?? 0) + (action === "heal" ? 1 : -1));
  if (state.roomRef) state.roomRef.child(`${collection}/${id}/hpCurrent`).set(nextHp);
  else {
    state.room[collection][id].hpCurrent = nextHp;
    renderAll();
  }
}

function startCombat() {
  const characterIds = Object.keys(state.room?.characters || {});
  const enemyIds = Object.keys(state.room?.enemies || {});
  const npcIds = Object.keys(state.room?.npcs || {});
  const order = [...characterIds, ...enemyIds, ...npcIds];
  if (!order.length) {
    toast("No hay participantes para ordenar.");
    return;
  }

  const combat = { active: true, order, currentIndex: 0, startedAt: Date.now() };
  if (state.roomRef) state.roomRef.child("combat").set(combat);
  else {
    state.room.combat = combat;
    renderAll();
  }
}

function nextTurn() {
  const combat = state.room?.combat;
  if (!combat?.order?.length) return;
  const currentIndex = ((combat.currentIndex || 0) + 1) % combat.order.length;
  if (state.roomRef) state.roomRef.child("combat/currentIndex").set(currentIndex);
  else {
    state.room.combat.currentIndex = currentIndex;
    renderAll();
  }
}

function rollFreeDie(dieSize) {
  const die = randomInt(1, dieSize);
  writeRoll({
    id: `${Date.now()}-${state.participantId}`,
    actor: getCurrentActorName(),
    actorId: state.participantId,
    label: `Dado libre d${dieSize}`,
    die,
    total: die,
    breakdown: [{ label: `d${dieSize}`, value: die }],
    note: "Tirada libre. El DM decide si importa y como se interpreta.",
    createdAt: Date.now()
  });
}

function rollAttributeCheck(attributeKey) {
  const character = state.room?.characters?.[state.participantId];
  if (!character) {
    toast("Guarda la ficha antes de tirar.");
    return;
  }
  const die = randomInt(1, 20);
  const attributeBonus = getAttributeModifier(character.attributes?.[attributeKey] || 0);
  const breakdown = [
    { label: "d20", value: die },
    { label: getAttributeName(attributeKey), value: attributeBonus }
  ];

  const total = breakdown.reduce((sum, part) => sum + Number(part.value || 0), 0);
  writeRoll({
    id: `${Date.now()}-${state.participantId}`,
    actor: character.name || state.participantName,
    actorId: state.participantId,
    label: `Consulta de ${getAttributeName(attributeKey)}`,
    attributeKey,
    die,
    total,
    breakdown,
    note: "Consulta rapida. No resuelve una accion por si sola.",
    createdAt: Date.now()
  });
}

function writeRoll(roll) {
  if (state.roomRef) state.roomRef.child(`rolls/${roll.id}`).set(roll);
  else {
    state.room.rolls = state.room.rolls || {};
    state.room.rolls[roll.id] = roll;
    renderAll();
  }
}

function showLibraryCard(kind, index) {
  const card = system.cardLibrary[kind]?.[index];
  if (!card) return;

  const type = kind === "enemies" ? "enemy" : kind === "npcs" ? "npc" : "object";
  const collection = getCollectionForType(type);
  const id = `${type}-${crypto.randomUUID()}`;
  const entity = normalizeLibraryEntity(card, type, id);

  if (state.roomRef) state.roomRef.child(`${collection}/${id}`).set(entity);
  else {
    state.room[collection] = state.room[collection] || {};
    state.room[collection][id] = entity;
    renderAll();
  }
}

function normalizeLibraryEntity(card, type, id) {
  const hp = Number(card.hp || 0);
  return {
    id,
    visible: true,
    cardType: type,
    name: card.name,
    kind: card.type || card.role || card.threat || "Tarjeta",
    threat: card.threat || "",
    role: card.role || "",
    attitude: card.attitude || "",
    description: card.description || "",
    notes: card.notes || card.secrets || "",
    stats: card.stats || {},
    hp,
    hpCurrent: hp,
    hpMax: hp,
    createdAt: Date.now()
  };
}

function getCollectionForType(type) {
  if (type === "enemy") return "enemies";
  if (type === "npc") return "npcs";
  if (type === "object") return "objects";
  return "characters";
}

function getEntityPlural(type) {
  if (type === "enemy") return "enemigos visibles";
  if (type === "npc") return "NPCs visibles";
  if (type === "object") return "objetos visibles";
  return "personajes";
}

function getEntitySubtitle(item, type) {
  if (type === "character") return `${item.className || "Personaje"} - Vida ${item.hpCurrent ?? "?"}/${item.derived?.hpMax ?? item.hpMax ?? "?"}`;
  if (type === "enemy") return `${item.kind || "Enemigo"} ${item.threat ? `- amenaza ${item.threat}` : ""} - Vida ${item.hpCurrent ?? item.hp ?? "?"}/${item.hpMax ?? item.hp ?? "?"}`;
  if (type === "npc") return `${item.role || "NPC"} ${item.attitude ? `- ${item.attitude}` : ""}`;
  return `${item.kind || "Objeto"} - visible en tablero`;
}

function renderEntityMeta(item, type) {
  const stats = item.stats || {};
  const statText = Object.entries(stats)
    .map(([key, value]) => `${getAttributeName(key)} ${value}`)
    .join(" · ");
  const lines = [
    item.description,
    statText,
    type !== "character" && item.notes ? `Notas DM: ${item.notes}` : ""
  ].filter(Boolean);
  return lines.length ? `<div class="entity-meta">${lines.map((line) => `<span>${line}</span>`).join("")}</div>` : "";
}


function getAttributeTotals() {
  const classDef = system.classes[byId("classSelect").value] || system.classes.guardian;
  const lineage = system.lineages[byId("lineageSelect").value] || system.lineages.human;

  return Object.fromEntries(attributes.map((attribute) => {
    const total = system.baseAttribute
      + (classDef.bonuses[attribute.key] || 0)
      + (lineage.bonuses[attribute.key] || 0)
      + (state.localBonus[attribute.key] || 0);
    return [attribute.key, total];
  }));
}

function getSkillBonuses() {
  const granted = getGrantedSkills();
  return Object.fromEntries(skills.map((skill) => {
    const trained = state.skillTraining[skill.key] ? system.skillTrainingBonus : 0;
    const initial = granted.has(skill.key) ? system.skillTrainingBonus : 0;
    return [skill.key, Math.max(trained, initial)];
  }));
}

function getGrantedSkills() {
  const lineage = system.lineages[byId("lineageSelect").value] || system.lineages.human;
  const classDef = system.classes[byId("classSelect").value] || system.classes.guardian;
  const background = system.backgrounds[byId("backgroundSelect").value] || system.backgrounds.fallen_noble;
  return new Set([...(lineage.skills || []), ...(classDef.skills || []), ...(background.skills || [])]);
}

function getTraitKeys(lineageKey, classKey, backgroundKey) {
  const lineage = system.lineages[lineageKey] || system.lineages.human;
  const classDef = system.classes[classKey] || system.classes.guardian;
  const background = system.backgrounds[backgroundKey] || system.backgrounds.fallen_noble;
  return [...new Set([...(lineage.traits || []), ...(classDef.traits || []), ...(background.traits || [])])];
}

function getFreePoints() {
  const spent = Object.values(state.localBonus).reduce((sum, value) => sum + Number(value || 0), 0);
  return Math.max(0, system.freeAttributePoints - spent);
}

function getFreeSkillPoints() {
  const spent = Object.values(state.skillTraining).reduce((sum, value) => sum + Number(value || 0), 0);
  return Math.max(0, system.freeSkillPoints - spent);
}

function calculateDerivedStats() {
  const totals = getAttributeTotals();
  const classDef = system.classes[byId("classSelect").value] || system.classes.guardian;
  return {
    hpMax: classDef.hpBase + totals.resistencia + Math.floor(totals.voluntad / 2),
    manaMax: classDef.manaBase + totals.afinidad + Math.floor(totals.voluntad / 2),
    defense: 10 + getAttributeModifier(totals.agilidad) + Math.floor(getAttributeModifier(totals.resistencia) / 2),
    initiative: getAttributeModifier(totals.agilidad) + Math.floor(getAttributeModifier(totals.percepcion) / 2)
  };
}

function getAttributeModifier(value) {
  return Math.floor(Number(value || 0) / 2);
}

function getEntityName(id) {
  return state.room?.characters?.[id]?.name || state.room?.enemies?.[id]?.name || "";
}

function getAttributeName(key) {
  return attributes.find((attribute) => attribute.key === key)?.name || key;
}

function getSkillName(key) {
  return skills.find((skill) => skill.key === key)?.name || key;
}

function getCurrentActorName() {
  return state.room?.characters?.[state.participantId]?.name || state.participantName || "Jugador";
}

function formatBonus(value) {
  return Number(value || 0) >= 0 ? `+${value}` : String(value);
}

function emptyAttributeMap() {
  return Object.fromEntries((window.MESA_ARCANA_SYSTEM?.attributes || []).map((attribute) => [attribute.key, 0]));
}

function emptySkillMap() {
  return Object.fromEntries((window.MESA_ARCANA_SYSTEM?.skills || []).map((skill) => [skill.key, 0]));
}

function copyRoomCode() {
  if (!state.roomCode) return;
  navigator.clipboard?.writeText(state.roomCode);
  toast(`Codigo copiado: ${state.roomCode}`);
}

function openBoard() {
  if (!state.roomCode) return;
  const url = new URL(window.location.href);
  url.searchParams.set("room", state.roomCode);
  url.searchParams.set("role", "board");
  window.open(url.toString(), "_blank", "noopener");
}

function generateRoomCode() {
  const words = ["LUNA", "FORJA", "NEXO", "BRUMA", "RUNA", "ASTRO", "HIERRO"];
  return `${words[randomInt(0, words.length - 1)]}-${randomInt(100, 999)}`;
}

function normalizeRoomCode(value) {
  return String(value || "").trim().toUpperCase();
}

function initials(value) {
  return String(value || "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildOfflineRoom() {
  return {
    campaignName: "Mesa local",
    scene: { title: "Mesa local", description: "La sincronizacion todavia no esta conectada.", mode: "wide" },
    characters: {},
    enemies: {},
    npcs: {},
    objects: {},
    rolls: {},
    combat: { active: false, order: [], currentIndex: 0 }
  };
}

function readLocal(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function toast(message) {
  const existing = $(".toast");
  if (existing) existing.remove();
  const element = document.createElement("div");
  element.className = "toast";
  element.textContent = message;
  document.body.append(element);
  setTimeout(() => element.remove(), 2600);
}

init();
