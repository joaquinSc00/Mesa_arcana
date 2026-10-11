// Efectos puramente narrativos. No alteran vida, tiradas, posiciones ni estado de combate.
export const FX_TYPES = Object.freeze(['slash', 'fire', 'arcane', 'shield', 'heal', 'curse', 'impact']);
export function createFxActions({store,sync}) {
  function perform({kind,source='',target=''}){
    if(store.state.role!=='dm')return Promise.reject(new Error('Solo el DM puede disparar efectos desde este panel.'));
    if(!FX_TYPES.includes(kind))return Promise.reject(new Error('Efecto desconocido.'));
    const room=store.state.room||{};
    const actors=['characters','enemies','npcs','objects'].flatMap(group=>Object.keys(room[group]||{}).map(id=>`${group}_${id}`));
    if(source && !actors.includes(source))return Promise.reject(new Error('Origen desconocido.'));
    if(target && !actors.includes(target))return Promise.reject(new Error('Destino desconocido.'));
    return sync.set('visualFx/current',{id:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`,kind,source,target,createdAt:Date.now()});
  }
  return {perform};
}
