import { system } from "../game-system.js?v=modules-1";
const { attributes, skills } = system;

export function getAttributeTotals(build) {
  const classDef = system.classes[build.classKey] || system.classes.guardian;
  const lineage = system.lineages[build.lineage] || system.lineages.human;

  return Object.fromEntries(attributes.map((attribute) => {
    const total = system.baseAttribute
      + (classDef.bonuses[attribute.key] || 0)
      + (lineage.bonuses[attribute.key] || 0)
      + (build.localBonus[attribute.key] || 0);
    return [attribute.key, total];
  }));
}

export function getSkillBonuses(build) {
  const granted = getGrantedSkills(build);
  return Object.fromEntries(skills.map((skill) => {
    const trained = build.skillTraining[skill.key] ? system.skillTrainingBonus : 0;
    const initial = granted.has(skill.key) ? system.skillTrainingBonus : 0;
    return [skill.key, Math.max(trained, initial)];
  }));
}

export function getGrantedSkills(build) {
  const lineage = system.lineages[build.lineage] || system.lineages.human;
  const classDef = system.classes[build.classKey] || system.classes.guardian;
  const background = system.backgrounds[build.background] || system.backgrounds.fallen_noble;
  return new Set([...(lineage.skills || []), ...(classDef.skills || []), ...(background.skills || [])]);
}

export function getTraitKeys(lineageKey, classKey, backgroundKey) {
  const lineage = system.lineages[lineageKey] || system.lineages.human;
  const classDef = system.classes[classKey] || system.classes.guardian;
  const background = system.backgrounds[backgroundKey] || system.backgrounds.fallen_noble;
  return [...new Set([...(lineage.traits || []), ...(classDef.traits || []), ...(background.traits || [])])];
}

export function getFreePoints(build) {
  const spent = Object.values(build.localBonus).reduce((sum, value) => sum + Number(value || 0), 0);
  return Math.max(0, system.freeAttributePoints - spent);
}

export function getFreeSkillPoints(build) {
  const spent = Object.values(build.skillTraining).reduce((sum, value) => sum + Number(value || 0), 0);
  const lineage = system.lineages[build.lineage] || system.lineages.human;
  return Math.max(0, system.freeSkillPoints + Number(lineage.extraSkillPoints || 0) - spent);
}

export function getActiveSkillCount(build) {
  const active = new Set([...getGrantedSkills(build)]);
  Object.entries(build.skillTraining).forEach(([key, value]) => {
    if (Number(value || 0) > 0) active.add(key);
  });
  return active.size;
}

export function calculateDerivedStats(build) {
  const totals = getAttributeTotals(build);
  const classDef = system.classes[build.classKey] || system.classes.guardian;
  return {
    hpMax: classDef.hpBase + totals.resistencia + Math.floor(totals.voluntad / 2),
    manaMax: classDef.manaBase + totals.afinidad + Math.floor(totals.voluntad / 2),
    defense: 10 + getAttributeModifier(totals.agilidad) + Math.floor(getAttributeModifier(totals.resistencia) / 2),
    initiative: getAttributeModifier(totals.agilidad) + Math.floor(getAttributeModifier(totals.percepcion) / 2)
  };
}

export function getAttributeModifier(value) {
  return Math.floor(Number(value || 0) / 2);
}

export function emptyAttributeMap() {
  return Object.fromEntries((system.attributes || []).map((attribute) => [attribute.key, 0]));
}

export function emptySkillMap() {
  return Object.fromEntries((system.skills || []).map((skill) => [skill.key, 0]));
}

export function getAttributeName(key) {
  return attributes.find((attribute) => attribute.key === key)?.name || key;
}

export function getSkillName(key) {
  return skills.find((skill) => skill.key === key)?.name || key;
}

export function getFocusFilter(key) {
  const filters = {
    social: { name: "Social", attributes: ["presencia", "intelecto"], skills: ["persuasion", "deception", "intimidation"] },
    sigilo: { name: "Sigilo", attributes: ["agilidad", "intelecto", "percepcion"], skills: ["stealth", "locks"] },
    combate: { name: "Combate", attributes: ["fuerza", "agilidad", "resistencia"], skills: ["melee", "archery", "defense"] },
    exploracion: { name: "Exploracion", attributes: ["percepcion", "intelecto", "agilidad"], skills: ["investigation", "fine_perception", "tracking", "survival"] },
    misterio: { name: "Arcano/Misterio", attributes: ["afinidad", "intelecto", "voluntad"], skills: ["arcana", "concentration"] },
    supervivencia: { name: "Resistencia/Supervivencia", attributes: ["resistencia", "voluntad", "percepcion"], skills: ["survival", "medicine", "defense"] }
  };
  return filters[key] || filters.social;
}
