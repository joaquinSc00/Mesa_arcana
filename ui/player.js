import { system } from "../game-system.js?v=modules-1";
import * as rules from "../domain/character-rules.js";
import { getEntityName } from "../domain/entities.js";
import { initials } from "../core/utils.js";
import { byId } from "./dom.js";
const { attributes, skills } = system;
const { getAttributeName, getSkillName, emptyAttributeMap, emptySkillMap } = rules;
const avatarPattern = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;
const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]);
const range = (n, max) => Math.max(0, Math.min(max, Number(n) || 0));

export function createPlayerView({ store, actions }) {
  const { state, emit } = store;
  let stagedAvatar = ""; // Selección local antes de guardar un primer borrador.
  let journalDraft = { inventory: null, notes: null };
  let journalSaving = false;
  let journalOwner = "";
  const ownCharacter = () => state.room?.characters?.[state.participantId];
  const showNotice = (text) => emit("notice", text);
  const readBuild = () => ({
    lineage: byId("lineageSelect").value, classKey: byId("classSelect").value,
    background: byId("backgroundSelect").value, localBonus: state.localBonus, skillTraining: state.skillTraining,
    name: byId("characterNameInput").value, hpCurrent: byId("hpCurrentInput").value,
    manaCurrent: byId("manaCurrentInput").value, inventory: byId("characterInventoryInput").value,
    notes: byId("characterNotesInput").value, avatar: stagedAvatar || ownCharacter()?.avatar || ""
  });
  const getAttributeTotals = () => rules.getAttributeTotals(readBuild());
  const getGrantedSkills = () => rules.getGrantedSkills(readBuild());
  const getFreePoints = () => rules.getFreePoints(readBuild());
  const getFreeSkillPoints = () => rules.getFreeSkillPoints(readBuild());
  const calculateDerivedStats = () => rules.calculateDerivedStats(readBuild());
  const isCharacterFinalized = actions.characters.isCharacterFinalized;
  const changeLocalBonus = (key, delta) => actions.characters.changeLocalBonus(key, delta, readBuild());
  const toggleSkillTraining = (key) => actions.characters.toggleSkillTraining(key, readBuild());
  const { rollFreeDie, rollAttributeCheck } = actions.dice;

  function fillSelects() {
    fillSelect(byId("lineageSelect"), system.lineages);
    fillSelect(byId("classSelect"), system.classes);
    fillSelect(byId("backgroundSelect"), system.backgrounds);
  }
  function fillSelect(select, options) {
    Object.entries(options).forEach(([key, value]) => select.append(new Option(value.name, key)));
  }
  function renderAttributes() {
    const grid = byId("attributesGrid");
    grid.replaceChildren();
    const totals = getAttributeTotals();
    byId("freePointsValue").textContent = String(getFreePoints());
    attributes.forEach((attribute) => {
      const card = document.createElement("div");
      card.className = "attribute-card";
      card.innerHTML = `<h3>${escapeHtml(attribute.name)}</h3><small>${escapeHtml(attribute.hint)}</small>
        <div class="attribute-control"><button type="button" aria-label="Bajar ${escapeHtml(attribute.name)}">−</button>
        <strong>${Number(totals[attribute.key]) || 0}</strong><button type="button" aria-label="Subir ${escapeHtml(attribute.name)}">+</button></div>`;
      const [minus, plus] = card.querySelectorAll("button");
      minus.disabled = isCharacterFinalized(); plus.disabled = isCharacterFinalized();
      minus.addEventListener("click", () => changeLocalBonus(attribute.key, -1));
      plus.addEventListener("click", () => changeLocalBonus(attribute.key, 1));
      grid.append(card);
    });
  }
  function renderSkills() {
    const grid = byId("skillsGrid"); grid.replaceChildren();
    byId("skillPointsValue").textContent = String(getFreeSkillPoints());
    const freeSkills = getGrantedSkills();
    skills.forEach((skill) => {
      const trained = state.skillTraining[skill.key] || 0;
      const granted = freeSkills.has(skill.key);
      const card = document.createElement("div"); card.className = "skill-card";
      card.innerHTML = `<div><strong>${escapeHtml(skill.name)}</strong><small>${escapeHtml(skill.attributes.map(getAttributeName).join(" / "))}${granted ? " · inicial" : ""}</small></div><button type="button" aria-label="Alternar ${escapeHtml(skill.name)}">${trained || granted ? "✓" : "+"}</button>`;
      const button = card.querySelector("button"); button.disabled = isCharacterFinalized();
      button.addEventListener("click", () => toggleSkillTraining(skill.key));
      grid.append(card);
    });
  }
  function renderQuickRolls() {
    const container = byId("playerQuickRolls"); container.replaceChildren();
    function group(title, description) {
      const section = document.createElement("section"); section.className = "player-dice-group";
      const label = document.createElement("div"); label.className = "player-dice-heading";
      const strong = document.createElement("strong"); strong.textContent = title;
      const hint = document.createElement("small"); hint.textContent = description;
      label.append(strong, hint);
      const grid = document.createElement("div"); grid.className = "player-dice-buttons";
      section.append(label, grid); container.append(section); return grid;
    }
    const free = group("Dados libres", "El resultado no determina por sí solo lo que sucede.");
    [20, 12, 10, 8, 6, 4].forEach(die => {
      const button = document.createElement("button"); button.className = "player-die-button"; button.type = "button";
      button.innerHTML = `<svg class="fantasy-die-button-icon" viewBox="0 0 64 64" aria-hidden="true"><polygon points="32,3 60,20 52,54 14,54 4,20" fill="#3c334c" stroke="#f3d6a5" stroke-width="2.7"/><path d="M32 3L32 33L60 20M32 33L52 54M32 33L14 54M32 33L4 20" stroke="#e6ba7a" stroke-width="1.3" fill="none"/><text x="32" y="44" text-anchor="middle" fill="#fff2ce" font-size="22" font-weight="bold">${die}</text></svg><span>Dado libre</span><strong>d${die}</strong>`;
      button.addEventListener("click", () => rollFreeDie(die)); free.append(button);
    });
    const checks = group("Consultas de atributo", "El DM interpreta el resultado de la tirada.");
    attributes.forEach(attribute => {
      const button = document.createElement("button"); button.className = "player-die-button"; button.type = "button";
      button.innerHTML = `<svg class="fantasy-die-button-icon" viewBox="0 0 64 64" aria-hidden="true"><polygon points="32,2 61,19 49,57 15,57 3,19" fill="#283f52" stroke="#b4e7ff" stroke-width="2.7"/><path d="M32 2L32 34L61 19M32 34L49 57M32 34L15 57M32 34L3 19" stroke="#91cae8" stroke-width="1.3" fill="none"/><text x="32" y="45" text-anchor="middle" fill="#f0fcff" font-size="18" font-weight="bold">20</text></svg><span>${escapeHtml(attribute.name)}</span><strong>d20</strong>`;
      button.addEventListener("click", () => rollAttributeCheck(attribute.key)); checks.append(button);
    });
  }
  function renderCreationPortrait() {
    const display = byId("characterPortrait");
    const image = stagedAvatar || ownCharacter()?.avatar || "";
    display.replaceChildren();
    if (avatarPattern.test(image) && image.length <= 130000) {
      const img = document.createElement("img"); img.src = image; img.alt = "Retrato del personaje";
      display.append(img);
    } else display.textContent = initials(byId("characterNameInput").value.trim() || state.participantName || "?");
  }
  function renderCharacterForm() {
    if (state.role !== "player" || !state.room) return;
    const owner = `${state.roomCode}:${state.participantId}`;
    if (journalOwner !== owner) { journalOwner = owner; journalDraft = { inventory: null, notes: null }; stagedAvatar = ""; }
    const character = ownCharacter();
    if (stagedAvatar && character?.avatar === stagedAvatar) stagedAvatar = "";
    if (!character) {
      setCharacterEditingMode(false); refreshCharacterPreview(); renderFinalCharacterCard(null); return;
    }
    byId("characterNameInput").value = character.name || "";
    byId("lineageSelect").value = character.lineage || "human";
    byId("classSelect").value = character.classKey || character.archetype || "guardian";
    byId("backgroundSelect").value = character.background || "fallen_noble";
    state.localBonus = { ...emptyAttributeMap(), ...(character.localBonus || {}) };
    state.skillTraining = { ...emptySkillMap(), ...(character.skillTraining || {}) };
    byId("hpCurrentInput").value = character.hpCurrent ?? character.derived?.hpMax ?? 12;
    byId("manaCurrentInput").value = character.manaCurrent ?? character.derived?.manaMax ?? 4;
    byId("characterInventoryInput").value = character.inventory || "";
    byId("characterNotesInput").value = character.notes || "";
    refreshCharacterPreview();
    setCharacterEditingMode(character.status === "ready");
    renderFinalCharacterCard(character);
  }
  function refreshCharacterPreview() {
    renderCreationPortrait(); renderAttributes(); renderSkills();
    const stats = calculateDerivedStats();
    byId("hpMaxInput").value = stats.hpMax;
    if (!byId("hpCurrentInput").value) byId("hpCurrentInput").value = stats.hpMax;
    byId("manaMaxInput").value = stats.manaMax;
    if (!byId("manaCurrentInput").value) byId("manaCurrentInput").value = stats.manaMax;
    byId("defenseInput").value = stats.defense; byId("initiativeInput").value = stats.initiative;
  }
  function setCharacterEditingMode(finalized) {
    byId("characterForm").hidden = finalized;
    byId("finalCharacterCard").hidden = !finalized;
    byId("saveCharacterButton").hidden = finalized;
    byId("finalizeCharacterButton").hidden = finalized;
    const intro = byId("playerCreationHint"); if (intro) intro.hidden = finalized;
    ["characterNameInput", "lineageSelect", "classSelect", "backgroundSelect", "hpCurrentInput", "manaCurrentInput", "characterInventoryInput", "characterNotesInput"].forEach(id => {
      const element = byId(id); if (element) element.disabled = finalized;
    });
  }
  function renderInventoryPreview(text, holder) {
    holder.replaceChildren();
    const lines = String(text).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (!lines.length) { const empty = document.createElement("span"); empty.className = "player-empty-note"; empty.textContent = "Todavía no anotaste objetos."; holder.append(empty); return; }
    lines.forEach(line => { const item = document.createElement("span"); item.className = "player-item-tag"; item.textContent = line; holder.append(item); });
  }
  function renderJournalPanel(field, title, description, content) {
    const current = journalDraft[field] !== null ? journalDraft[field] : content;
    const type = field === "inventory";
    return `<section class="panel player-journal-panel" data-ready-section="${field}">
      <div class="player-journal-heading"><div><p class="eyebrow">${type ? "MIS PERTENENCIAS" : "DIARIO DE AVENTURA"}</p><h2>${title}</h2><p>${description}</p></div></div>
      ${type ? '<div class="player-item-preview" data-journal-preview="inventory"></div>' : ''}
      <label for="playerJournal_${field}" class="player-field-label">${type ? "Lista libre de objetos (uno por línea)" : "Notas libres del personaje"}</label>
      <textarea id="playerJournal_${field}" class="player-journal-editor" maxlength="8000" rows="7" placeholder="${type ? "Espada larga\\n2 pociones\\nLlave oxidada" : "Pistas descubiertas, relaciones, objetivos y recuerdos..."}">${escapeHtml(current)}</textarea>
      <div class="player-journal-actions"><span class="player-journal-state" id="playerJournalState_${field}">${journalDraft[field] === null ? "Guardado" : "Cambios sin guardar"}</span>
      <button type="button" class="primary-button" data-save-journal="${field}">Guardar ${type ? "inventario" : "notas"}</button></div>
    </section>`;
  }
  function renderFinalCharacterCard(character) {
    const card = byId("finalCharacterCard");
    const focused = document.activeElement;
    const focusedField = focused?.id?.startsWith("playerJournal_") && card.contains(focused) ? focused.id : "";
    const selection = focusedField ? [focused.selectionStart, focused.selectionEnd] : null;
    if (!character || character.status !== "ready") { card.hidden = true; card.replaceChildren(); return; }
    const hpMax = Math.max(1, Number(character.derived?.hpMax || 1));
    const manaMax = Math.max(1, Number(character.derived?.manaMax || 1));
    const hp = Number(character.hpCurrent ?? hpMax);
    const mana = Number(character.manaCurrent ?? manaMax);
    const hpPct = range(hp / hpMax * 100, 100), manaPct = range(mana / manaMax * 100, 100);
    const avatar = avatarPattern.test(character.avatar || "") && character.avatar.length <= 130000
      ? `<img src="${character.avatar}" alt="Retrato de ${escapeHtml(character.name)}">`
      : `<span class="player-hero-initials">${escapeHtml(initials(character.name || "?"))}</span>`;
    const activeSkills = Object.entries(character.skills || {}).filter(([,value]) => Number(value || 0) > 0)
      .map(([key,value]) => `<div class="player-stat-row"><span>${escapeHtml(getSkillName(key))}</span><strong>+${Number(value)}</strong></div>`);
    const attrCards = Object.entries(character.attributes || {}).map(([key,value]) => `<div class="player-attribute-tile"><small>${escapeHtml(getAttributeName(key))}</small><strong>${Number(value) || 0}</strong></div>`).join("");
    const traits = (character.traitNames || []).map(name => `<span class="player-trait-pill">${escapeHtml(name)}</span>`).join("");
    card.innerHTML = `
      <section class="player-hero-card" data-ready-section="character">
        <div class="player-hero-banner"><span>✦ PERSONAJE EN PARTIDA</span><span class="player-hero-badge">FICHA FINALIZADA</span></div>
        <div class="player-hero-main"><div class="player-hero-portrait">${avatar}</div><div class="player-hero-details">
          <p class="player-hero-subtitle">${escapeHtml(character.lineageName || "Aventurero")} · ${escapeHtml(character.className || "Sin clase")}</p>
          <h2>${escapeHtml(character.name || "Sin nombre")}</h2><p class="player-hero-background">${escapeHtml(character.backgroundName || "")} · Interpretado por ${escapeHtml(character.playerName || state.participantName || "Jugador")}</p>
          <div class="player-avatar-actions"><button type="button" class="secondary-button" id="playerChangeAvatar">Cambiar retrato</button>
          ${character.avatar ? '<button type="button" class="ghost-button" id="playerRemoveAvatar">Quitar</button>' : ''}</div>
        </div></div>
        <div class="player-resource-grid"><div class="player-resource-card player-health"><div><span>Vida</span><strong>${hp}<small> / ${hpMax}</small></strong></div><div class="player-resource-bar"><i style="width:${hpPct}%"></i></div></div>
        <div class="player-resource-card player-mana"><div><span>Maná</span><strong>${mana}<small> / ${manaMax}</small></strong></div><div class="player-resource-bar"><i style="width:${manaPct}%"></i></div></div></div>
        <div class="player-combat-stats"><div><span>Defensa</span><strong>${Number(character.derived?.defense ?? 0)}</strong></div><div><span>Iniciativa</span><strong>${Number(character.derived?.initiative ?? 0)}</strong></div></div>
        <p class="player-hero-tip">El DM decide las consecuencias de las acciones. Estos recursos reflejan el estado actual de la partida.</p>
      </section>
      <section class="panel player-ready-panel" data-ready-section="stats"><div class="player-panel-head"><p class="eyebrow">PERSONAJE</p><h2>Atributos</h2></div><div class="player-attributes-overview">${attrCards}</div></section>
      <section class="panel player-ready-panel" data-ready-section="stats"><div class="player-panel-head"><p class="eyebrow">TALENTOS</p><h2>Habilidades activas</h2></div><div class="player-skill-rows">${activeSkills.join("") || '<p class="player-empty-note">Sin habilidades activas.</p>'}</div></section>
      <section class="panel player-ready-panel" data-ready-section="stats"><div class="player-panel-head"><p class="eyebrow">ORIGEN</p><h2>Rasgos</h2></div><div class="player-traits">${traits || '<span class="player-empty-note">Sin rasgos.</span>'}</div></section>
      ${renderJournalPanel("inventory", "Inventario", "Las pertenencias cambian durante la aventura. La lista sigue siendo libre.", character.inventory || "")}
      ${renderJournalPanel("notes", "Notas personales", "Anotá pistas, nombres, teorías y decisiones para retomarlas en la mesa.", character.notes || "")}`;
    card.querySelector("#playerChangeAvatar")?.addEventListener("click", chooseAvatar);
    card.querySelector("#playerRemoveAvatar")?.addEventListener("click", async () => {
      if (!window.confirm("¿Quitar el retrato de tu personaje?")) return;
      try { await actions.characters.setOwnAvatar(null); showNotice("Retrato quitado."); }
      catch (err) { showNotice(err.message || "No se pudo quitar el retrato."); }
    });
    for (const field of ["inventory", "notes"]) {
      const editor = card.querySelector(`#playerJournal_${field}`);
      const preview = card.querySelector(`[data-journal-preview="${field}"]`);
      if (preview) renderInventoryPreview(editor.value, preview);
      editor.addEventListener("input", () => {
        journalDraft[field] = editor.value;
        const status = card.querySelector(`#playerJournalState_${field}`);
        if (status) status.textContent = "Cambios sin guardar";
        if (preview) renderInventoryPreview(editor.value, preview);
      });
      card.querySelector(`[data-save-journal="${field}"]`).addEventListener("click", async (event) => {
        if (journalSaving) return;
        journalSaving = true; event.currentTarget.disabled = true;
        const value = editor.value;
        try {
          await actions.characters.updateOwnJournal(field, value);
          if (journalDraft[field] === value) journalDraft[field] = null;
          showNotice(field === "inventory" ? "Inventario actualizado." : "Notas guardadas.");
        } catch (error) { showNotice(error?.message || "No se pudieron guardar los cambios."); }
        finally { journalSaving = false; }
        if (ownCharacter()?.status === "ready") renderFinalCharacterCard(ownCharacter());
      });
    }
    if (focusedField && selection) {
      const restored = card.querySelector(`#${focusedField}`);
      if (restored) {
        restored.focus({ preventScroll: true });
        restored.setSelectionRange(...selection);
      }
    }
  }
  async function compressAvatar(file) {
    if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw Error("Elegí una imagen JPG, PNG o WebP.");
    if (file.size > 8 * 1024 * 1024) throw Error("La imagen supera 8 MB.");
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#1c2031"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      let data = canvas.toDataURL("image/jpeg", .78);
      if (data.length > 130000) data = canvas.toDataURL("image/jpeg", .55);
      if (data.length > 130000) throw Error("La imagen no pudo reducirse lo suficiente.");
      return data;
    } finally { bitmap.close(); }
  }
  function chooseAvatar() {
    const input = document.createElement("input"); input.type = "file"; input.accept = "image/jpeg,image/png,image/webp";
    input.addEventListener("change", async () => {
      if (!input.files?.[0]) return;
      try {
        const image = await compressAvatar(input.files[0]);
        if (ownCharacter()) await actions.characters.setOwnAvatar(image);
        else { stagedAvatar = image; renderCreationPortrait(); }
        showNotice("Retrato actualizado.");
      } catch (error) { showNotice(error?.message || "No se pudo cargar el retrato."); }
    }, { once: true });
    input.click();
  }
  function renderSession() {
    if (!state.room) return;
    const scene = state.room.scene || {}, combat = state.room.combat || {};
    const name = getEntityName(state.room, combat.order?.[combat.currentIndex] || "") || "Sin combate";
    byId("playerTurnName").textContent = name;
    byId("playerSessionTurnName").textContent = name;
    byId("playerSceneTitle").textContent = scene.title || "Sin escena";
    byId("playerSceneDescription").textContent = scene.description || "El director todavía no mostró una escena.";
    const label = byId("playerMiniTurn"); if (label) label.textContent = name;
  }
  function bind() {
    fillSelects();
    byId("saveCharacterButton").addEventListener("click", () => actions.characters.saveCharacter(readBuild()));
    byId("finalizeCharacterButton").addEventListener("click", () => actions.characters.finalizeCharacter(readBuild()));
    byId("resetAttributesButton").addEventListener("click", actions.characters.resetCharacterBuild);
    byId("playerDraftAvatarButton")?.addEventListener("click", chooseAvatar);
    ["lineageSelect", "classSelect", "backgroundSelect"].forEach(id => byId(id).addEventListener("change", refreshCharacterPreview));
    byId("characterNameInput").addEventListener("input", refreshCharacterPreview);
  }
  function render() { renderAttributes(); renderSkills(); renderQuickRolls(); renderCharacterForm(); renderSession(); }
  return { bind, render, refreshCharacterPreview, readBuild };
}
