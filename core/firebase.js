import { normalizeRoomCode, buildOfflineRoom } from "./utils.js";
import { firebaseConfig, ROOT_PATH } from "../firebase-config.js?v=modules-1";

// This adapter owns SDK references. Feature modules only know relative room paths.
export function createFirebaseSync({ store, storage, sdk = globalThis.firebase, config = firebaseConfig, rootPath = ROOT_PATH }) {
  const { state, emit } = store;
  let database = null;
  let roomRef = null;
  let unsubscribe = null;
  function initDatabase() {
    if (!sdk || !config) return null;
    if (!sdk.apps.length) sdk.initializeApp(config);
    database ||= sdk.database();
    return database;
  }
  function disconnect() {
    unsubscribe?.(); unsubscribe = null; roomRef = null;
  }
  function publish(room, connected) {
    state.room = room; state.connected = connected; emit("room:changed", { room, connected });
  }
  async function connectToRoom(roomCode, role, participantName, participantId, initialRoom = null) {
    disconnect();
    Object.assign(state, { roomCode: normalizeRoomCode(roomCode), role, participantName,
      participantId: participantId || crypto.randomUUID(), hasShownRole: false });
    storage.writeLocal("mesaArcanaSession", { roomCode: state.roomCode, role, participantName, participantId: state.participantId });
    if (!sdk || !config) {
      publish(initialRoom || buildOfflineRoom(), false);
      emit("notice", "Modo local: falta Firebase.");
      return;
    }
    try {
      initDatabase();
      if (sdk.auth && !sdk.auth().currentUser) {
        try { await sdk.auth().signInAnonymously(); }
        catch (error) { console.warn("Firebase anonymous auth unavailable:", error?.message || error); }
      }
      const ref = database.ref(`${rootPath}/${state.roomCode}`);
      roomRef = ref;
      if (initialRoom) await ref.set(initialRoom);
      const onValue = (snapshot) => publish(snapshot.val() || buildOfflineRoom(), true);
      ref.on("value", onValue, () => {
        publish(state.room || buildOfflineRoom(), false);
        emit("notice", "No pude conectar con Firebase.");
      });
      unsubscribe = () => ref.off("value", onValue);
    } catch (error) {
      console.warn("Firebase sync disabled:", error?.message || error);
      disconnect();
      publish(initialRoom || buildOfflineRoom(), false);
      emit("notice", "Firebase no inicio. La mesa queda local.");
    }
  }
  async function listRooms() {
    const db = initDatabase();
    if (!db) throw new Error("Firebase no esta disponible.");
    return (await db.ref(rootPath).once("value")).val() || {};
  }
  async function removeRoom(code) { await initDatabase().ref(`${rootPath}/${code}`).remove(); }
  function assignPath(path, value) {
    const parts = path.split("/");
    let target = state.room;
    for (const part of parts.slice(0, -1)) target = target[part] ||= {};
    if (value === null) delete target[parts.at(-1)];
    else target[parts.at(-1)] = value;
  }
  function set(path, value) {
    if (roomRef) return roomRef.child(path).set(value);
    assignPath(path, value); emit("room:changed", { room: state.room, connected: false });
    return Promise.resolve();
  }
  function update(path, patch) {
    if (roomRef) return roomRef.child(path).update(patch);
    for (const [key, value] of Object.entries(patch)) assignPath(`${path}/${key}`, value);
    emit("room:changed", { room: state.room, connected: false });
    return Promise.resolve();
  }
  function remove(path) { return set(path, null); }
  return { connectToRoom, listRooms, removeRoom, set, update, remove, disconnect, isRemote: () => !!roomRef };
}
