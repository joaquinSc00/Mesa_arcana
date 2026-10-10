import { getCollectionForType } from "../domain/entities.js";

export function createEntityActions({ store, sync, combat, dialogs }) {
  const { state } = store;
  function updateEntity(type, id, action) {
    const collection = getCollectionForType(type);
    const entity = state.room[collection]?.[id];
    if (!entity) return;
    const path = `${collection}/${id}`;
    if (action === "remove") return sync.remove(path);
    if (action === "turn") return combat.markTurn(id);
    if (["inventory", "condition", "note"].includes(action)) {
      const value = dialogs.prompt(action === "inventory" ? "Objeto para agregar" : action === "condition" ? "Condicion para agregar" : "Nota del DM");
      if (!value) return;
      const field = action === "inventory" ? "inventory" : action === "condition" ? "conditions" : "dmNotes";
      const previous = entity[field] || "";
      return sync.set(`${path}/${field}`, previous ? `${previous}\n${value}` : value);
    }
    if (action === "manaDown" || action === "manaUp") {
      const mana = Math.max(0, Number(entity.manaCurrent ?? entity.derived?.manaMax ?? 0) + (action === "manaUp" ? 1 : -1));
      return sync.set(`${path}/manaCurrent`, mana);
    }
    const hp = Math.max(0, Number(entity.hpCurrent ?? entity.hp ?? entity.derived?.hpMax ?? 0) + (action === "heal" ? 1 : -1));
    return sync.set(`${path}/hpCurrent`, hp);
  }
  function setAvatar(type, id, dataUrl) {
    const collection = getCollectionForType(type);
    if (!state.room?.[collection]?.[id]) return Promise.reject(new Error("Actor no encontrado"));
    if (dataUrl !== null && (typeof dataUrl !== "string" || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(dataUrl) || dataUrl.length > 130000)) {
      return Promise.reject(new Error("Retrato inválido o demasiado grande"));
    }
    return sync.set(`${collection}/${id}/avatar`, dataUrl);
  }
  return { updateEntity, setAvatar };
}
