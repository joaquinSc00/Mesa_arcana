import assert from 'node:assert/strict';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { system } from '../game-system.js';
import * as rules from '../domain/character-rules.js';
import { firebaseConfig, ROOT_PATH } from '../firebase-config.js';
const dataContext=vm.createContext({window:{}});
for(const file of ['game-system.js','firebase-config.js'])vm.runInContext(execFileSync('git',['show',`0e7a2bf:${file}`],{encoding:'utf8'}),dataContext);
assert.equal(JSON.stringify(system),JSON.stringify(dataContext.window.MESA_ARCANA_SYSTEM));
assert.equal(JSON.stringify(firebaseConfig),JSON.stringify(dataContext.window.MESA_ARCANA_FIREBASE_CONFIG));
assert.equal(ROOT_PATH,dataContext.window.MESA_ARCANA_ROOT);
console.log('System data, Firebase configuration and root path unchanged.');
const elements = { lineageSelect: {}, classSelect: {}, backgroundSelect: {} };
const context = vm.createContext({ window: { MESA_ARCANA_SYSTEM: system }, document: { getElementById: id => elements[id] }, console });
const source = execFileSync('git', ['show', '0e7a2bf:app.js'], {encoding:'utf8'}).replace(/\ninit\(\);\s*$/, '');
vm.runInContext(source, context);
let cases = 0;
for (const lineage of Object.keys(system.lineages)) for (const classKey of Object.keys(system.classes)) for (const background of Object.keys(system.backgrounds)) {
  const build = { lineage, classKey, background, localBonus: {...rules.emptyAttributeMap(), fuerza:2, voluntad:1}, skillTraining: {...rules.emptySkillMap(), stealth:1} };
  elements.lineageSelect.value = lineage; elements.classSelect.value = classKey; elements.backgroundSelect.value = background;
  context.build = build;
  vm.runInContext('state.localBonus=build.localBonus;state.skillTraining=build.skillTraining;', context);
  for (const name of ['getAttributeTotals','getSkillBonuses','getFreePoints','getFreeSkillPoints','getActiveSkillCount','calculateDerivedStats']) {
    assert.equal(JSON.stringify(rules[name](build)), JSON.stringify(vm.runInContext(`${name}()`,context)), `${name}: ${lineage}/${classKey}/${background}`);
  }
  cases++;
}
console.log(`Parity: ${cases} character combinations, 6 calculations each, unchanged.`);
