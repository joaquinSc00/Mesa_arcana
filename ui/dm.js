import { system } from "../game-system.js?v=modules-1";
import { getEntityName as entityName } from "../domain/entities.js";
import { getAttributeName, getSkillName, getFocusFilter } from "../domain/character-rules.js";
import { byId } from "./dom.js";
import { renderRolls } from "./rolls.js";

export function createDmView({ store, actions }) {
  const { state } = store;
  const getEntityName = (id) => entityName(state.room, id);
  const showLibraryCard = actions.library.showLibraryCard;
  const updateEntity = actions.entities.updateEntity;
  let selectedActor = null;
  const avatarSrc = (item) => /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(item?.avatar || "") ? item.avatar : "";
  function imageAvatar(item, cls = "") {
    const src = avatarSrc(item);
    return src ? `<img class="dm-custom-avatar ${cls}" src="${src}" alt="" loading="lazy">` : "";
  }
  async function compressAvatar(file) {
    if (!file.type.startsWith("image/")) throw new Error("Seleccioná una imagen JPG, PNG o WebP.");
    if (file.size > 8 * 1024 * 1024) throw new Error("La imagen supera el límite de 8 MB.");
    const bitmap = await createImageBitmap(file);
    try {
      const side = 256;
      const ratio = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#222437";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      let data = canvas.toDataURL("image/jpeg", .78);
      if (data.length > 130000) data = canvas.toDataURL("image/jpeg", .55);
      if (data.length > 130000) throw new Error("No fue posible reducir la imagen lo suficiente.");
      return data;
    } finally { bitmap.close(); }
  }
  async function chooseAvatar() {
    if (!selectedActor) return;
    const actorRef = { ...selectedActor };
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/png,image/jpeg,image/webp";
    input.addEventListener("change", async () => {
      if (!input.files?.[0]) return;
      try {
        const avatar = await compressAvatar(input.files[0]);
        await actions.entities.setAvatar(actorRef.type, actorRef.id, avatar);
      } catch (error) { window.alert(error?.message || "No se pudo guardar el retrato."); }
    }, { once: true });
    input.click();
  }
  const portraits = {character:"🛡️", enemy:"⚔️", npc:"🧙", object:"📜"};
  function avatarMarkup(item, type, extra = "") {
    const kind = type === "character" && /arcan|mago|hechi|tecnom/i.test(item.className || item.class || "") ? "✨" : portraits[type] || "◆";
    return `<span class="dm-avatar-art dm-avatar-${type} ${extra}" aria-hidden="true">${imageAvatar(item) || `<span>${kind}</span>`}</span>`;
  }
  function escapeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function renderRoster(characters) {
    const root = byId("dmPartyRoster");
    if (!root) return;
    root.innerHTML = characters.length ? characters.map(([id, a]) => {
      const hpMax = Math.max(1, Number(a.hpMax ?? a.derived?.hpMax ?? 1));
      const hp = Math.max(0, Number(a.hpCurrent ?? hpMax));
      const pc = Math.max(0, Math.min(100, hp / hpMax * 100));
      return `<button type="button" class="dm-roster-card" data-roster-id="${escapeText(id)}" aria-label="Inspeccionar ${escapeText(a.name)}">${avatarMarkup(a,"character")}<span class="dm-roster-copy"><strong>${escapeText(a.name || "Personaje")}</strong><small>${escapeText(a.className || "Aventurero")} · ${hp}/${hpMax} PV</small><span class="dm-resource-track"><i style="width:${pc}%"></i></span></span><span class="dm-roster-open">↗</span></button>`;
    }).join("") : '<p class="quiet-hint">Todavía no hay personajes en la sala.</p>';
  }
  function applyPreferences() {
    const compact = byId("dmCompactCards")?.checked;
    const descriptions = byId("dmShowDescriptions")?.checked;
    byId("dmView").classList.toggle("dm-cards-compact", !!compact);
    byId("dmView").classList.toggle("dm-hide-descriptions", descriptions === false);
  }
  function renderDm() {
    if (!state.room) return;
    const characters = Object.entries(state.room.characters || {});
    const enemies = Object.entries(state.room.enemies || {});
    const npcs = Object.entries(state.room.npcs || {});
    const objects = Object.entries(state.room.objects || {});

    // Resumen de solo lectura: no altera el estado sincronizado ni los formularios.
    byId("dmHomeScene").textContent = state.room.scene?.title || "Sin escena";
    const order = state.room.combat?.order || [];
    const currentActor = order[state.room.combat?.currentIndex || 0];
    byId("dmHomeTurn").textContent = state.room.combat?.active ? (getEntityName(currentActor) || "Sin turno") : "Sin combate";
    byId("dmHomeCharacters").textContent = String(characters.length);
    byId("dmHomeEntities").textContent = String(enemies.length + npcs.length + objects.length);
    const combatOrder = byId("dmCombatOrder");
    combatOrder.replaceChildren();
    order.forEach((id, index) => {
      const el = document.createElement("button");
      el.type = "button";
      el.dataset.combatId = id;
      el.className = "order-person" + (index === (state.room.combat?.currentIndex || 0) ? " active" : "");
      el.textContent = `${index + 1}. ${getEntityName(id) || "Actor retirado"} ↗`;
      combatOrder.append(el);
    });
    byId("sceneTitleInput").value = state.room.scene?.title || "";
    byId("sceneDescriptionInput").value = state.room.scene?.description || "";
    byId("sceneModeSelect").value = state.room.scene?.mode || "wide";
    byId("dmCharactersList").innerHTML = renderEntityList(characters, "character");
    byId("dmEnemiesList").innerHTML = renderEntityList(enemies, "enemy");
    byId("dmNpcsList").innerHTML = renderEntityList(npcs, "npc");
    byId("dmObjectsList").innerHTML = renderEntityList(objects, "object");
    renderRoster(characters);
    renderDmLibrary();
    renderDmFocus();
    attachEntityActions();
    renderInspector();
    applyActorSearch();
  }

  const entityGroups = { character: "characters", enemy: "enemies", npc: "npcs", object: "objects" };
  function selectedItem() {
    return selectedActor ? state.room?.[entityGroups[selectedActor.type]]?.[selectedActor.id] : null;
  }
  function put(tag, value, parent, className = "") {
    const el = document.createElement(tag);
    if (className) el.className = className;
    el.textContent = String(value ?? "");
    parent.append(el);
    return el;
  }
  function openInspector(type, id) {
    selectedActor = { type, id };
    const panel = byId("dmInspector");
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    byId("dmInspectorBackdrop").hidden = false;
    renderInspector();
    byId("dmInspectorClose").focus();
  }
  function closeInspector() {
    byId("dmInspector").classList.remove("is-open");
    byId("dmInspector").setAttribute("aria-hidden", "true");
    byId("dmInspectorBackdrop").hidden = true;
  }
  function addInspectorAction(parent, label, action, value) {
    const btn = put("button", label, parent, "dm-inspector-action");
    btn.type = "button";
    btn.addEventListener("click", () => {
      if (!selectedActor) return;
      updateEntity(selectedActor.type, selectedActor.id, action, value);
    });
  }
  function renderInspector() {
    const body = byId("dmInspectorBody");
    if (!body) return;
    body.replaceChildren();
    const actor = selectedItem();
    if (!actor) {
      put("p", "Seleccioná un personaje, enemigo, NPC u objeto para ver sus datos y acciones.", body, "dm-inspector-empty");
      return;
    }
    const type = selectedActor.type;
    const header = put("div", "", body, "dm-actor-identity");
    const avatar = put("div", "", header, `dm-avatar dm-avatar-${type}`);
    if (avatarSrc(actor)) {
      const picture = document.createElement("img");
      picture.className = "dm-custom-avatar"; picture.alt = `Retrato de ${actor.name || "actor"}`;
      picture.src = avatarSrc(actor); avatar.append(picture);
    } else put("span", portraits[type] || "◆", avatar, "dm-avatar-symbol");
    const detail = put("div", "", header);
    put("h2", actor.name || "Sin nombre", detail);
    put("small", ({character:"Personaje",enemy:"Enemigo",npc:"NPC",object:"Objeto"})[type], detail);
    const avatarActions = put("div", "", body, "dm-avatar-actions");
    const upload = put("button", actor.avatar ? "Cambiar retrato" : "Subir retrato", avatarActions, "dm-inspector-action");
    upload.type = "button"; upload.addEventListener("click", chooseAvatar);
    if (actor.avatar) {
      const remove = put("button", "Quitar retrato", avatarActions, "dm-inspector-action");
      remove.type = "button";
      remove.addEventListener("click", () => actions.entities.setAvatar(type, selectedActor.id, null).catch(err => window.alert(err.message)));
    }
    put("p", "JPG, PNG o WebP · Se reduce a 256 px para compartirlo en la sala.", body, "dm-avatar-help");
    if (type !== "object") {
      const stats = put("div", "", body, "dm-inspector-stats");
      for (const [title, n] of [["Vida", `${actor.hpCurrent ?? actor.hp ?? "—"}/${actor.hpMax ?? actor.hp ?? "—"}`],["Maná", `${actor.manaCurrent ?? "—"}/${actor.manaMax ?? "—"}`],["Defensa", actor.defense ?? "—"]]) {
        const stat = put("div", "", stats, "dm-stat"); put("span", title, stat); put("strong", n, stat);
      }
      put("h3", "Recursos y turno", body);
      const row = put("div", "", body, "dm-inspector-actions");
      for (const [label, action] of [["−1 vida","damage"],["+1 vida","heal"],["−1 maná","manaDown"],["+1 maná","manaUp"],["Marcar turno","turn"]]) addInspectorAction(row, label, action);
    }
    put("h3", "Información", body);
    const info = put("div", "", body, "dm-actor-information");
    const fields = [["Descripción",actor.description],["Inventario",actor.inventory],["Condiciones",actor.conditions],["Notas DM",actor.dmNotes || actor.notes]];
    for (const [key,value] of fields) if (value) { const section=put("section","",info);put("small",key,section);put("p",value,section); }
    if (!info.children.length) put("p", "Sin anotaciones adicionales.", info);
    if (actor.attributes) {
      const details=put("details","",body,"dm-actor-extra"); put("summary","Atributos y estadísticas",details);
      for (const [k,v] of Object.entries(actor.attributes)) put("p",`${getAttributeName(k)}: ${v}`,details);
    }
    if (type === "character") {
      put("h3", "Administrar personaje", body);
      const row = put("div", "", body, "dm-inspector-actions");
      for (const [label, action] of [["Agregar objeto","inventory"],["Condición","condition"],["Nota privada","note"]]) addInspectorAction(row,label,action);
    } else {
      put("h3", "Entidad en escena", body);
      addInspectorAction(put("div","",body,"dm-inspector-actions"),"Quitar de la sala","remove");
    }
  }
  function applyActorSearch() {
    const field = byId("dmGlobalSearch");
    if (!field) return;
    const q = field.value.toLocaleLowerCase().trim();
    document.querySelectorAll("#dmView .entity-item[data-entity-id]").forEach(el => {
      el.hidden = !!q && !el.textContent.toLocaleLowerCase().includes(q);
    });
  }
  function renderDmFocus() {
    const focus = byId("dmTurnFocus");
    const details = byId("dmFocusDetails");
    if (!focus || !details || !state.room) return;

    document.querySelectorAll("[data-focus-filter]").forEach((button) => {
      button.classList.toggle("active", button.dataset.focusFilter === state.activeFocusFilter);
    });

    const combat = state.room.combat || {};
    const currentId = combat.order?.[combat.currentIndex] || "";
    const character = state.room.characters?.[currentId];
    const entity = character || state.room.enemies?.[currentId] || state.room.npcs?.[currentId];

    if (!entity) {
      focus.innerHTML = `<div class="entity-item"><span>No hay turno seleccionado.</span></div>`;
      details.innerHTML = "";
      return;
    }

    focus.innerHTML = `
      <div class="entity-item">
        <strong>${entity.name || "Sin nombre"}</strong>
        <span>${getEntitySubtitle(entity, character ? "character" : "enemy")}</span>
      </div>
    `;

    if (!character) {
      details.innerHTML = `<div class="entity-item"><span>Consulta detallada disponible para personajes listos.</span></div>`;
      return;
    }

    const filter = getFocusFilter(state.activeFocusFilter);
    const skillEntries = filter.skills
      .filter((key) => Number(character.skills?.[key] || 0) > 0)
      .map((key) => `${getSkillName(key)} +${character.skills[key]}`);
    const traitEntries = (character.traits || [])
      .map((key) => system.traits[key])
      .filter((trait) => trait && trait.appliesTo.some((item) => filter.skills.includes(item) || item === "any"))
      .map((trait) => trait.name);

    details.innerHTML = `
      <div class="entity-item">
        <strong>${filter.name}</strong>
        <div class="entity-meta">
          <span>Atributos: ${filter.attributes.map((key) => `${getAttributeName(key)} ${character.attributes?.[key] ?? "-"}`).join(" · ")}</span>
          <span>Habilidades: ${skillEntries.join(" · ") || "sin habilidades activas del filtro"}</span>
          <span>Rasgos: ${traitEntries.join(" · ") || "sin rasgos obvios del filtro"}</span>
          <span>Inventario: ${character.inventory || "sin objetos anotados"}</span>
          <span>Condiciones: ${character.conditions || "sin condiciones"}</span>
        </div>
      </div>
    `;
  }

  function renderEntityList(entries, type) {
    if (!entries.length) return `<div class="entity-item"><span>No hay ${getEntityPlural(type)}.</span></div>`;

    return entries.map(([id, item]) => `
      <div class="entity-item dm-actor-card" data-entity-id="${id}" data-entity-type="${type}" tabindex="0" aria-label="Seleccionar actor para administrar">
        <div class="dm-card-identity">${avatarMarkup(item,type)}<div class="dm-card-copy"><strong>${escapeText(item.name || "Sin nombre")}</strong><span>${escapeText(getEntitySubtitle(item,type))}</span></div><span class="dm-card-arrow">↗</span></div>
        ${renderEntityMeta(item, type)}
        <div class="entity-actions">
          ${type !== "object" ? '<button type="button" data-action="damage">-1 vida</button><button type="button" data-action="heal">+1 vida</button><button type="button" data-action="manaDown">-1 mana</button><button type="button" data-action="manaUp">+1 mana</button><button type="button" data-action="turn">Turno</button>' : ""}
          ${type === "character" ? '<button type="button" data-action="inventory">Objeto</button><button type="button" data-action="condition">Condicion</button><button type="button" data-action="note">Nota</button>' : ""}
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
    const kind = state.activeLibrary;
    container.innerHTML = cards.map((card, index) => {
      let portrait = "";
      try { portrait = localStorage.getItem(`ma_card_avatar:${kind === "enemies" ? "enemy" : kind === "npcs" ? "npc" : "object"}:${card.name}`) || ""; } catch {}
      const thumb = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(portrait) ? `<img class="dm-v9-thumb" src="${portrait}" alt="">` : `<span class="dm-v9-thumb dm-v9-thumb-fallback">${kind === "enemies" ? "⚔️" : kind === "npcs" ? "🧙" : "📜"}</span>`;
      return `<div class="library-card dm-v9-library-card">${thumb}<div class="dm-v9-library-copy"><strong>${escapeText(card.name)}</strong><p>${escapeText(card.type || card.role || card.threat || "Tarjeta")} · ${escapeText(card.description || card.attitude || "")}</p><div class="entity-actions"><button type="button" data-card-detail="${index}">Ver ficha / retrato</button><button type="button" data-library-kind="${kind}" data-library-index="${index}">Mostrar en partida</button></div></div></div>`;
    }).join("");
    container.querySelectorAll("[data-library-kind]").forEach(button => button.addEventListener("click", () => showLibraryCard(button.dataset.libraryKind, Number(button.dataset.libraryIndex))));
    container.querySelectorAll("[data-card-detail]").forEach(button => button.addEventListener("click", () => openLibraryDetail(kind,Number(button.dataset.cardDetail))));
  }
  function openLibraryDetail(kind,index) {
    const card = system.cardLibrary[kind]?.[index]; if (!card) return;
    const dialog = byId("dmLibraryDialog"), body = byId("dmLibraryDialogBody");
    byId("dmLibraryDialogTitle").textContent = card.name;
    body.replaceChildren();
    const mappedKind = kind === "enemies" ? "enemy" : kind === "npcs" ? "npc" : "object";
    const key = `ma_card_avatar:${mappedKind}:${card.name}`;
    const preview = document.createElement("div"); preview.className = "dm-v9-library-preview"; body.append(preview);
    const draw = () => { preview.replaceChildren(); let src="";try{src=localStorage.getItem(key)||"";}catch{} if (/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(src)) {const img=document.createElement("img");img.src=src;img.alt=`Retrato de ${card.name}`;preview.append(img);} else preview.textContent="Sin retrato personalizado"; };
    draw();
    const upload = document.createElement("button");upload.type="button";upload.className="secondary-button";upload.textContent="Subir retrato de esta ficha";
    upload.addEventListener("click",async()=>{
      const input=document.createElement("input");input.type="file";input.accept="image/jpeg,image/png,image/webp";
      input.addEventListener("change",async()=>{if(!input.files?.[0])return;try{const src=await compressAvatar(input.files[0]);localStorage.setItem(key,src);draw();renderDmLibrary();}catch(err){alert(`No se pudo guardar el retrato: ${err.message}`);}}, {once:true});input.click();
    }); body.append(upload);
    const remove=document.createElement("button");remove.type="button";remove.className="ghost-button";remove.textContent="Quitar retrato";remove.addEventListener("click",()=>{if(!confirm("¿Quitar el retrato de esta ficha?"))return;localStorage.removeItem(key);draw();renderDmLibrary();});body.append(remove);
    for (const [field,value] of Object.entries(card)) {
      if (value == null || value === "") continue;
      const row=document.createElement("div");row.className="dm-v9-detail-row";
      const label=document.createElement("strong");label.textContent=field;
      const txt=document.createElement("span");txt.textContent=typeof value === "object" ? JSON.stringify(value,null,2) : String(value);
      row.append(label,txt);body.append(row);
    }
    const hint=document.createElement("p");hint.className="dm-plan-help";hint.textContent="El retrato de la ficha se guarda en este navegador y se copia al actor cuando lo mostrás en la partida. No modifica la biblioteca original.";body.append(hint);
    dialog.showModal();
  }

  function attachEntityActions() {
    document.querySelectorAll("[data-entity-id] button").forEach((button) => {
      button.addEventListener("click", () => {
        const row = button.closest("[data-entity-id]");
        if (button.dataset.action === "remove" && !confirm("¿Quitar este actor de la partida?")) return;
        updateEntity(row.dataset.entityType, row.dataset.entityId, button.dataset.action);
      });
    });

  }

  function getEntityPlural(type) {
    if (type === "enemy") return "enemigos visibles";
    if (type === "npc") return "NPCs visibles";
    if (type === "object") return "objetos visibles";
    return "personajes";
  }

  function getEntitySubtitle(item, type) {
    if (type === "character") return `${item.status === "ready" ? "Listo" : "Borrador"} - ${item.className || "Personaje"} - Vida ${item.hpCurrent ?? "?"}/${item.derived?.hpMax ?? item.hpMax ?? "?"} - Mana ${item.manaCurrent ?? "?"}/${item.derived?.manaMax ?? "?"}`;
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
      type === "character" && item.inventory ? `Inventario: ${item.inventory}` : "",
      type === "character" && item.conditions ? `Condiciones: ${item.conditions}` : "",
      type === "character" && item.dmNotes ? `Notas DM: ${item.dmNotes}` : "",
      type !== "character" && item.notes ? `Notas DM: ${item.notes}` : ""
    ].filter(Boolean);
    return lines.length ? `<div class="entity-meta">${lines.map((line) => `<span>${line}</span>`).join("")}</div>` : "";
  }
  function saveScene() {
    return actions.scenes.saveScene({ title: byId("sceneTitleInput").value, description: byId("sceneDescriptionInput").value, mode: byId("sceneModeSelect").value });
  }
  function setupQuickNotes() {
    const toggle=byId("dmQuickNotesToggle"), panel=byId("dmQuickNotes"), textarea=byId("dmQuickNotesText"), status=byId("dmQuickNotesStatus");
    const key=()=>`ma_dm_quicknotes:${state.roomCode || "local"}`;
    let previous="";
    const refresh=()=>{if (previous!==key()){previous=key();try{textarea.value=localStorage.getItem(key())||"";}catch{textarea.value="";}}};
    toggle.hidden=false; toggle.addEventListener("click",()=>{refresh();panel.hidden=!panel.hidden;if(!panel.hidden)textarea.focus();});
    byId("dmQuickNotesClose").addEventListener("click",()=>panel.hidden=true);
    textarea.addEventListener("input",()=>{try{localStorage.setItem(key(),textarea.value);status.textContent="Guardado en este navegador";}catch{status.textContent="No se pudo guardar: exportá o copiá tus notas";}});
    document.querySelectorAll("[data-dm-nav],[data-dm-mode]").forEach(button=>button.addEventListener("click",()=>{previous="";refresh();}));
  }
  function bind() {
    try {
      byId("dmCompactCards").checked = localStorage.getItem("ma_dm_compact") === "1";
      byId("dmShowDescriptions").checked = localStorage.getItem("ma_dm_descriptions") !== "0";
    } catch {}
    applyPreferences();
    [["dmCompactCards","ma_dm_compact"],["dmShowDescriptions","ma_dm_descriptions"]].forEach(([id,key]) => {
      byId(id)?.addEventListener("change", event => {
        try { localStorage.setItem(key, event.target.checked ? "1" : "0"); } catch {}
        applyPreferences();
      });
    });
    byId("dmPartyRoster")?.addEventListener("click", event => {
      const card = event.target.closest("[data-roster-id]");
      if (card) openInspector("character", card.dataset.rosterId);
    });
    byId("dmCombatOrder")?.addEventListener("click", event => {
      const node = event.target.closest("[data-combat-id]");
      if (!node) return;
      const id = node.dataset.combatId;
      for (const [type, group] of Object.entries(entityGroups)) if (state.room?.[group]?.[id]) return openInspector(type,id);
    });
    byId("dmLibraryDialogClose").addEventListener("click", () => byId("dmLibraryDialog").close());
    setupQuickNotes();
    byId("dmInspectorClose").addEventListener("click", closeInspector);
    byId("dmInspectorBackdrop").addEventListener("click", closeInspector);
    document.addEventListener("keydown", event => { if (event.key === "Escape") closeInspector(); });
    document.querySelector("#dmView").addEventListener("click", event => {
      const entity = event.target.closest(".entity-item[data-entity-id]");
      if (!entity || event.target.closest("button,input,textarea,select")) return;
      openInspector(entity.dataset.entityType, entity.dataset.entityId);
    });
    byId("dmGlobalSearch").addEventListener("input", () => {
      applyActorSearch();
      const q = byId("dmGlobalSearch").value.trim();
      if (q) {store.ui.dmMode = "live"; store.ui.dmPage = "actors"; document.querySelector('[data-dm-nav="actors"]')?.click();}
    });
    byId("dmOpenActorSearch").addEventListener("click", () => { document.querySelector('[data-dm-nav="actors"]')?.click();byId("dmGlobalSearch").focus(); });
    byId("dmToggleMinimal").addEventListener("click", event => {
      const on = document.querySelector("#dmView").classList.toggle("dm-minimal");
      event.currentTarget.setAttribute("aria-pressed",String(on));
      event.currentTarget.textContent = on ? "Mostrar navegación" : "Vista limpia";
    });
    byId("broadcastSceneButton").addEventListener("click", saveScene);
    byId("sceneForm").addEventListener("submit", event => { event.preventDefault(); saveScene(); });
    byId("startCombatButton").addEventListener("click", actions.combat.startCombat);
    byId("nextTurnButton").addEventListener("click", actions.combat.nextTurn);
    document.querySelectorAll("[data-library-tab]").forEach(button => button.addEventListener("click", () => { state.activeLibrary = button.dataset.libraryTab; renderDmLibrary(); }));
    document.querySelectorAll("[data-focus-filter]").forEach(button => button.addEventListener("click", () => { state.activeFocusFilter = button.dataset.focusFilter; renderDmFocus(); }));
  }
  function render() { renderDm(); if (state.room) renderRolls(byId("dmRollFeed"), state.room); }
  return { bind, render };
}
