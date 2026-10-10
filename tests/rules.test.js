import test from "node:test";
import assert from "node:assert/strict";
import * as rules from "../domain/character-rules.js";
const build = (extra = {}) => ({ lineage: "human", classKey: "guardian", background: "fallen_noble",
  localBonus: rules.emptyAttributeMap(), skillTraining: rules.emptySkillMap(), ...extra });

test("human guardian preserves original attributes and derived values", () => {
  const input = build();
  assert.deepEqual(rules.getAttributeTotals(input), { fuerza: 7, agilidad: 5, resistencia: 7, intelecto: 5, voluntad: 6, presencia: 5, percepcion: 5, afinidad: 5 });
  assert.deepEqual(rules.calculateDerivedStats(input), { hpMax: 28, manaMax: 10, defense: 13, initiative: 3 });
  assert.equal(rules.getFreePoints(input), 6);
  assert.equal(rules.getFreeSkillPoints(input), 3);
  assert.equal(rules.getActiveSkillCount(input), 3);
});
test("initial and trained skills do not double their bonus or active count", () => {
  const input = build({ skillTraining: { persuasion: 1, stealth: 1 } });
  assert.equal(rules.getSkillBonuses(input).persuasion, 2);
  assert.equal(rules.getSkillBonuses(input).stealth, 2);
  assert.equal(rules.getActiveSkillCount(input), 4);
  assert.equal(rules.getFreeSkillPoints(input), 1);
});
test("extra skill point is human only and trait names are deduplicated", () => {
  assert.equal(rules.getFreeSkillPoints(build({ lineage: "elf" })), 2);
  assert.deepEqual(rules.getTraitKeys("elf", "arcanist", "arcane_apprentice"), ["ancient_blood", "spell_focus"]);
  assert.equal(rules.getAttributeModifier(7), 3);
  assert.equal(rules.getFreePoints(build({ localBonus: { fuerza: 7 } })), 0);
});
