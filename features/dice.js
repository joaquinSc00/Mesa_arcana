import { randomInt } from "../core/utils.js";
import { getCurrentActorName } from "../domain/entities.js";
import { getAttributeModifier, getAttributeName } from "../domain/character-rules.js";

export function createDiceActions({ store, sync, random = randomInt }) {
  const { state, emit } = store;
  const writeRoll = (roll) => sync.set(`rolls/${roll.id}`, roll);
  function rollFreeDie(dieSize) {
    const die = random(1, dieSize);
    return writeRoll({ id: `${Date.now()}-${state.participantId}`, actor: getCurrentActorName(state), actorId: state.participantId,
      label: `Dado libre d${dieSize}`, die, total: die, breakdown: [{ label: `d${dieSize}`, value: die }],
      note: "Tirada libre. El DM decide si importa y como se interpreta.", createdAt: Date.now() });
  }
  function rollAttributeCheck(attributeKey) {
    const character = state.room?.characters?.[state.participantId];
    if (!character) { emit("notice", "Guarda la ficha antes de tirar."); return; }
    const die = random(1, 20);
    const breakdown = [{ label: "d20", value: die }, { label: getAttributeName(attributeKey), value: getAttributeModifier(character.attributes?.[attributeKey] || 0) }];
    return writeRoll({ id: `${Date.now()}-${state.participantId}`, actor: character.name || state.participantName, actorId: state.participantId,
      label: `Consulta de ${getAttributeName(attributeKey)}`, attributeKey, die,
      total: breakdown.reduce((sum, part) => sum + Number(part.value || 0), 0), breakdown,
      note: "Consulta rapida. No resuelve una accion por si sola.", createdAt: Date.now() });
  }
  return { rollFreeDie, rollAttributeCheck, writeRoll };
}
