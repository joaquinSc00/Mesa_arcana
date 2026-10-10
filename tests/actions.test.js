import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../core/state.js';
import { createStorage } from '../core/storage.js';
import { createFirebaseSync } from '../core/firebase.js';
import { buildOfflineRoom } from '../core/utils.js';
import { createCharacterActions } from '../features/characters.js';
import { createCombatActions } from '../features/combat.js';
import { createDiceActions } from '../features/dice.js';
import { createEntityActions } from '../features/entities.js';
import { createLibraryActions } from '../features/library.js';
import { createSceneActions } from '../features/scenes.js';
import { createMapActions } from '../features/map-sync.js';
import { createRoomActions } from '../features/rooms.js';
import { createFakeFirebase, memoryStorage } from './helpers/fake-firebase.js';

async function setup(sdk = null) {
  const store = createStore();
  const storage = createStorage(memoryStorage());
  const sync = createFirebaseSync({ store, storage, sdk });
  await sync.connectToRoom('TEST-001', 'player', 'Tester', 'hero', buildOfflineRoom());
  await Promise.resolve();
  return { store, sync, storage };
}
function input(store, overrides = {}) {
  return { lineage: 'human', classKey: 'guardian', background: 'fallen_noble', localBonus: store.state.localBonus,
    skillTraining: store.state.skillTraining, name: 'Ayla', hpCurrent: '12', manaCurrent: '4', inventory: 'Espada', notes: 'Nota', ...overrides };
}

