import { createApplication } from '../app.js';
import { createStorage } from '../core/storage.js';
import { memoryStorage } from './helpers/fake-firebase.js';
const role = new URLSearchParams(location.search).get('role');
const app = createApplication({ sdk: parent.fixture.sdk, storage: createStorage(memoryStorage()),
  dialogs: { prompt: () => parent.nextPrompt } });
await app.init();
await app.sync.connectToRoom('TEST-001', role, role === 'player' ? 'Tester' : 'Director', role === 'player' ? 'hero' : role);
await new Promise(resolve => requestAnimationFrame(resolve));
parent.clients[role] = { app, document, window };
