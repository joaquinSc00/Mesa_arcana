import { system } from "../game-system.js?v=modules-1";
import { getCollectionForType } from "../domain/entities.js";

export function normalizeLibraryEntity(card, type, id) {
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
    avatar: (() => { try { const v = localStorage.getItem(`ma_card_avatar:${type}:${card.name}`); return v && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(v) ? v : ""; } catch { return ""; } })(),
    createdAt: Date.now()
  };
}

export function createLibraryActions({ sync }) {
  function showLibraryCard(kind, index) {
    const card = system.cardLibrary[kind]?.[index];
    if (!card) return;
    const type = kind === "enemies" ? "enemy" : kind === "npcs" ? "npc" : "object";
    const id = `${type}-${crypto.randomUUID()}`;
    return sync.set(`${getCollectionForType(type)}/${id}`, normalizeLibraryEntity(card, type, id));
  }
  return { showLibraryCard };
}