test('draft, finalization, six attributes points and six active skills retain their rules', async () => {
  const deps = await setup(); const actions = createCharacterActions(deps);
  let build = input(deps.store);
  for (let i = 0; i < 7; i++) actions.changeLocalBonus('fuerza', 1, build);
  assert.equal(deps.store.state.localBonus.fuerza, 6);
  await actions.saveCharacter(build);
  assert.equal(deps.store.state.room.characters.hero.status, 'draft');
  for (const key of ['stealth', 'locks', 'arcana', 'medicine']) actions.toggleSkillTraining(key, build);
  assert.equal(Object.values(deps.store.state.skillTraining).reduce((a,b) => a+b,0), 3);
  await actions.finalizeCharacter(build);
  assert.equal(deps.store.state.room.characters.hero.status, 'ready');
  assert.equal(actions.isCharacterFinalized(), true);
  assert.equal(deps.store.state.room.characters.hero.notes, 'Nota');
});
test('finalization rejects builds exceeding six active skills', async () => {
  const deps = await setup(); const actions = createCharacterActions(deps);
  const build = input(deps.store, { skillTraining: { stealth:1, locks:1, arcana:1, medicine:1 } });
  actions.finalizeCharacter(build);
  assert.equal(deps.store.state.room.characters.hero, undefined);
});
test('DM manual changes preserve floors, notes, inventory, conditions and turn', async () => {
  const deps = await setup(); await createCharacterActions(deps).saveCharacter(input(deps.store));
  let value = 'Llave'; const combat = createCombatActions(deps);
  const actions = createEntityActions({ ...deps, combat, dialogs: { prompt: () => value } });
  await actions.updateEntity('character','hero','inventory');
  assert.equal(deps.store.state.room.characters.hero.inventory, 'Espada\nLlave');
  value = 'Herido'; await actions.updateEntity('character','hero','condition');
  value = 'Pista'; await actions.updateEntity('character','hero','note');
  assert.equal(deps.store.state.room.characters.hero.conditions, 'Herido');
  assert.equal(deps.store.state.room.characters.hero.dmNotes, 'Pista');
  for (let i=0;i<15;i++) await actions.updateEntity('character','hero','damage');
  assert.equal(deps.store.state.room.characters.hero.hpCurrent,0);
  await actions.updateEntity('character','hero','heal');
  await actions.updateEntity('character','hero','manaDown');
  await actions.updateEntity('character','hero','turn');
  assert.equal(deps.store.state.room.characters.hero.hpCurrent,1);
  assert.equal(deps.store.state.room.characters.hero.manaCurrent,3);
  assert.equal(deps.store.state.room.combat.order[0],'hero');
});
test('manual initiative keeps collection order and wraps the current turn', async () => {
  const deps = await setup(); const room = deps.store.state.room;
  room.characters.hero = {}; room.enemies.foe = {}; room.npcs.friend = {}; room.objects.loot = {};
  const actions = createCombatActions(deps); await actions.startCombat();
  assert.deepEqual(room.combat.order,['hero','foe','friend']);
  for(let i=0;i<3;i++) await actions.nextTurn();
  assert.equal(room.combat.currentIndex,0);
});
test('dice persist the breakdown without resolving a narrative result', async () => {
  const deps = await setup(); await createCharacterActions(deps).saveCharacter(input(deps.store));
  const actions = createDiceActions({ ...deps, random: () => 17 });
  await actions.rollAttributeCheck('fuerza');
  const roll = Object.values(deps.store.state.room.rolls)[0];
  assert.equal(roll.total,20); assert.deepEqual(roll.breakdown.map(part=>part.value),[17,3]);
  assert.equal(roll.resolution,undefined);
  await actions.rollFreeDie(20); assert.equal(Object.values(deps.store.state.room.rolls).at(-1).total,17);
});
test('library entities, scene and map use existing room paths and data shape', async () => {
  const fake = createFakeFirebase(); const deps = await setup(fake.sdk);
  await createLibraryActions(deps).showLibraryCard('enemies',0); await Promise.resolve();
  const enemy = Object.values(deps.store.state.room.enemies)[0];
  assert.equal(enemy.name,'Rata de cripta'); assert.equal(enemy.hpCurrent,6); assert.equal(enemy.visible,true);
  await createSceneActions(deps).saveScene({title:'Puerta',description:'Runas',mode:'room'});
  await createMapActions(deps).writeMap({enabled:true,'positions/characters_hero':{x:3,y:4}}); await Promise.resolve();
  assert.equal(deps.store.state.room.scene.title,'Puerta');
  assert.deepEqual(deps.store.state.room.map.positions.characters_hero,{x:3,y:4});
  assert.ok(fake.writes.every(write=>write.path.startsWith('mesaArcana/rooms/TEST-001')));
  assert.equal(fake.writes.at(-1).path,'mesaArcana/rooms/TEST-001/map');
});
test('changing rooms detaches the old listener and keeps realtime between clients', async () => {
  const fake = createFakeFirebase(); const a = await setup(fake.sdk); const b = await setup(fake.sdk);
  await a.sync.set('scene/title','Compartida'); await Promise.resolve();
  assert.equal(b.store.state.room.scene.title,'Compartida');
  await a.sync.connectToRoom('OTHER-001','dm','DM','host',buildOfflineRoom()); await Promise.resolve();
  assert.equal(fake.listenerCount(),2);
  await b.sync.set('scene/title','Otra'); await Promise.resolve();
  assert.equal(a.store.state.roomCode,'OTHER-001'); assert.equal(a.store.state.room.scene.title,'Mesa local');
});
test('delete code cancellation does not remove any data; accepted deletion resets current session', async () => {
  const fake = createFakeFirebase(); const deps = await setup(fake.sdk);
  let code = 'incorrecto';
  const actions = createRoomActions({...deps, dialogs:{prompt:()=>code}});
  await actions.deleteRoom('TEST-001'); assert.ok(fake.data.mesaArcana.rooms['TEST-001']);
  code = String.fromCharCode(56,55,51,48,49); await actions.deleteRoom('TEST-001');
  assert.equal(fake.data.mesaArcana.rooms['TEST-001'],undefined);
  assert.equal(deps.store.state.roomCode,''); assert.equal(fake.listenerCount(),0);
});
