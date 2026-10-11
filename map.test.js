import test from "node:test";
import assert from "node:assert/strict";
import { createMap } from "./map.js";

function setup() {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, {
      clientWidth: 0,
      clientHeight: 0,
      classList: { toggle(name, enabled) { this[name] = enabled; } },
      replaceChildren(...children) { this.children = children; },
      append(child) { (this.children ||= []).push(child); }
    });
    return elements.get(id);
  };
  const window = {};
  const document = {
    activeElement: null,
    getElementById: element,
    createElement: () => ({ addEventListener() {} })
  };
  return { map: createMap({ window, document }), element };
}

test("a room without a map preserves the original public board", () => {
  const { map, element } = setup();
  map.sync({ characters: {} }, () => {});
  assert.equal(element("publicMapCanvas").hidden, true);
  assert.equal(element("boardStage").classList["has-map"], false);
});

test("reveals only new cells around characters", () => {
  const { map, element } = setup();
  const writes = [];
  const room = {
    characters: { hero: { name: "Ayla" } },
    enemies: { foe: { name: "Guardia" } },
    map: {
      enabled: true,
      positions: { characters_hero: { x: 4, y: 4 }, enemies_foe: { x: 8, y: 8 } },
      vision: { characters_hero: 1 },
      explored: { c_4_4: true }
    }
  };
  map.sync(room, (patch) => writes.push(patch));
  assert.equal(element("publicMapCanvas").hidden, false);
  assert.equal(element("boardStage").classList["has-map"], true);
  map.reveal();
  assert.deepEqual(Object.keys(writes[0]).sort(), ["explored/c_3_4", "explored/c_4_3", "explored/c_4_5", "explored/c_5_4"]);
  assert.equal(writes[0]["explored/c_8_8"], undefined);
});


test("manual fog never auto-reveals character surroundings", () => {
  const { map } = setup();
  const writes = [];
  map.sync({ characters: { hero: {name:"Ayla"} }, map: {fog:true, fogMode:"manual", revealed:{}} }, (patch) => writes.push(patch));
  map.reveal();
  assert.equal(writes.length, 0);
});

test("optional automatic vision still records explored cells", () => {
  const { map } = setup();
  const writes = [];
  map.sync({ characters: { hero: {name:"Ayla"} }, map: {fog:true, fogMode:"radius", vision:{characters_hero:0}} }, (patch) => writes.push(patch));
  map.reveal();
  assert.ok(writes.some(patch => patch["explored/c_2_2"]));
});
