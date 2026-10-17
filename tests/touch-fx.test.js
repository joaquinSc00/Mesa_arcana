import test from 'node:test';
import assert from 'node:assert/strict';
import { bindPinchZoom } from '../ui/pinch-zoom.js';
import { createFantasyFxView } from '../ui/fantasy-fx.js';

test('pinch zoom anchors the midpoint, pans, clamps and blocks accidental destinations', () => {
  const events = {};
  let camera = { zoom: 1, x: 0, y: 0 };
  const element = {
    getBoundingClientRect: () => ({ left: 10, top: 20 }),
    addEventListener: (name, fn) => { events[name] = fn; },
    removeEventListener: (name) => { delete events[name]; }
  };
  const dispose = bindPinchZoom(element, { read: () => camera, write: next => { camera = next; }, min: 1, max: 4 });
  const touch = (points) => ({ touches: points.map(([clientX, clientY]) => ({ clientX, clientY })), preventDefault() {} });
  events.touchstart(touch([[60, 70], [160, 70]]));
  events.touchmove(touch([[20, 90], [220, 90]]));
  assert.deepEqual(camera, { zoom: 2, x: -90, y: -30 });
  events.touchmove(touch([[-890, 70], [1110, 70]]));
  assert.equal(camera.zoom, 4);
  events.touchend();
  let blocked = false;
  events.click({ preventDefault() { blocked = true; }, stopImmediatePropagation() {} });
  assert.equal(blocked, true);
  dispose();
  assert.deepEqual(events, {});
});

test('board FX uses the map renderer projection rather than calling room data', (t) => {
  const keys = ['document', 'devicePixelRatio', 'requestAnimationFrame', 'cancelAnimationFrame'];
  const previous = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  t.after(() => keys.forEach((key, i) => {
    if (previous[i]) Object.defineProperty(globalThis, key, previous[i]);
    else delete globalThis[key];
  }));
  let frames = 0;
  const context = { setTransform() {} };
  const make = () => ({
    classList: { toggle() {} }, setAttribute() {}, addEventListener() {},
    append(child) { child.parentElement = this; }, getContext: () => context
  });
  const stage = { ...make(), clientWidth: 800, clientHeight: 500 };
  globalThis.document = {
    body: make(), visibilityState: 'visible', createElement: make,
    getElementById: id => id === 'boardStage' ? stage : null
  };
  globalThis.devicePixelRatio = 1;
  globalThis.requestAnimationFrame = () => ++frames;
  globalThis.cancelAnimationFrame = () => {};
  const room = { map: { enabled: true }, characters: { hero: {} }, enemies: { rat: {} } };
  const projected = [];
  const view = createFantasyFxView({ store: { state: { room, roomCode: 'TEST', role: 'board', participantId: 'board' }, emit() {} }, actions: {},
    map: { projectToken(role, key) { projected.push([role, key]); return { x: 200, y: 150 }; } } });
  view.render();
  room.visualFx = { current: { id: 'fire-1', kind: 'fire', source: 'characters_hero', target: 'enemies_rat', createdAt: Date.now() } };
  assert.doesNotThrow(() => view.render());
  assert.deepEqual(projected, [['public', 'characters_hero'], ['public', 'enemies_rat']]);
  assert.equal(frames, 1);
  view.dispose();
});
