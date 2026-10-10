import { system } from "../game-system.js?v=modules-1";
import * as rules from "../domain/character-rules.js";
import { getEntityName } from "../domain/entities.js";
import { initials } from "../core/utils.js";
import { byId } from "./dom.js";
const { attributes, skills } = system;
const { getAttributeName, getSkillName, emptyAttributeMap, emptySkillMap } = rules;

export function createPlayerView({ store, actions }) {
  const { state } = store;
  function readBuild() {
    return { lineage: byId("lineageSelect").value, classKey: byId("classSelect").value,
      background: byId("backgroundSelect").value, localBonus: state.localBonus, skillTraining: state.skillTraining,
      name: byId("characterNameInput").value, hpCurrent: byId("hpCurrentInput").value,
      manaCurrent: byId("manaCurrentInput").value, inventory: byId("characterInventoryInput").value, notes: byId("characterNotesInput").value };
  }
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
    Object.entries(options).forEach(([key, value]) => {
      select.append(new Option(value.name, key));
    });
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
      minus.disabled = isCharacterFinalized();
      plus.disabled = isCharacterFinalized();
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
      const button = card.querySelector("button");
      button.disabled = isCharacterFinalized();
      button.addEventListener("click", () => toggleSkillTraining(skill.key));
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
      setCharacterEditingMode(false);
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
    byId("characterInventoryInput").value = character.inventory || "";
    byId("characterNotesInput").value = character.notes || "";
    refreshCharacterPreview();
    setCharacterEditingMode(character.status === "ready");
    renderFinalCharacterCard(character);
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

  function setCharacterEditingMode(finalized) {
    byId("characterForm").hidden = finalized;
    byId("finalCharacterCard").hidden = !finalized;
    byId("saveCharacterButton").hidden = finalized;
    byId("finalizeCharacterButton").hidden = finalized;
    ["characterNameInput", "lineageSelect", "classSelect", "backgroundSelect", "hpCurrentInput", "manaCurrentInput", "characterInventoryInput", "characterNotesInput"].forEach((id) => {
      const element = byId(id);
      if (element) element.disabled = finalized;
    });
  }

  function renderFinalCharacterCard(character) {
    const card = byId("finalCharacterCard");
    if (!character || character.status !== "ready") {
      card.hidden = true;
      return;
    }

    const activeSkills = Object.entries(character.skills || {})
      .filter(([, value]) => Number(value || 0) > 0)
      .map(([key]) => getSkillName(key));

    card.innerHTML = `
      <div class="panel" data-ready-section="character">
        <p class="eyebrow">Listo / en partida</p>
        <h2>${character.name || "Sin nombre"}</h2>
        <p>${character.lineageName} - ${character.className} - ${character.backgroundName}</p>
        <div class="sheet-summary">
          <div class="summary-box"><span>Vida</span><strong>${character.hpCurrent}/${character.derived?.hpMax}</strong></div>
          <div class="summary-box"><span>Mana</span><strong>${character.manaCurrent}/${character.derived?.manaMax}</strong></div>
          <div class="summary-box"><span>Defensa</span><strong>${character.derived?.defense}</strong></div>
          <div class="summary-box"><span>Iniciativa</span><strong>${character.derived?.initiative}</strong></div>
        </div>
      </div>
      <div class="panel" data-ready-section="stats"><h2>Atributos</h2><div class="entity-meta">${Object.entries(character.attributes || {}).map(([key, value]) => `<span>${getAttributeName(key)}: ${value}</span>`).join("")}</div></div>
      <div class="panel" data-ready-section="stats"><h2>Habilidades activas</h2><div class="entity-meta">${activeSkills.map((name) => `<span>${name}</span>`).join("") || "<span>Ninguna</span>"}</div></div>
      <div class="panel" data-ready-section="stats"><h2>Rasgos</h2><div class="entity-meta">${(character.traitNames || []).map((name) => `<span>${name}</span>`).join("") || "<span>Ninguno</span>"}</div></div>
      <div class="panel" data-ready-section="inventory"><h2>Almacenamiento</h2><p>${character.inventory || "Sin objetos anotados."}</p></div>
      <div class="panel" data-ready-section="notes"><h2>Notas</h2><p>${character.notes || "Sin notas."}</p></div>
    `;
  }
  function renderSession() {
    if (!state.room) return;
    const scene = state.room.scene || {};
    const combat = state.room.combat || {};
    const name = getEntityName(state.room, combat.order?.[combat.currentIndex] || "") || "Sin combate";
    byId("playerTurnName").textContent = name;
    byId("playerSessionTurnName").textContent = name;
    byId("playerSceneTitle").textContent = scene.title || "Sin escena";
    byId("playerSceneDescription").textContent = scene.description || "El director todavia no mostro una escena.";
  }
  function bind() {
    fillSelects();
    byId("saveCharacterButton").addEventListener("click", () => actions.characters.saveCharacter(readBuild()));
    byId("finalizeCharacterButton").addEventListener("click", () => actions.characters.finalizeCharacter(readBuild()));
    byId("resetAttributesButton").addEventListener("click", actions.characters.resetCharacterBuild);
    ["lineageSelect", "classSelect", "backgroundSelect"].forEach(id => byId(id).addEventListener("change", refreshCharacterPreview));
    byId("characterNameInput").addEventListener("input", refreshCharacterPreview);
  }
  function render() { renderAttributes(); renderSkills(); renderQuickRolls(); renderCharacterForm(); renderSession(); }
  return { bind, render, refreshCharacterPreview, readBuild };
}
