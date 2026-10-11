import test from 'node:test';
import assert from 'node:assert/strict';
import { createFxActions, FX_TYPES } from '../features/fx.js';

test('only the DM may publish a visual effect', async () => {
  const writes=[];
  const store={state:{role:'player',room:{characters:{hero:{name:'Aldric'}}}}};
  const actions=createFxActions({store,sync:{set:(path,value)=>{writes.push({path,value});return Promise.resolve();}}});
  await assert.rejects(actions.perform({kind:'fire',source:'characters_hero'}),/DM/);
  assert.equal(writes.length,0);
  store.state.role='dm';
  await actions.perform({kind:'fire',source:'characters_hero',target:'characters_hero'});
  assert.equal(writes.length,1);
  assert.equal(writes[0].path,'visualFx/current');
  assert.equal(writes[0].value.kind,'fire');
  assert.equal(store.state.room.characters.hero.name,'Aldric');
});

test('visual effects reject unknown kinds and entities', async () => {
  const store={state:{role:'dm',room:{characters:{hero:{}}}}};
  const actions=createFxActions({store,sync:{set:()=>Promise.resolve()}});
  await assert.rejects(actions.perform({kind:'teleport'}),/desconocido/);
  await assert.rejects(actions.perform({kind:'fire',target:'enemies_missing'}),/desconocido/);
  assert.ok(['fire','slash','arcane','shield','heal','curse','impact'].every(kind=>FX_TYPES.includes(kind)));
});
