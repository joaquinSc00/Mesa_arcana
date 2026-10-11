import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../core/state.js';
import { createStorage } from '../core/storage.js';
import { createFirebaseSync } from '../core/firebase.js';
import { buildOfflineRoom } from '../core/utils.js';
import { createCharacterActions } from '../features/characters.js';
import { memoryStorage } from './helpers/fake-firebase.js';

function input(store) {
  return { lineage:'human', classKey:'guardian', background:'fallen_noble', localBonus:store.state.localBonus,
    skillTraining:store.state.skillTraining, name:'Ayla', hpCurrent:'12', manaCurrent:'4', inventory:'Espada', notes:'Nota' };
}
async function setup() {
  const store = createStore(); const storage = createStorage(memoryStorage());
  const sync = createFirebaseSync({store,storage});
  await sync.connectToRoom('TEST-V12','player','Jugadora','hero',buildOfflineRoom());
  return {store,sync,actions:createCharacterActions({store,sync})};
}
test('finalized character keeps original build and can update only inventory and notes', async () => {
  const {store,actions} = await setup();
  await actions.finalizeCharacter(input(store));
  const before = structuredClone(store.state.room.characters.hero);
  await actions.updateOwnJournal('inventory','Espada\nLlave');
  await actions.updateOwnJournal('notes','Vi un portal.');
  const character = store.state.room.characters.hero;
  assert.equal(character.status,'ready');
  assert.equal(character.inventory,'Espada\nLlave');
  assert.equal(character.notes,'Vi un portal.');
  assert.deepEqual(character.attributes,before.attributes);
  assert.deepEqual(character.skills,before.skills);
  assert.deepEqual(character.derived,before.derived);
  await assert.rejects(actions.updateOwnJournal('attributes','99'));
});
test('player cannot update journal before finalization or another character', async () => {
  const {store,actions} = await setup();
  await actions.saveCharacter(input(store));
  await assert.rejects(actions.updateOwnJournal('notes','No autorizado'));
  await actions.finalizeCharacter(input(store));
  store.state.participantId = 'someoneElse';
  await assert.rejects(actions.updateOwnJournal('notes','No autorizado'));
});
test('player avatar follows original entity avatar format and cannot be written without a character', async () => {
  const {store,actions} = await setup();
  await assert.rejects(actions.setOwnAvatar('data:image/jpeg;base64,AAAA'));
  await actions.saveCharacter({...input(store),avatar:'data:image/jpeg;base64,AAAA'});
  assert.equal(store.state.room.characters.hero.avatar,'data:image/jpeg;base64,AAAA');
  await actions.setOwnAvatar('data:image/jpeg;base64,BBBB');
  assert.equal(store.state.room.characters.hero.avatar,'data:image/jpeg;base64,BBBB');
  await assert.rejects(actions.setOwnAvatar('https://untrusted/image.jpg'));
  await actions.setOwnAvatar(null);
  assert.equal(store.state.room.characters.hero.avatar,undefined);
});
