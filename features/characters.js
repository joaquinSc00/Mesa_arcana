import { system } from "../game-system.js?v=modules-1";
import * as rules from "../domain/character-rules.js";

export function createCharacterActions({ store, sync }) {
  const { state, emit } = store;
  function isCharacterFinalized() {
    return state.role === "player" && state.room?.characters?.[state.participantId]?.status === "ready";
  }
  function changeLocalBonus(key, delta, build) {
    const current = state.localBonus[key] || 0;
    if (delta > 0 && rules.getFreePoints(build) <= 0) return;
    if (delta < 0 && current <= 0) return;
    state.localBonus[key] = current + delta;
    emit("build:changed");
  }
  function toggleSkillTraining(key, build) {
    const current = state.skillTraining[key] || 0;
    if (current > 0) state.skillTraining[key] = 0;
    else if (rules.getFreeSkillPoints(build) > 0 && rules.getActiveSkillCount(build) < system.maxActiveSkills) state.skillTraining[key] = 1;
    else emit("notice", `Maximo ${system.maxActiveSkills} habilidades activas.`);
    emit("build:changed");
  }
  function resetCharacterBuild() {
    state.localBonus = rules.emptyAttributeMap(); state.skillTraining = rules.emptySkillMap(); emit("build:changed");
  }
  function writeCharacter(input, status) {
    const derived = rules.calculateDerivedStats(input);
    const traits = rules.getTraitKeys(input.lineage, input.classKey, input.background);
    const existing = state.room?.characters?.[state.participantId];
    const character = {
      id: state.participantId, status, name: input.name.trim() || state.participantName, playerName: state.participantName,
      lineage: input.lineage, lineageName: system.lineages[input.lineage].name,
      classKey: input.classKey, className: system.classes[input.classKey].name,
      background: input.background, backgroundName: system.backgrounds[input.background].name,
      localBonus: state.localBonus, skillTraining: state.skillTraining, grantedSkills: [...rules.getGrantedSkills(input)],
      attributes: rules.getAttributeTotals(input), skills: rules.getSkillBonuses(input), traits,
      traitNames: traits.map((key) => system.traits[key]?.name).filter(Boolean), derived,
      hpCurrent: Number(input.hpCurrent || derived.hpMax), manaCurrent: Number(input.manaCurrent || derived.manaMax),
      inventory: input.inventory.trim(), notes: input.notes.trim(),
      avatar: input.avatar || existing?.avatar || "", updatedAt: Date.now()
    };
    const result = sync.set(`characters/${state.participantId}`, character);
    emit("notice", status === "ready" ? "Personaje listo para la partida." : "Borrador guardado.");
    return result;
  }
  function saveCharacter(input) { return writeCharacter(input, "draft"); }
  function finalizeCharacter(input) {
    if (rules.getActiveSkillCount(input) > system.maxActiveSkills) {
      emit("notice", `La ficha supera ${system.maxActiveSkills} habilidades activas.`); return;
    }
    return writeCharacter(input, "ready");
  }
  // La creación queda bloqueada una vez finalizada. Inventario y notas siguen vivos.
  function updateOwnJournal(field, content) {
    const character = state.room?.characters?.[state.participantId];
    if (state.role !== "player" || character?.status !== "ready" || !["inventory", "notes"].includes(field)) {
      return Promise.reject(new Error("No se puede actualizar esta sección."));
    }
    if (typeof content !== "string" || content.length > 8000) {
      return Promise.reject(new Error("El texto supera el máximo de 8000 caracteres."));
    }
    return sync.set(`characters/${state.participantId}/${field}`, content);
  }
  function setOwnAvatar(dataUrl) {
    const character = state.room?.characters?.[state.participantId];
    if (state.role !== "player" || !character || !["ready", "draft"].includes(character.status)) {
      return Promise.reject(new Error("Guardá primero tu ficha para subir un retrato."));
    }
    if (dataUrl !== null && (typeof dataUrl !== "string" || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(dataUrl) || dataUrl.length > 130000)) {
      return Promise.reject(new Error("Formato de retrato inválido o demasiado grande."));
    }
    return sync.set(`characters/${state.participantId}/avatar`, dataUrl);
  }
  return { isCharacterFinalized, changeLocalBonus, toggleSkillTraining, resetCharacterBuild,
    saveCharacter, finalizeCharacter, updateOwnJournal, setOwnAvatar };
}
